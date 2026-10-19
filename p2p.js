/*!
 * p2p.js 1.0.0 - drop-in WebRTC peer-to-peer toolkit. MIT licensed. No dependencies. One file.
 *
 *   const net = P2P.create({ ns: 'my-app' });
 *   const room = await net.host();            // -> "K7M2Q"      (share the code)
 *   await net.join('K7M2Q');                  // on the other device
 *   net.on('message', (from, data) => ...);   net.send('host', { hi: 1 });
 *
 * What it does for you
 *   - Host-authoritative star topology: one host, up to maxPeers clients. Host id is "host", clients are "p1".."pN".
 *   - Room-code signaling over public MQTT-over-WebSocket brokers (zero servers to run), BroadcastChannel (same-origin tabs),
 *     your own signaling (tiny interface), or serverless copy/paste codes.
 *   - Trickle ICE + "perfect negotiation" (glare-safe renegotiation), so audio/video can be added or removed at any time.
 *   - Two data channels per peer: reliable+ordered, and unreliable+unordered (latest-wins state, e.g. games).
 *   - Strings / JSON / ArrayBuffers of any size (automatic chunking + reassembly), send-side backpressure.
 *   - Heartbeat + RTT, ICE restart recovery on network change, signaling reconnects with backoff.
 *   - STUN/TURN config with validation, relay-only mode, TURN credentials fetched at runtime, connection diagnostics.
 */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.P2P = api;
})(typeof self !== 'undefined' ? self : typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
'use strict';

var VERSION = '1.0.0';
var TE = new TextEncoder(), TD = new TextDecoder();
var nowMs = function () { return Date.now(); };

/* ------------------------------------------------------------------ utils */
var ALNUM = 'abcdefghijklmnopqrstuvwxyz0123456789';
var ROOM_ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';           // no 0/O/1/I/L: easy to read out loud
function randStr(n, A) {
  A = A || ALNUM; var b = new Uint32Array(n), s = '', i;
  if (root.crypto && root.crypto.getRandomValues) root.crypto.getRandomValues(b); else for (i = 0; i < n; i++) b[i] = Math.random() * 4294967296;
  for (i = 0; i < n; i++) s += A[b[i] % A.length];
  return s;
}
function mkErr(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
var normRoom = function (c) { return String(c == null ? '' : c).toUpperCase().replace(/[^A-Z0-9]/g, ''); };

function Emitter() { this._l = {}; }
Emitter.prototype.on = function (ev, fn) { (this._l[ev] = this._l[ev] || []).push(fn); var self = this; return function () { self.off(ev, fn); }; };
Emitter.prototype.once = function (ev, fn) { var off = this.on(ev, function () { off(); fn.apply(null, arguments); }); return off; };
Emitter.prototype.off = function (ev, fn) { var l = this._l[ev]; if (!l) return this; if (!fn) delete this._l[ev]; else this._l[ev] = l.filter(function (f) { return f !== fn; }); return this; };
Emitter.prototype._emit = function (ev) {
  var l = this._l[ev]; if (!l) return; var a = Array.prototype.slice.call(arguments, 1);
  l.slice().forEach(function (f) { try { f.apply(null, a); } catch (e) { try { root.console && root.console.error('[p2p] "' + ev + '" handler threw', e); } catch (_) {} } });
};

/* base64url + (optionally deflate-compressed) session codes for serverless pairing */
function b64(u8) { var s = '', i; for (i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; var bin = atob(s), u = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function pipeBytes(u8, stream) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer()); }
async function encodeCode(d) {
  var raw = TE.encode(JSON.stringify([d.type === 'offer' ? 'o' : 'a', d.sdp]));
  if (typeof CompressionStream === 'function') { try { return 'z' + b64(await pipeBytes(raw, new CompressionStream('deflate-raw'))); } catch (e) {} }
  return 'r' + b64(raw);
}
async function decodeCode(code) {
  code = String(code || '').replace(/\s+/g, ''); var kind = code.charAt(0), u8;
  try {
    u8 = unb64(code.slice(1));
    if (kind === 'z') { if (typeof DecompressionStream !== 'function') throw mkErr('unsupported', 'This browser cannot read compressed codes.'); u8 = await pipeBytes(u8, new DecompressionStream('deflate-raw')); }
    else if (kind !== 'r') throw 0;
    var a = JSON.parse(TD.decode(u8));
    if (!Array.isArray(a) || typeof a[1] !== 'string' || (a[0] !== 'o' && a[0] !== 'a')) throw 0;
    return { type: a[0] === 'o' ? 'offer' : 'answer', sdp: a[1] };
  } catch (e) { throw e && e.code === 'unsupported' ? e : mkErr('bad-code', 'That is not a valid connection code.'); }
}

/* ------------------------------------------------------------------ timeouts (ms), override with create({timeouts}) */
var DEFAULT_T = {
  gather: 5000, srflxGrace: 2000, relayGrace: 300,   // non-trickle (copy/paste) gathering limits
  join: 25000, host: 35000, manual: 180000,           // handshake budgets: client after first contact / host per joiner / copy-paste
  signalRetry: 2000, joinTries: 7,                    // "join" is re-sent every 2 s, 7 times, then "room not found"
  welcome: 3000, ctlFallback: 1500,
  ping: 2500, dead: 12000,                            // heartbeat; silence this long starts recovery
  disconnectGrace: 2500, restartEvery: 4000, recover: 15000, // ICE "disconnected" grace, restart cadence, give up after
  brokerConnect: 6000
};

/* ------------------------------------------------------------------ ICE configuration */
var DEFAULT_STUN = ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'];
function okUrl(u) { return typeof u === 'string' && /^(stun|stuns|turn|turns):[^\s]+$/i.test(u) && u.length < 250; }
/* accepts 'stun:host:port' strings, {urls, username, credential}, or the short form {host, username, credential}
   which expands to turn udp 3478, turn tcp 3478 and turns tcp 443 (the combination that gets through the most firewalls) */
function cleanIceServers(list, max) {
  var out = []; if (!Array.isArray(list)) return out;
  list.slice(0, max || 8).forEach(function (e) {
    if (typeof e === 'string') e = { urls: e };
    if (!e || typeof e !== 'object') return; var urls = [];
    if (typeof e.host === 'string' && /^[\w.\-]{1,120}(:\d{1,5})?$/.test(e.host)) {
      var h = e.host.replace(/:\d+$/, ''); urls = ['turn:' + h + ':3478?transport=udp', 'turn:' + h + ':3478?transport=tcp', 'turns:' + h + ':443?transport=tcp'];
    } else urls = (Array.isArray(e.urls) ? e.urls : [e.urls]).filter(okUrl);
    if (!urls.length) return;
    var o = { urls: urls };
    if (typeof e.username === 'string') o.username = e.username.slice(0, 300);
    if (typeof e.credential === 'string') o.credential = e.credential.slice(0, 500);
    out.push(o);
  });
  return out;
}
/* ice: { stun: [urls] | false, turn: [..], iceServers: [..] (raw extra), relayOnly: bool, candidatePool: 0..10 } */
function buildIceConfig(o, extra) {
  o = o || {}; var servers = [];
  if (o.stun !== false) { var s = Array.isArray(o.stun) ? o.stun.filter(okUrl) : DEFAULT_STUN; if (s.length) servers.push({ urls: s.slice() }); }
  [].push.apply(servers, cleanIceServers(o.turn, 6)); [].push.apply(servers, cleanIceServers(o.iceServers, 8)); [].push.apply(servers, cleanIceServers(extra, 8));
  var cfg = { iceServers: servers, bundlePolicy: 'max-bundle', iceCandidatePoolSize: Math.max(0, Math.min(10, o.candidatePool | 0)) };
  if (o.relayOnly) cfg.iceTransportPolicy = 'relay';
  return cfg;
}
var candType = function (c) { return c ? (c.type || ((/ typ (\w+)/.exec(c.candidate || '') || [])[1]) || '') : ''; };

/* Non-trickle gathering (copy/paste codes, diagnostics). Resolves when gathering completes, shortly after the first relay candidate,
   a grace period after the first server-reflexive one (so one dead TURN server cannot stall everybody), or at the hard limit. */
function gathered(pc, hardMs, srflxMs, relayMs) {
  var g = pc.__gather = { why: '', host: 0, srflx: 0, relay: 0, ms: 0 }, t0 = nowMs();
  return new Promise(function (res) {
    if (pc.iceGatheringState === 'complete') { g.why = 'complete'; return res(g); }
    var done = false, soft = 0, hard = 0;
    function fin(why) { if (done) return; done = true; clearTimeout(hard); clearTimeout(soft); pc.removeEventListener('icegatheringstatechange', chk); pc.removeEventListener('icecandidate', onc); g.why = why; g.ms = nowMs() - t0; res(g); }
    function chk() { if (pc.iceGatheringState === 'complete') fin('complete'); }
    function see(ty) {
      if (g[ty] == null) return; g[ty]++;
      if (ty === 'relay' && g.relay === 1) { clearTimeout(soft); soft = setTimeout(function () { fin('relay'); }, relayMs); }
      else if (ty === 'srflx' && g.srflx === 1 && !g.relay) { clearTimeout(soft); soft = setTimeout(function () { fin('srflx'); }, srflxMs); }
    }
    function onc(e) { var c = e.candidate; if (c && c.candidate) see(candType(c)); }
    hard = setTimeout(function () { fin('timeout'); }, hardMs);
    pc.addEventListener('icegatheringstatechange', chk); pc.addEventListener('icecandidate', onc);
    try { var sdp = (pc.localDescription && pc.localDescription.sdp) || '', m, re = /^a=candidate:.* typ (\w+)/gm; while ((m = re.exec(sdp))) see(m[1]); } catch (e) {}
  });
}
/* Diagnostic: what can this device/network reach? {host, srflx, relay}. relay>0 proves your TURN works; srflx>0 proves STUN works. */
async function probeIce(ice, ms) {
  var pc = new root.RTCPeerConnection(buildIceConfig(ice)); pc.createDataChannel('probe');
  try { await pc.setLocalDescription(await pc.createOffer()); var g = await gathered(pc, ms || 6000, ms || 6000, ms || 6000); return { host: g.host, srflx: g.srflx, relay: g.relay, ms: g.ms, why: g.why, stunWorks: g.srflx > 0, turnWorks: g.relay > 0 }; }
  finally { try { pc.close(); } catch (e) {} }
}

/* ------------------------------------------------------------------ MQTT 3.1.1 (just CONNECT / SUBSCRIBE / PUBLISH QoS0 / PING)
   Public brokers are used purely as a free pub/sub pipe for the handshake. Nothing but SDP/ICE passes through them. */
function varint(n) { var b = []; do { var d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; b.push(d); } while (n > 0); return b; }
function mstr(s) { var u = TE.encode(s), o = new Uint8Array(2 + u.length); o[0] = u.length >> 8; o[1] = u.length & 255; o.set(u, 2); return o; }
function cat(parts) { var n = 0, i = 0; parts.forEach(function (p) { n += p.length; }); var o = new Uint8Array(n); parts.forEach(function (p) { o.set(p, i); i += p.length; }); return o; }
function packet(first, body) { return cat([Uint8Array.from([first].concat(varint(body.length))), body]); }
var mqtt = {
  connect: function (id, keepalive) { return packet(0x10, cat([Uint8Array.from([0, 4, 77, 81, 84, 84, 4, 2, keepalive >> 8, keepalive & 255]), mstr(id)])); },
  subscribe: function (id, topic) { return packet(0x82, cat([Uint8Array.from([id >> 8, id & 255]), mstr(topic), Uint8Array.from([0])])); },
  publish: function (topic, payload) { return packet(0x30, cat([mstr(topic), typeof payload === 'string' ? TE.encode(payload) : payload])); },
  ping: function () { return Uint8Array.from([0xC0, 0]); },
  Parser: function (onpacket) {
    var buf = new Uint8Array(0);
    this.feed = function (chunk) {
      buf = buf.length ? cat([buf, chunk]) : chunk;
      for (;;) {
        var b = buf; if (b.length < 2) return;
        var rem = 0, mul = 1, i = 1, ok = false;
        while (i < b.length && i <= 4) { var d = b[i++]; rem += (d & 127) * mul; mul *= 128; if (!(d & 128)) { ok = true; break; } }
        if (!ok) { if (i > 4) throw new Error('bad MQTT length'); return; }
        if (b.length < i + rem) return;
        var body = b.subarray(i, i + rem), t = b[0] >> 4, fl = b[0] & 15; buf = b.subarray(i + rem);
        if (t === 2) onpacket({ type: 'connack', code: body[1] });
        else if (t === 9) onpacket({ type: 'suback' });
        else if (t === 13) onpacket({ type: 'pingresp' });
        else if (t === 3) {
          var tl = (body[0] << 8) | body[1], qos = (fl >> 1) & 3, off = 2 + tl + (qos ? 2 : 0), payload = body.slice(off);
          onpacket({ type: 'publish', topic: TD.decode(body.subarray(2, 2 + tl)), payload: payload, text: TD.decode(payload) });
        } else onpacket({ type: 'other', t: t });
      }
    };
  }
};
var DEFAULT_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://mqtt.eclipseprojects.io:443/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];

/* one broker connection; reconnects forever (with backoff) until closed */
function MqttConn(url, hub) { this.url = url; this.hub = hub; this.ws = null; this.ready = false; this.dead = false; this.tries = 0; this.first = true; this.onfirst = null; this.subs = []; this.pid = 1; this.last = 0; this.pingT = 0; this.retryT = 0; this.cid = 'p2p' + randStr(10); }
MqttConn.prototype.start = function () { this._open(); };
MqttConn.prototype._open = function () {
  var self = this; if (self.dead) return;
  var ws; try { ws = self.ws = new WebSocket(self.url, 'mqtt'); } catch (e) { return self._closed(); }
  ws.binaryType = 'arraybuffer'; var acked = false;
  var guard = setTimeout(function () { if (!acked) try { ws.close(); } catch (e) {} }, self.hub.T.brokerConnect);
  var parser = new mqtt.Parser(function (p) {
    if (p.type === 'connack') {
      if (p.code !== 0) { try { ws.close(); } catch (e) {} return; }
      acked = true; clearTimeout(guard); self.ready = true; self.tries = 0; self.last = nowMs();
      self.subs.forEach(function (t) { self.raw(mqtt.subscribe(self.pid++, t)); });
      clearInterval(self.pingT); self.pingT = setInterval(function () { if (nowMs() - self.last > 50000) { try { ws.close(); } catch (e) {} } else self.raw(mqtt.ping()); }, 20000);
      if (self.first) { self.first = false; if (self.onfirst) self.onfirst(true); }
    } else if (p.type === 'publish') self.hub._deliver(p.text);
  });
  ws.onopen = function () { ws.send(mqtt.connect(self.cid, 30)); };
  ws.onmessage = function (e) { self.last = nowMs(); try { parser.feed(new Uint8Array(e.data)); } catch (er) { try { ws.close(); } catch (_) {} } };
  ws.onerror = function () {};
  ws.onclose = function () { clearTimeout(guard); clearInterval(self.pingT); self.ready = false; if (self.ws === ws) self._closed(); };
};
MqttConn.prototype._closed = function () {
  var self = this;
  if (self.first) { self.first = false; if (self.onfirst) self.onfirst(false); }
  if (self.dead) return;
  var d = Math.min(15000, 500 * Math.pow(2, self.tries++)) * (0.7 + Math.random() * 0.6);
  self.retryT = setTimeout(function () { self._open(); }, d);
};
MqttConn.prototype.raw = function (u8) { if (this.ws && this.ws.readyState === 1) try { this.ws.send(u8); } catch (e) {} };
MqttConn.prototype.close = function () { this.dead = true; this.ready = false; clearInterval(this.pingT); clearTimeout(this.retryT); try { this.ws && this.ws.close(); } catch (e) {} };

/* ------------------------------------------------------------------ signaling hubs
   A hub is: connect(topics) -> Promise (resolves when usable), publish(topic, obj), onmsg = (obj, topic) => {}, close().
   Pass your own via create({ signaling: (net) => hub }). */
function MqttHub(urls, T) { this.urls = urls; this.T = T; this.conns = []; this.seen = new Set(); this.onmsg = null; this.closed = false; }
MqttHub.prototype.connect = function (topics) {
  var self = this;
  return new Promise(function (resolve, reject) {
    var pending = self.urls.length, ok = false;
    if (!pending) return reject(new Error('no signaling servers configured'));
    self.urls.forEach(function (url) {
      var c = new MqttConn(url, self); c.subs = topics.slice(); self.conns.push(c);
      c.onfirst = function (good) {
        if (good) { if (!ok) { ok = true; resolve(); } }
        else if (--pending === 0 && !ok) { self.close(); reject(new Error('Could not reach any signaling server')); }
      };
      c.start();
    });
  });
};
MqttHub.prototype._deliver = function (text) {
  var m; try { m = JSON.parse(text); } catch (e) { return; } if (!m || typeof m !== 'object') return;
  if (m.u) { if (this.seen.has(m.u)) return; this.seen.add(m.u); if (this.seen.size > 1000) this.seen.delete(this.seen.values().next().value); }
  if (this.onmsg) this.onmsg(m);
};
MqttHub.prototype.publish = function (topic, obj) {
  obj.u = obj.u || randStr(10); var t = JSON.stringify(obj), n = 0;
  this.conns.forEach(function (c) { if (c.ready) { c.raw(mqtt.publish(topic, t)); n++; } }); return n;
};
MqttHub.prototype.close = function () { this.closed = true; this.conns.forEach(function (c) { c.close(); }); this.conns = []; };

/* same-origin tabs/windows, no network at all (handy for demos and tests) */
function BroadcastHub(name) { this.name = name; this.bc = null; this.topics = new Set(); this.onmsg = null; }
BroadcastHub.prototype.connect = function (topics) {
  var self = this; topics.forEach(function (t) { self.topics.add(t); });
  self.bc = new root.BroadcastChannel('p2p:' + self.name);
  self.bc.onmessage = function (e) { var d = e.data; if (d && self.topics.has(d.topic) && self.onmsg) self.onmsg(d.obj, d.topic); };
  return Promise.resolve();
};
BroadcastHub.prototype.publish = function (topic, obj) { obj.u = obj.u || randStr(10); try { this.bc.postMessage({ topic: topic, obj: obj }); return 1; } catch (e) { return 0; } };
BroadcastHub.prototype.close = function () { try { this.bc && this.bc.close(); } catch (e) {} };

/* ------------------------------------------------------------------ wire format
   text frames:   'u' + JSON            a user message
                  'i' + JSON            internal control (ping/pong/sig/welcome/bye)
                  'k' + id.idx.total.s  a chunk of a large user message
   binary frames: [0, ...bytes]         a user ArrayBuffer
                  [1, id, idx, total, ...bytes]  a chunk of a large user ArrayBuffer (u32 big-endian header fields) */
var HIGH = 1 << 20, LOW = 1 << 18, UNREL_MAX = 64 * 1024;
function encodeUser(data) {
  if (data instanceof ArrayBuffer) return { bin: true, u8: new Uint8Array(data) };
  if (ArrayBuffer.isView(data)) return { bin: true, u8: new Uint8Array(data.buffer, data.byteOffset, data.byteLength) };
  var s = JSON.stringify(data); return { bin: false, text: s === undefined ? 'null' : s };
}
function makeFrames(enc, cs, id) {
  var i, n;
  if (enc.bin) {
    var u8 = enc.u8; n = u8.length;
    if (n + 1 <= cs) { var f = new Uint8Array(n + 1); f.set(u8, 1); return [f]; }
    var per = cs - 13, total = Math.ceil(n / per), out = [];
    for (i = 0; i < total; i++) {
      var part = u8.subarray(i * per, Math.min(n, (i + 1) * per)), fr = new Uint8Array(13 + part.length), dv = new DataView(fr.buffer);
      fr[0] = 1; dv.setUint32(1, id >>> 0); dv.setUint32(5, i); dv.setUint32(9, total); fr.set(part, 13); out.push(fr);
    }
    return out;
  }
  var s = enc.text;
  if (s.length * 3 + 1 <= cs || TE.encode(s).length + 1 <= cs) return ['u' + s];
  var step = Math.max(64, Math.floor((cs - 32) / 3)), parts = []; i = 0;
  while (i < s.length) {
    var j = Math.min(s.length, i + step);
    if (j < s.length) { var c = s.charCodeAt(j - 1); if (c >= 0xD800 && c <= 0xDBFF) j--; }   // never split a surrogate pair
    parts.push(s.slice(i, j)); i = j;
  }
  return parts.map(function (p, k) { return 'k' + (id >>> 0).toString(36) + '.' + k + '.' + parts.length + '.' + p; });
}
var sizeOf = function (f) { return typeof f === 'string' ? f.length : f.byteLength; };

/* ------------------------------------------------------------------ Peer: one RTCPeerConnection to one remote */
function Peer(net, id, o) {
  this.net = net; this.id = id; this.uid = o.uid || null; this.polite = !!o.polite; this.hostSide = !!o.hostSide; this.route = o.route || null;
  this.sigEnabled = !!o.sigEnabled; this.open = false; this.closed = false; this.ready = false; this.recovering = false;
  this.rtt = -1; this.lastRx = nowMs(); this.t0 = nowMs();
  this.outbox = []; this.seenSig = new Set(); this.queue = []; this.queued = 0; this.asm = new Map(); this.senders = new Map();
  this.makingOffer = false; this.ignoreOffer = false; this.settingAnswer = false; this._chain = Promise.resolve(); this._pendingIce = [];
  this._needed = false; this._streamsAdded = false; this._pn = 0;
  var self = this, pc = this.pc = new root.RTCPeerConnection(net._iceConfig());
  pc.onnegotiationneeded = function () { self._negotiate(false); };
  pc.onicecandidate = function (e) { if (e.candidate) self._sig({ c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate }); };
  pc.onconnectionstatechange = pc.oniceconnectionstatechange = function () { self._state(); };
  pc.ontrack = function (e) { net._emit('track', self.id, e.track, (e.streams && e.streams[0]) || null, e); };
  /* negotiated channels: both sides create the same two channels with fixed ids, so there is no ondatachannel race
     and the very first offer already contains the application m-line */
  this.ctl = this._chan(pc.createDataChannel('ctl', { negotiated: true, id: 0, ordered: true }));
  this.st = this._chan(pc.createDataChannel('st', { negotiated: true, id: 1, ordered: false, maxRetransmits: 0 }));
  if (this.hostSide) { this._streamsAdded = true; net._attachStreams(this); }
}
Peer.prototype._chan = function (ch) {
  var self = this; ch.binaryType = 'arraybuffer'; ch.bufferedAmountLowThreshold = LOW;
  ch.onopen = function () { self._check(); };
  ch.onclose = function () { if (ch === self.ctl) self.drop('channel closed'); };
  ch.onbufferedamountlow = function () { self._flush(); };
  ch.onmessage = function (e) { self._rx(ch, e.data); };
  return ch;
};
Peer.prototype._dbg = function () { this.net._dbg.apply(this.net, ['[' + this.id + ']'].concat([].slice.call(arguments))); };
Peer.prototype.startHandshakeTimer = function (ms) {
  var self = this; clearTimeout(this._hs);
  this._hs = setTimeout(function () { if (!self.open && !self.closed) self.drop('handshake timeout'); }, ms);
};

/* ---- signaling / perfect negotiation ---- */
Peer.prototype._sig = function (msg) {
  msg.i = msg.i || randStr(6);
  var viaCtl = this.ctl && this.ctl.readyState === 'open' && this.open;
  if (viaCtl) this._raw(this.ctl, 'i' + JSON.stringify({ t: 'sig', m: msg }));
  if (!viaCtl || this.recovering) { if (!this.open) this.outbox.push(msg); if (this.route) this.route(msg); }   // hub path: before open, and as a backup while recovering
};
Peer.prototype.replay = function () { var self = this; if (this.route) this.outbox.forEach(function (m) { self.route(m); }); };
Peer.prototype._negotiate = async function (iceRestart) {
  var pc = this.pc; if (this.closed) return;
  if (!this.sigEnabled || (this.polite && !pc.remoteDescription)) { this._needed = true; return; }   // the polite side waits for the first offer
  this._needed = false;
  try {
    this.makingOffer = true;
    var offer = await pc.createOffer(iceRestart ? { iceRestart: true } : undefined);
    if (pc.signalingState !== 'stable' || this.closed) return;
    await pc.setLocalDescription(offer);
    this._sig({ d: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
  } catch (e) { this._dbg('negotiate failed', e && e.message); }
  finally { this.makingOffer = false; }
};
Peer.prototype._recvSig = function (m) {
  var self = this; if (this.closed || !m) return;
  if (m.i) { if (this.seenSig.has(m.i)) return; this.seenSig.add(m.i); if (this.seenSig.size > 300) this.seenSig.delete(this.seenSig.values().next().value); }
  this._chain = this._chain.then(function () { return self._handleSig(m); }).catch(function (e) { self._dbg('signal error', e && e.message); });
};
Peer.prototype._handleSig = async function (m) {
  var pc = this.pc; if (this.closed) return;
  if (m.d) {
    var d = m.d, readyForOffer = !this.makingOffer && (pc.signalingState === 'stable' || this.settingAnswer);
    var collision = d.type === 'offer' && !readyForOffer;
    this.ignoreOffer = !this.polite && collision;       // impolite side wins glare; polite side rolls back implicitly
    if (this.ignoreOffer) return;
    this.settingAnswer = d.type === 'answer';
    try { await pc.setRemoteDescription(d); } finally { this.settingAnswer = false; }
    await this._flushIce();
    if (d.type === 'offer') {
      if (!this._streamsAdded) { this._streamsAdded = true; this.net._attachStreams(this); }
      await pc.setLocalDescription(await pc.createAnswer());
      this._sig({ d: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
    }
    if (this._needed && this.sigEnabled) this._negotiate(false);
  } else if (m.c) {
    if (!pc.remoteDescription) { this._pendingIce.push(m.c); return; }
    try { await pc.addIceCandidate(m.c); } catch (e) { if (!this.ignoreOffer) this._dbg('addIceCandidate', e && e.message); }
  }
};
Peer.prototype._flushIce = async function () {
  var list = this._pendingIce; this._pendingIce = [];
  for (var i = 0; i < list.length; i++) { try { await this.pc.addIceCandidate(list[i]); } catch (e) { if (!this.ignoreOffer) this._dbg('addIceCandidate', e && e.message); } }
};

/* ---- channel lifecycle ---- */
Peer.prototype._check = function () {
  var self = this; if (this.ready || this.closed) return;
  var c = this.ctl.readyState === 'open', s = this.st.readyState === 'open';
  if (c && s) this._ready();
  else if (c && !this._fb) this._fb = setTimeout(function () { if (self.ctl.readyState === 'open') self._ready(); }, this.net.T.ctlFallback);   // st never opened: carry on with ctl only
};
Peer.prototype._ready = function () {
  var self = this; if (this.ready || this.closed) return; this.ready = true; clearTimeout(this._fb); this.lastRx = nowMs();
  this._hb = setInterval(function () { self._beat(); }, this.net.T.ping);
  if (this.hostSide) { this._welcome(); this._announce(); }
  else { this._raw(this.ctl, 'i{"t":"hi"}'); this._wt = setTimeout(function () { self._announce(); }, this.net.T.welcome); }
};
Peer.prototype._welcome = function () { this._raw(this.ctl, 'i' + JSON.stringify({ t: 'welcome', id: this.id, host: 'host', max: this.net.maxPeers })); };
Peer.prototype._announce = function () {
  if (this.open || this.closed) return; this.open = true; this.sigEnabled = true; this.outbox = [];
  clearTimeout(this._hs); clearTimeout(this._wt);
  if (this._needed) this._negotiate(false);
  this.net._peerOpen(this);
};
Peer.prototype._beat = function () {
  if (this.closed || !this.ready) return;
  this._raw(this.ctl, 'i' + JSON.stringify({ t: 'ping', n: ++this._pn, ts: nowMs() }));
  if (nowMs() - this.lastRx > this.net.T.dead) this._trouble('timeout');
};

/* ---- connection health / recovery (ICE restart) ---- */
Peer.prototype._state = function () {
  var self = this, pc = this.pc; if (this.closed) return;
  var s = pc.connectionState || { checking: 'connecting', connected: 'connected', completed: 'connected', disconnected: 'disconnected', failed: 'failed', closed: 'closed' }[pc.iceConnectionState];
  if (s === 'connected') clearTimeout(this._dt);   // recovery completes when data flows again (see _rx), not merely when ICE says connected
  else if (s === 'disconnected') { clearTimeout(this._dt); this._dt = setTimeout(function () { var x = pc.connectionState || pc.iceConnectionState; if (x === 'disconnected') self._trouble('disconnected'); }, this.net.T.disconnectGrace); }
  else if (s === 'failed') this._trouble('failed');
  else if (s === 'closed') this.drop('closed');
};
Peer.prototype._trouble = function (why) {
  var self = this; if (this.closed || this.recovering) return;
  this.recovering = true; this.net._emit('unstable', this.id, why); this.net._status('Connection to ' + this.id + ' unstable (' + why + '), recovering...');
  this.restartIce();
  this._rti = setInterval(function () { self.restartIce(); }, this.net.T.restartEvery);
  this._rt = setTimeout(function () { if (self.recovering) self.drop('connection lost'); }, this.net.T.recover);
};
Peer.prototype._recovered = function () {
  if (!this.recovering) return; this.recovering = false; clearInterval(this._rti); clearTimeout(this._rt); this.net._emit('recovered', this.id);
};
Peer.prototype.restartIce = function () {
  if (this.closed || !this.sigEnabled) return;
  try { if (typeof this.pc.restartIce === 'function') this.pc.restartIce(); /* fires negotiationneeded */ else this._negotiate(true); } catch (e) { this._dbg('restartIce', e && e.message); }
};

/* ---- sending ---- */
Peer.prototype._raw = function (ch, f) { if (ch && ch.readyState === 'open') { try { ch.send(f); return true; } catch (e) {} } return false; };
Peer.prototype._cs = function () {
  var m = (this.pc.sctp && this.pc.sctp.maxMessageSize) || 65536; if (!isFinite(m) || m <= 0) m = 65536;
  return Math.max(1024, Math.min(m, 262144, this.net.chunkSize));
};
Peer.prototype.send = function (data, o) { return this.sendEncoded(encodeUser(data), o); };
Peer.prototype.sendEncoded = function (enc, o) {
  if (!this.open || this.closed) return false;
  var cs = this._cs(), frames = makeFrames(enc, cs, this.net._mid++);
  if (o && o.reliable === false && this.st && this.st.readyState === 'open' && frames.length === 1) {
    if (this.st.bufferedAmount > UNREL_MAX) return false;      // latest-wins: drop instead of queueing stale state
    return this._raw(this.st, frames[0]);
  }
  var bytes = 0, i; for (i = 0; i < frames.length; i++) bytes += sizeOf(frames[i]);
  if (this.queued + bytes > this.net.maxQueue) return false;
  for (i = 0; i < frames.length; i++) this.queue.push(frames[i]); this.queued += bytes;
  this._flush(); return true;
};
Peer.prototype._flush = function () {
  var ch = this.ctl; if (!ch || ch.readyState !== 'open') return;
  while (this.queue.length && ch.bufferedAmount < HIGH) {
    var f = this.queue.shift(); this.queued -= sizeOf(f);
    try { ch.send(f); } catch (e) { this._dbg('send failed', e && e.message); break; }
  }
};
Peer.prototype.buffered = function () { return (this.ctl ? this.ctl.bufferedAmount : 0) + this.queued; };

/* ---- receiving ---- */
Peer.prototype._rx = function (ch, data) {
  this.lastRx = nowMs(); if (this.closed) return;
  if (this.recovering) { var cs = this.pc.connectionState || this.pc.iceConnectionState; if (cs === 'connected' || cs === 'completed') this._recovered(); }
  try {
    if (typeof data === 'string') {
      var k = data.charCodeAt(0);
      if (k === 117) return this._deliver(JSON.parse(data.slice(1)), data.length, ch);       // 'u'
      if (k === 105) return this._internal(JSON.parse(data.slice(1)));                        // 'i'
      if (k === 107) return this._textChunk(data, ch);                                        // 'k'
      return;
    }
    var u8 = new Uint8Array(data); if (!u8.length) return;
    if (u8[0] === 0) return this._deliver(data.slice(1), u8.length - 1, ch);
    if (u8[0] === 1 && u8.length >= 13) { var dv = new DataView(data); return this._chunk(true, dv.getUint32(1).toString(36),dv.getUint32(5), dv.getUint32(9), u8.subarray(13), ch); }
  } catch (e) { this._dbg('bad frame', e && e.message); }
};
Peer.prototype._deliver = function (payload, size, ch) { this.net._emit('message', this.id, payload, { reliable: ch === this.ctl, size: size, peer: this }); };
Peer.prototype._textChunk = function (s, ch) {
  var a = s.indexOf('.', 1), b = s.indexOf('.', a + 1), c = s.indexOf('.', b + 1); if (a < 0 || b < 0 || c < 0) return;
  this._chunk(false, s.slice(1, a), +s.slice(a + 1, b), +s.slice(b + 1, c), s.slice(c + 1), ch);
};
Peer.prototype._chunk = function (bin, id, idx, total, part, ch) {
  var net = this.net; if (!(total > 0) || idx >= total || total > 1e6) return;
  var a = this.asm.get(id);
  if (!a) { if (this.asm.size >= 8) this.asm.delete(this.asm.keys().next().value); /* evict the oldest partial so stale ones can never block new messages */ a = { bin: bin, total: total, got: 0, parts: new Array(total), bytes: 0 }; this.asm.set(id, a); }
  if (a.parts[idx] === undefined) {
    a.parts[idx] = part; a.got++; a.bytes += bin ? part.length : part.length * 3;
    if (a.bytes > net.maxMessage * (bin ? 1 : 3)) { this.asm.delete(id); return; }
  }
  if (a.got < a.total) return;
  this.asm.delete(id);
  if (a.bin) {
    var out = new Uint8Array(a.bytes), o = 0; a.parts.forEach(function (p) { out.set(p, o); o += p.length; });
    this._deliver(out.buffer, out.length, ch);
  } else { var text = a.parts.join(''); this._deliver(JSON.parse(text), text.length, ch); }
};
Peer.prototype._internal = function (m) {
  if (!m) return;
  if (m.t === 'ping') this._raw(this.ctl, 'i' + JSON.stringify({ t: 'pong', n: m.n, ts: m.ts }));
  else if (m.t === 'pong') { this.rtt = Math.max(0, nowMs() - m.ts); this.net._emit('rtt', this.id, this.rtt); }
  else if (m.t === 'sig') this._recvSig(m.m);
  else if (m.t === 'hi') { if (this.hostSide) { this._welcome(); this._announce(); } }
  else if (m.t === 'welcome') { if (!this.hostSide) { this.net.id = m.id; if (m.max) this.net.maxPeers = m.max; this._announce(); } }
  else if (m.t === 'bye') this.drop('remote:' + (m.why || 'left'));
};

/* ---- media ---- */
Peer.prototype.addStream = function (stream) {
  var self = this; stream.getTracks().forEach(function (t) { if (!self.senders.has(t)) { try { self.senders.set(t, self.pc.addTrack(t, stream)); } catch (e) { self._dbg('addTrack', e && e.message); } } });
};
Peer.prototype.removeStream = function (stream) {
  var self = this; stream.getTracks().forEach(function (t) { var s = self.senders.get(t); if (s) { try { self.pc.removeTrack(s); } catch (e) {} self.senders.delete(t); } });
};

/* ---- diagnostics: selected candidate pair -> {type: host|srflx|prflx|relay, via: direct|relay, proto, rtt} ---- */
Peer.prototype.stats = async function () {
  try {
    var timer, rep = await Promise.race([this.pc.getStats(), new Promise(function (_, rej) { timer = setTimeout(function () { rej(new Error('stats timeout')); }, 1500); })]);
    clearTimeout(timer);
    var by = {}, tr = null, pair = null;
    rep.forEach(function (r) { by[r.id] = r; if (r.type === 'transport' && r.selectedCandidatePairId) tr = r; });
    if (tr) pair = by[tr.selectedCandidatePairId];
    if (!pair) rep.forEach(function (r) { if (!pair && r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated || r.selected)) pair = r; });
    if (!pair) return null;
    var l = by[pair.localCandidateId] || {}, rm = by[pair.remoteCandidateId] || {}, a = l.candidateType || '', b = rm.candidateType || '';
    var type = a === 'relay' || b === 'relay' ? 'relay' : a === 'srflx' || b === 'srflx' ? 'srflx' : a === 'prflx' || b === 'prflx' ? 'prflx' : (a || b || 'host');
    return { type: type, via: type === 'relay' ? 'relay' : 'direct', proto: l.protocol || rm.protocol || '', rtt: typeof pair.currentRoundTripTime === 'number' ? Math.round(pair.currentRoundTripTime * 1000) : -1 };
  } catch (e) { return null; }
};

/* ---- teardown. opts.bye: send a goodbye (with reason) first so the other side reports why ---- */
Peer.prototype.drop = function (why, opts) {
  if (this.closed) return; this.closed = true;
  [this._fb, this._dt, this._rt, this._hs, this._wt].forEach(clearTimeout); clearInterval(this._hb); clearInterval(this._rti);
  var was = this.open, self = this; this.open = false; this.ready = false; this.queue.length = 0; this.queued = 0; this.asm.clear();
  if (opts && opts.bye && was) { this._raw(this.ctl, 'i' + JSON.stringify({ t: 'bye', why: String(opts.bye) })); setTimeout(function () { self._kill(); }, 80); } else this._kill();
  this.net._forget(this); this.net._emit('close', this.id, why, was);
};
Peer.prototype._kill = function () { try { this.pc.close(); } catch (e) {} };
Peer.prototype.close = function (why) { this.drop(why || 'local', { bye: why || 'left' }); };

/* ------------------------------------------------------------------ Net: the public API */
function Net(opts) {
  Emitter.call(this); opts = opts || {}; this.opts = opts;
  this.ns = String(opts.ns || 'p2p-js/v1'); this.T = Object.assign({}, DEFAULT_T, opts.timeouts || {});
  this.ice = opts.ice || {}; this.maxPeers = opts.maxPeers || 7; this.chunkSize = opts.chunkSize || 32768;
  this.maxMessage = opts.maxMessage || 64 * 1024 * 1024; this.maxQueue = opts.maxQueue || 64 * 1024 * 1024;
  this.uid = opts.uid || randStr(10); this.debug = !!opts.debug;
  this.peers = {}; this.byUid = {}; this.pidByUid = {}; this.role = null; this.id = null; this.room = null; this.hub = null;
  this.accepting = true; this.localStreams = []; this._mid = 1; this._gen = 0; this._joining = null; this._remoteIce = []; this._iceAt = 0;
  /* tab closing / navigating away: tell everyone right now instead of making them wait for the heartbeat timeout */
  if (typeof root.addEventListener === 'function' && typeof root.document !== 'undefined') { var self = this; this._hideFn = function () { for (var id in self.peers) { var p = self.peers[id]; if (p.open) p._raw(p.ctl, 'i{"t":"bye","why":"left"}'); } }; root.addEventListener('pagehide', this._hideFn); }
}
Net.prototype = Object.create(Emitter.prototype); Net.prototype.constructor = Net;
Net.prototype._dbg = function () { if (this.debug && root.console) root.console.log.apply(root.console, ['[p2p]'].concat([].slice.call(arguments))); };
Net.prototype._status = function (s) { this._dbg(s); this._emit('status', s); };
Net.prototype._topic = function (room, who) { return this.ns + '/' + room + '/' + who; };
Net.prototype._iceConfig = function () { return buildIceConfig(this.ice, this._remoteIce); };
Net.prototype._loadIce = async function () {
  var src = this.opts.iceServersUrl; if (!src || nowMs() - this._iceAt < 5 * 60 * 1000) return;
  try {
    var j;
    if (typeof src === 'function') j = await src();
    else { var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 4000); try { j = await (await root.fetch(src, { signal: ctl.signal, cache: 'no-store' })).json(); } finally { clearTimeout(t); } }
    if (j && j.iceServers) j = j.iceServers; if (j && !Array.isArray(j)) j = [j];
    this._remoteIce = cleanIceServers(j); this._iceAt = nowMs();
  } catch (e) { this._dbg('iceServersUrl failed', e && e.message); }
};
Net.prototype._makeHub = function () {
  var s = this.opts.signaling;
  if (s && typeof s === 'object' && typeof s.connect === 'function') return s;
  if (typeof s === 'function') return s(this);
  if (s === 'broadcast') return new BroadcastHub(this.ns);
  return new MqttHub(Array.isArray(this.opts.brokers) && this.opts.brokers.length ? this.opts.brokers : DEFAULT_BROKERS, this.T);
};
Net.prototype._forget = function (p) { if (this.peers[p.id] === p) delete this.peers[p.id]; if (p.uid && this.byUid[p.uid] === p) delete this.byUid[p.uid]; };
Net.prototype._attachStreams = function (p) { this.localStreams.forEach(function (s) { p.addStream(s); }); };
Net.prototype._peerOpen = function (p) { this._emit('open', p.id, p); if (this._joining && p.id === 'host') this._joining.ok(); if (this.opts.keepSignaling === false && this.role === 'client' && this.hub) { this.hub.close(); this.hub = null; } };
Net.prototype._allocId = function (uid) {
  var want = uid && this.pidByUid[uid]; if (want && !this.peers[want]) return want;
  for (var i = 1; i <= this.maxPeers; i++) if (!this.peers['p' + i]) { if (uid) { this.pidByUid[uid] = 'p' + i; var k = Object.keys(this.pidByUid); if (k.length > 128) delete this.pidByUid[k[0]]; } return 'p' + i; }
  return null;
};

/* ---- queries ---- */
Net.prototype.ids = function () { var p = this.peers; return Object.keys(p).filter(function (k) { return p[k].open; }); };
Net.prototype.count = function () { return this.ids().length; };
Net.prototype.rtt = function (id) { var p = this.peers[id]; return p ? p.rtt : -1; };
Net.prototype.getStats = function (id) { var p = this.peers[id]; return p ? p.stats() : Promise.resolve(null); };
Net.prototype.stats = async function () { var out = {}, ids = this.ids(); for (var i = 0; i < ids.length; i++) out[ids[i]] = await this.peers[ids[i]].stats(); return out; };
Net.prototype.setAccepting = function (b) { this.accepting = !!b; };

/* ---- host / join with a room code ---- */
Net.prototype.host = async function (o) {
  o = o || {}; this.close(); this.role = 'host'; this.id = 'host'; var gen = this._gen;
  await this._loadIce(); if (gen !== this._gen) throw mkErr('cancelled');
  var room = normRoom(o.room) || randStr(this.opts.codeLength || 5, ROOM_ALPHA); this.room = room;
  var self = this, hub = this.hub = this._makeHub(); hub.onmsg = function (m) { self._hostMsg(m); };
  this._status('Opening room...');
  try { await hub.connect([this._topic(room, 'h')]); } catch (e) { if (this._gen === gen) this.close(); throw mkErr('signaling', 'Could not reach a signaling server. Check your connection, or use copy-paste codes.'); }
  if (this._gen !== gen) throw mkErr('cancelled');
  this._status('Room open'); return room;
};
Net.prototype._hostMsg = function (m) {
  var self = this; if (this.role !== 'host' || !m || !m.from) return;
  var hub = this.hub, room = this.room, topicOf = function (uid) { return self._topic(room, uid); };
  var reply = function (o) { if (hub) hub.publish(topicOf(m.from), o); };
  if (m.k === 'join') {
    var p = this.byUid[m.from];
    if (p) { if (!p.open) p.replay(); return reply({ k: 'hello', id: p.id }); }
    var id = this._allocId(m.from); if (!this.accepting || !id) return reply({ k: 'full' });
    p = new Peer(this, id, { polite: false, hostSide: true, uid: m.from, sigEnabled: true, route: function (msg) { if (self.hub) self.hub.publish(topicOf(m.from), { k: 'sig', from: 'h', m: msg }); } });
    this.peers[id] = p; this.byUid[m.from] = p; p.startHandshakeTimer(this.T.host);
    reply({ k: 'hello', id: id });
  } else if (m.k === 'sig' && m.m) { var q = this.byUid[m.from]; if (q) q._recvSig(m.m); }
};
Net.prototype.join = async function (code) {
  code = normRoom(code); if (!code) throw mkErr('bad-code', 'Enter a room code.');
  this.close(); this.role = 'client'; this.room = code; var gen = this._gen, self = this;
  await this._loadIce(); if (gen !== this._gen) throw mkErr('cancelled');
  var hub = this.hub = this._makeHub(), me = this.uid, T = this.T;
  return new Promise(function (resolve, reject) {
    var done = false, got = false, tries = 0, tJoin = 0, tConn = 0;
    function finish(err) {
      if (done) return; done = true; clearInterval(tJoin); clearTimeout(tConn); self._joining = null;
      if (err) { if (self._gen === gen) self.close(); reject(err); } else resolve(self.peers.host);
    }
    self._joining = { ok: function () { finish(); }, fail: finish };
    function peer() {
      if (!self.peers.host) {
        var p = new Peer(self, 'host', { polite: true, sigEnabled: true, route: function (msg) { if (self.hub) self.hub.publish(self._topic(code, 'h'), { k: 'sig', from: me, m: msg }); } });
        self.peers.host = p; p.startHandshakeTimer(T.join + 5000);
      }
      return self.peers.host;
    }
    function contacted() { if (got) return; got = true; clearInterval(tJoin); self._status('Connecting to host...'); tConn = setTimeout(function () { finish(mkErr('timeout', 'Could not connect to the host. Strict networks can block direct connections: try a copy-paste code, or add a TURN server.')); }, T.join); }
    hub.onmsg = function (m) {
      if (done || self._gen !== gen || !m) return;
      if (m.k === 'full') return finish(mkErr('full', 'That room is full or already playing.'));
      if (m.k === 'hello') { contacted(); if (m.id && !self.id) self.id = m.id; return; }
      if (m.k === 'sig' && m.m) { contacted(); peer()._recvSig(m.m); }
    };
    Promise.resolve().then(function () { return hub.connect([self._topic(code, me)]); }).then(function () {
      if (done || self._gen !== gen) return;
      self._status('Looking for room ' + code + '...');
      var send = function () { if (done || got) return; if (tries++ >= T.joinTries) return finish(mkErr('not-found', 'Room not found. Check the code and try again.')); hub.publish(self._topic(code, 'h'), { k: 'join', from: me }); };
      send(); tJoin = setInterval(send, T.signalRetry);
    }, function () { finish(mkErr('signaling', 'Could not reach a signaling server. Check your connection, or use copy-paste codes.')); });
  });
};

/* ---- serverless copy/paste pairing. host: hostManual() -> send code -> acceptAnswer(id, reply). client: joinManual(code) -> reply code ---- */
Net.prototype.hostManual = async function () {
  if (this.role !== 'host') { this.close(); this.role = 'host'; this.id = 'host'; }
  await this._loadIce();
  var id = this._allocId(null); if (!id) throw mkErr('full', 'Room is full.');
  var p = new Peer(this, id, { polite: false, hostSide: true, sigEnabled: false }); this.peers[id] = p; var pc = p.pc;
  await pc.setLocalDescription(await pc.createOffer()); await gathered(pc, this.T.gather, this.T.srflxGrace, this.T.relayGrace);
  p._needed = false; p.startHandshakeTimer(this.T.manual);
  return { id: id, code: await encodeCode(pc.localDescription) };
};
Net.prototype.acceptAnswer = async function (id, code) {
  var p = this.peers[id]; if (!p) throw mkErr('closed', 'That slot was closed.');
  await p.pc.setRemoteDescription(await decodeCode(code));
};
Net.prototype.cancelManual = function (id) { var p = this.peers[id]; if (p && !p.open) p.drop('cancelled'); };
Net.prototype.joinManual = async function (offerCode) {
  var offer = await decodeCode(offerCode); this.close(); this.role = 'client'; await this._loadIce();
  var p = new Peer(this, 'host', { polite: true, sigEnabled: false }); this.peers.host = p; var pc = p.pc;
  await pc.setRemoteDescription(offer); p._streamsAdded = true; this._attachStreams(p);
  await pc.setLocalDescription(await pc.createAnswer()); await gathered(pc, this.T.gather, this.T.srflxGrace, this.T.relayGrace);
  p._needed = false; p.startHandshakeTimer(this.T.manual);
  return encodeCode(pc.localDescription);
};

/* ---- messaging ---- */
Net.prototype.send = function (id, data, o) { var p = this.peers[id]; return p ? p.send(data, o) : false; };
/* send to every open peer; encodes once. { reliable: false } uses the unreliable channel, { except: id } skips one peer */
Net.prototype.broadcast = function (data, o) {
  var enc = encodeUser(data), n = 0, except = o && o.except;
  for (var id in this.peers) if (id !== except && this.peers[id].sendEncoded(enc, o)) n++;
  return n;
};
Net.prototype.kick = function (id, reason) { var p = this.peers[id]; if (p) p.drop('kicked', { bye: reason || 'kicked' }); };
Net.prototype.restartIce = function (id) { var p = this.peers[id]; if (p) p.restartIce(); };

/* ---- media (audio / video). Works at any time: tracks are renegotiated automatically. ---- */
Net.prototype.addStream = function (stream) {
  if (this.localStreams.indexOf(stream) < 0) this.localStreams.push(stream);
  for (var id in this.peers) if (this.peers[id]._streamsAdded) this.peers[id].addStream(stream);
};
Net.prototype.removeStream = function (stream) {
  this.localStreams = this.localStreams.filter(function (s) { return s !== stream; });
  for (var id in this.peers) this.peers[id].removeStream(stream);
};
/* swap a track (camera switch, screen share) without renegotiation */
Net.prototype.replaceTrack = async function (oldTrack, newTrack) {
  for (var id in this.peers) { var p = this.peers[id], s = p.senders.get(oldTrack); if (s) { await s.replaceTrack(newTrack); p.senders.delete(oldTrack); p.senders.set(newTrack, s); } }
};

/* close() and also detach the page-level listener; use when you are done with this Net object for good */
Net.prototype.destroy = function () { if (this._hideFn) { root.removeEventListener('pagehide', this._hideFn); this._hideFn = null; } this.close(); };
Net.prototype.close = function () {
  this._gen++; var j = this._joining; this._joining = null; if (j) j.fail(mkErr('cancelled', 'cancelled'));
  var ps = Object.keys(this.peers).map(function (k) { return this.peers[k]; }, this); this.peers = {}; this.byUid = {};
  ps.forEach(function (p) { p.drop('local', { bye: 'left' }); });
  if (this.hub) { try { this.hub.close(); } catch (e) {} } this.hub = null;
  this.role = null; this.room = null; this.id = null; this.accepting = true;
};

/* ------------------------------------------------------------------ exports */
function support() {
  return {
    webrtc: typeof root.RTCPeerConnection === 'function', dataChannel: typeof root.RTCPeerConnection === 'function' && 'createDataChannel' in root.RTCPeerConnection.prototype,
    websocket: typeof root.WebSocket === 'function', compression: typeof root.CompressionStream === 'function' && typeof root.DecompressionStream === 'function',
    broadcastChannel: typeof root.BroadcastChannel === 'function', secureContext: root.isSecureContext !== false
  };
}
return {
  version: VERSION, create: function (opts) { return new Net(opts); }, Net: Net, support: support, probeIce: probeIce,
  iceConfig: buildIceConfig, cleanIceServers: cleanIceServers, encodeCode: encodeCode, decodeCode: decodeCode,
  DEFAULT_STUN: DEFAULT_STUN, DEFAULT_BROKERS: DEFAULT_BROKERS, DEFAULT_TIMEOUTS: DEFAULT_T,
  _t: { Peer: Peer, gathered: gathered, mqtt: mqtt, MqttHub: MqttHub, BroadcastHub: BroadcastHub, encodeUser: encodeUser, makeFrames: makeFrames }
};
});
