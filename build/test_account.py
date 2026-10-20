"""Account + cloud save end-to-end. Real game code in headless Chromium; Supabase is faked with page.route.
The fake mirrors the rules verified against the REAL database (supabase_setup.sql): table is read-only for the game,
save_player_data() is version-checked, add_stats() is capped, refresh tokens are single use (reuse revokes the session).
Run: python3 build/test_account.py"""
import json, re, time, copy, subprocess, sys, os, itertools
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765; GAME = f'http://localhost:{PORT}/game.html'
SB = 'https://vqsdacodipqrmajupunv.supabase.co'
CAPS = dict(kills=60, deaths=10, rounds=10, round_wins=10, matches=5, wins=5, losses=5, damage=20000)
fails = []; n = [0]
def chk(name, ok, extra=''):
    n[0] += 1
    if not ok: fails.append(name); print('FAIL', name, extra)
    else: print('ok  ', name, extra)

class Fake:
    def __init__(s): s.reset()
    def reset(s):
        s.users = {}; s.rows = {}; s.at = {}; s.rt = {}; s.revoked = set(); s.log = []
        s.saves = []; s.confirm = True; s.blocked = False; s.offline = False; s.ttl = 3600; s.c = itertools.count(1)
    def nid(s, p): return '%s%06d' % (p, next(s.c))
    def newrow(s): return dict(username=None, settings={}, binds={}, loadouts={}, economy={}, stats={}, version=0)
    def uj(s, u): return dict(id=u['id'], email=u['email'], email_confirmed_at='x' if u['ok'] else None, user_metadata=dict(u['meta']), identities=[{}])
    def add_user(s, email, pw, meta, ok=True, trigger=True):
        u = dict(id='00000000-0000-4000-8000-%012d' % next(s.c), email=email, pw=pw, ok=ok, meta=meta); s.users[email] = u
        r = s.newrow(); nm = meta.get('username')   # the handle_new_user() trigger
        if trigger and nm and re.fullmatch(r'[A-Za-z0-9_]{3,16}', nm) and not any(x['username'] and x['username'].lower() == nm.lower() for x in s.rows.values()): r['username'] = nm
        s.rows[u['id']] = r; return u
    def session(s, u, sid=None):
        sid = sid or s.nid('sid'); at = 'AT.' + s.nid('a'); rt = 'RT.' + s.nid('r'); exp = int(time.time()) + s.ttl
        s.at[at] = dict(uid=u['id'], exp=exp, sid=sid); s.rt[rt] = dict(uid=u['id'], used=False, sid=sid)
        return dict(access_token=at, refresh_token=rt, token_type='bearer', expires_in=s.ttl, expires_at=exp, user=s.uj(u))
    def expire_access(s):
        for v in s.at.values(): v['exp'] = int(time.time()) - 10
    def who(s, h):
        a = h.get('authorization', '')
        if not a.startswith('Bearer '): return None, 'anon'
        t = a[7:]; v = s.at.get(t)
        if not v: return None, 'bad'
        if v['exp'] <= time.time() or v['sid'] in s.revoked: return None, 'expired'
        return v, 'ok'
    def count(s, sub): return sum(1 for m, p in s.log if sub in p)
    def direct_writes(s): return [x for x in s.log if x[0] in ('POST', 'PATCH', 'PUT', 'DELETE') and x[1].split('?')[0] == '/rest/v1/player_data']
    def username_taken(s, nm, me): return any(r['username'] and r['username'].lower() == nm.lower() for k, r in s.rows.items() if k != me)

    def handle(s, route):
        rq = route.request; u = urlparse(rq.url); path = u.path; q = parse_qs(u.query); m = rq.method
        cors = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
        if m == 'OPTIONS': return route.fulfill(status=200, headers=cors)
        if s.offline: return route.abort()
        s.log.append((m, path + ('?' + u.query if u.query else '')))
        h = {k.lower(): v for k, v in rq.headers.items()}
        try: b = json.loads(rq.post_data) if rq.post_data else {}
        except Exception: b = {}
        def out(st, o=None): route.fulfill(status=st, headers={**cors, 'content-type': 'application/json'}, body='' if o is None else json.dumps(o))
        def err(st, code, msg): out(st, dict(code=st, error_code=code, msg=msg))
        # ---------------- auth ----------------
        if path == '/auth/v1/signup':
            if s.blocked: return err(400, 'email_address_not_authorized', 'Email address not authorized')
            em = b.get('email', '').lower(); ex = s.users.get(em)
            if ex:
                if not s.confirm: return err(422, 'user_already_exists', 'User already registered')
                return out(200, dict(id='ghost', email=em, identities=[]))
            u = s.add_user(em, b['password'], b.get('data') or {}, ok=not s.confirm)
            return out(200, s.session(u) if not s.confirm else s.uj(u))
        if path == '/auth/v1/token':
            gt = q.get('grant_type', [''])[0]
            if gt == 'password':
                u = s.users.get(b.get('email', '').lower())
                if not u or u['pw'] != b.get('password'): return err(400, 'invalid_credentials', 'Invalid login credentials')
                if not u['ok']: return err(400, 'email_not_confirmed', 'Email not confirmed')
                return out(200, s.session(u))
            r = s.rt.get(b.get('refresh_token'))
            if not r or r['sid'] in s.revoked: return err(400, 'refresh_token_not_found', 'Invalid Refresh Token: Refresh Token Not Found')
            if r['used']: s.revoked.add(r['sid']); return err(400, 'refresh_token_already_used', 'Invalid Refresh Token: Already Used')
            r['used'] = True; u = next(x for x in s.users.values() if x['id'] == r['uid']); return out(200, s.session(u, r['sid']))
        if path == '/auth/v1/user':
            v, st = s.who(h)
            if not v: return err(401, 'bad_jwt', 'invalid JWT')
            u = next(x for x in s.users.values() if x['id'] == v['uid'])
            if m == 'PUT':
                if b.get('password') == u['pw']: return err(422, 'same_password', 'New password should be different from the old password.')
                u['pw'] = b['password']
            return out(200, s.uj(u))
        if path == '/auth/v1/logout':
            v, st = s.who(h); sc = q.get('scope', ['global'])[0]
            if v:
                if sc == 'local': s.revoked.add(v['sid'])
                else: s.revoked.update(x['sid'] for x in s.at.values() if x['uid'] == v['uid'])
            return out(204)
        if path in ('/auth/v1/recover', '/auth/v1/resend'): return out(200, {})
        # ---------------- rest ----------------
        if path == '/rest/v1/rpc/username_available':
            nm = b.get('name', ''); return out(200, bool(re.fullmatch(r'[A-Za-z0-9_]{3,16}', nm)) and not s.username_taken(nm, None))
        v, st = s.who(h)
        if path.startswith('/rest/v1/') and not v:
            return out(401, dict(code='PGRST301', message='JWT expired')) if st == 'expired' else out(401, dict(code='42501', message='permission denied'))
        uid = v['uid']; row = s.rows.setdefault(uid, s.newrow())
        if path == '/rest/v1/player_data':
            if m != 'GET': return out(403, dict(code='42501', message='permission denied for table player_data'))
            want = q.get('user_id', [''])[0].replace('eq.', '')
            return out(200, [copy.deepcopy(row)] if want == uid else [])
        if path == '/rest/v1/rpc/save_player_data':
            s.saves.append(dict(u=uid[-2:], base=b.get('p_base'), cur=row['version'], vol=(b.get('p_settings') or {}).get('vol'), fire=(b.get('p_binds') or {}).get('fire'), inv=len(((b.get('p_economy') or {}).get('eco') or {}).get('inv') or {})))
            for k, lim in (('p_settings', 65536), ('p_binds', 65536), ('p_loadouts', 131072), ('p_economy', 262144)):
                x = b.get(k)
                if x is not None and (not isinstance(x, dict) or len(json.dumps(x)) > lim): return out(400, dict(code='22023', message=k + ' invalid'))
            if b.get('p_base') is not None and b['p_base'] != row['version']: return out(200, dict(ok=False, conflict=True, version=row['version'], username=row['username']))
            for col, k in (('settings', 'p_settings'), ('binds', 'p_binds'), ('loadouts', 'p_loadouts'), ('economy', 'p_economy')):
                if b.get(k) is not None: row[col] = copy.deepcopy(b[k])
            row['version'] += 1; us = 'unchanged'; pu = b.get('p_username')
            if pu is not None and row['username'] is None:
                if not re.fullmatch(r'[A-Za-z0-9_]{3,16}', pu): us = 'invalid'
                elif s.username_taken(pu, uid): us = 'taken'
                else: row['username'] = pu; us = 'ok'
            return out(200, dict(ok=True, conflict=False, version=row['version'], username=row['username'], username_status=us))
        if path == '/rest/v1/rpc/add_stats':
            cur = row['stats']
            for k, val in (b.get('delta') or {}).items():
                if k in CAPS: cur[k] = cur.get(k, 0) + max(0, min(float(val), CAPS[k]))
            return out(200, cur)
        return out(404, dict(message='unknown ' + path))

def until(cond, ms=8000, step=150, page=None):
    t = time.time()
    while time.time() - t < ms / 1000:
        try:
            if cond(): return True
        except Exception: pass
        (page.wait_for_timeout(step) if page else time.sleep(step / 1000))
    return False

fake = Fake(); errors = []
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--directory', ROOT, '--bind', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

def newpage(ctx, url=GAME):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'favicon' not in m.text and 'Failed to load resource' not in m.text and 'net::ERR' not in m.text else None)
    pg.route(SB + '/**', fake.handle); pg.route('https://raw.githubusercontent.com/**', lambda r: r.abort())
    pg.goto(url); pg.wait_for_timeout(1200); return pg
def modal_msg(pg): return pg.inner_text('#acModal .msg') if pg.query_selector('#acModal .msg') else ''
def open_modal(pg):
    if not pg.is_visible('#acModal'): pg.click('#acctBtn')
def open_signup(pg, email, pw, name):
    open_modal(pg); pg.click('#acModal [data-ac=up]'); pg.fill('#acU', name); pg.fill('#acE', email); pg.fill('#acP', pw); pg.click('#acGo')
def sign_in(pg, email, pw):
    open_modal(pg)
    if pg.query_selector('#acU'): pg.click('#acModal [data-ac=in]')
    pg.fill('#acE', email); pg.fill('#acP', pw); pg.click('#acGo')
def synced(pg, ms=9000): return until(lambda: pg.evaluate('R6Acct.signedIn&&R6Acct.status==="ok"'), ms, page=pg)
def ev(pg, js): return pg.evaluate(js)
def uid_of(email): return fake.users[email]['id']
def row(email): return fake.rows[uid_of(email)]
def buy_cheap(pg, skip=()):
    return ev(pg, '(skip=>{const id=ECO.todaysShop().find(i=>ECO.BYID[i].r==="c"&&!ECO.has(i)&&!skip.includes(i));const r=ECO.buy(id);return r.ok?id:null})(' + json.dumps(list(skip)) + ')')
def modal_fits(pg):
    b = pg.query_selector('#acModal .box').bounding_box(); vw = pg.viewport_size
    return b['x'] >= 0 and b['y'] >= 0 and b['x'] + b['width'] <= vw['width'] and b['y'] + b['height'] <= vw['height']

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctxA = br.new_context(viewport={'width': 1280, 'height': 720})
    A = newpage(ctxA)

    # ===== 1. sign-up with e-mail confirmation ON =====
    chk('1a signed out button says SIGN IN', ev(A, 'document.querySelector("#acctBtn .nm").textContent') == 'SIGN IN')
    A.click('#acctBtn'); chk('1b sign-in modal fits 1280x720', modal_fits(A))
    open_signup(A, 'coops@example.com', 'hunter2hunter2', 'Coops_1'); A.wait_for_timeout(800)
    chk('1c shows account-created message, back on sign-in view', 'ACCOUNT CREATED' in modal_msg(A) and A.query_selector('#acU') is None, modal_msg(A))
    chk('1d email prefilled for sign-in', A.input_value('#acE') == 'coops@example.com')
    chk('1e resend link visible', A.is_visible('#acModal .rs'))
    chk('1f username reserved at sign-up by the trigger', row('coops@example.com')['username'] == 'Coops_1')
    A.fill('#acP', 'hunter2hunter2'); A.click('#acGo'); A.wait_for_timeout(600)
    chk('1g sign-in before confirming -> clear message', 'CONFIRM YOUR EMAIL' in modal_msg(A), modal_msg(A))
    chk('1h resend link shown after that', A.is_visible('#acModal .rs'))
    A.click('#acModal .rs'); A.wait_for_timeout(500)
    chk('1i resend calls /auth/v1/resend with redirect back to the game', any('/auth/v1/resend?redirect_to=' + 'http%3A%2F%2Flocalhost%3A8765%2Fgame.html' in p for m, p in fake.log), [p for m, p in fake.log if 'resend' in p])
    chk('1j signup also sent redirect_to', any(p.startswith('/auth/v1/signup?redirect_to=') for m, p in fake.log))
    fake.users['coops@example.com']['ok'] = True          # player clicks the e-mail link
    A.click('#acGo'); ok = synced(A)
    chk('1k sign-in after confirming succeeds + SYNCED', ok, ev(A, 'R6Acct.status'))
    chk('1l modal closed, button shows username', not A.is_visible('#acModal') and ev(A, 'document.querySelector("#acctBtn .nm").textContent') == 'COOPS_1')
    chk('1m first link uploaded this device to the account', row('coops@example.com')['version'] >= 1 and 'eco' in row('coops@example.com')['economy'])

    # ===== 2. other sign-up outcomes =====
    ctxX = br.new_context(); X = newpage(ctxX)
    open_signup(X, 'coops@example.com', 'whateverpass1', 'Other_1'); X.wait_for_timeout(700)
    chk('2a duplicate email (hidden behind a 200) is detected', 'ALREADY HAS AN ACCOUNT' in modal_msg(X), modal_msg(X))
    X.click('#acModal [data-ac=in]'); X.click('#acModal [data-ac=up]'); X.fill('#acU', 'coops_1'); X.fill('#acE', 'new@example.com'); X.fill('#acP', 'longenough1'); X.click('#acGo'); X.wait_for_timeout(600)
    chk('2b taken username (case-insensitive) is refused', 'USERNAME IS TAKEN' in modal_msg(X), modal_msg(X))
    fake.blocked = True; X.fill('#acU', 'fresh_one'); X.click('#acGo'); X.wait_for_timeout(600)
    chk('2c e-mail service refusing an address gives a clear message', 'EMAIL SERVICE' in modal_msg(X), modal_msg(X))
    fake.blocked = False
    X.fill('#acP', 'short'); X.click('#acGo'); X.wait_for_timeout(300)
    chk('2d short password rejected client-side', '8+' in modal_msg(X))
    fake.confirm = False; X.fill('#acP', 'longenough1'); X.click('#acGo'); ok = synced(X)
    chk('2e confirmation OFF: sign-up signs straight in', ok and ev(X, 'R6Acct.signedIn'))
    chk('2f new account row has its username', row('new@example.com')['username'] == 'fresh_one')
    fake.confirm = True; ctxX.close()

    # ===== 3. data sync: settings, loadouts, economy, stats =====
    ev(A, 'R6Data.get().settings.vol=0.31;R6Data.get().loadouts.testop={f:1,p:"MP5"};R6Acct.dirty()')
    chk('3a settings+loadout reach the cloud', until(lambda: row('coops@example.com')['settings'].get('vol') == 0.31 and 'testop' in row('coops@example.com')['loadouts'], 6000, page=A))
    item1 = buy_cheap(A)
    chk('3b purchase reaches the cloud (item + credits)', until(lambda: item1 in row('coops@example.com')['economy']['eco']['inv'] and row('coops@example.com')['economy']['eco']['cr'] == 2100, 6000, page=A), row('coops@example.com')['economy']['eco'].get('cr'))
    ev(A, 'R6Acct.round({me:{kl:5,alive:false,dd:300},side:"A"},"A");R6Acct.match(true)')
    chk('3c stats are uploaded via add_stats', until(lambda: row('coops@example.com')['stats'] == dict(kills=5, deaths=1, rounds=1, round_wins=1, matches=1, wins=1, damage=300), 6000, page=A), row('coops@example.com')['stats'])
    ev(A, 'R6Acct.round({me:{kl:130,alive:true,dd:45000},side:"A"},"B")')
    chk('3d oversized batch is sent in capped slices and nothing is lost', until(lambda: row('coops@example.com')['stats'].get('kills') == 135 and row('coops@example.com')['stats'].get('damage') == 45300, 8000, page=A), row('coops@example.com')['stats'])
    chk('3e the game NEVER writes the table directly', fake.direct_writes() == [], fake.direct_writes())

    # ===== 4. second device gets everything =====
    ctxB = br.new_context(viewport={'width': 1280, 'height': 720}); B = newpage(ctxB)
    sign_in(B, 'coops@example.com', 'hunter2hunter2'); ok = synced(B)
    chk('4a device B signs in + syncs', ok)
    chk('4b B received settings + loadouts', ev(B, 'R6Data.get().settings.vol') == 0.31 and ev(B, 'R6Data.get().loadouts.testop&&R6Data.get().loadouts.testop.p') == 'MP5')
    chk('4c B owns the purchased item and has the credits', ev(B, f'ECO.has("{item1}")') and ev(B, 'ECO.cr') == 2100)
    chk('4d B shows the stats', ev(B, 'R6Acct.stats.kills') == 135 and ev(B, 'R6Acct.stats.matches') == 1)
    B.click('#acctBtn'); B.wait_for_timeout(300)
    chk('4e account tab renders username + email', 'COOPS_1' in B.inner_text('#tp-acct') and 'coops@example.com' in B.inner_text('#tp-acct'))

    # ===== 5. two devices change things at once =====
    ev(B, 'R6Data.get().settings.vol=0.11;R6Acct.dirty()'); item2 = buy_cheap(B)
    chk('5a B saves', until(lambda: row('coops@example.com')['settings'].get('vol') == 0.11 and item2 in row('coops@example.com')['economy']['eco']['inv'], 6000, page=B))
    v_before = row('coops@example.com')['version']
    ev(A, 'R6Data.get().binds.fire="KeyF";R6Acct.dirty()'); item3 = buy_cheap(A, [item2])      # A is stale: it has not seen B's save
    chk('5b A\'s stale save is detected and merged, not overwritten', until(lambda: item2 in row('coops@example.com')['economy']['eco']['inv'] and item3 in row('coops@example.com')['economy']['eco']['inv'], 9000, page=A))
    r = row('coops@example.com')
    chk('5c B\'s volume change survives A\'s stale copy (3-way merge)', r['settings'].get('vol') == 0.11, r['settings'])
    chk('5d A\'s keybind change is kept too', r['binds'].get('fire') == 'KeyF', r['binds'])
    chk('5e A now owns B\'s item', ev(A, f'ECO.has("{item2}")') and ev(A, f'ECO.has("{item3}")') and ev(A, 'R6Data.get().settings.vol') == 0.11, (ev(A, f'[ECO.has("{item2}"),ECO.has("{item3}"),R6Data.get().settings.vol]')))
    print('SAVES', [x for x in fake.saves if x['u']==uid_of('coops@example.com')[-2:]][-6:])
    A.wait_for_timeout(500)
    chk('5f no data lost: all three items present in cloud', all(i in r['economy']['eco']['inv'] for i in (item1, item2, item3)))

    # ===== 6. reload keeps the session, no double counting =====
    kills_before = row('coops@example.com')['stats']['kills']
    A.reload(); A.wait_for_timeout(1500); ok = synced(A)
    chk('6a reload: still signed in and synced', ok and ev(A, 'document.querySelector("#acctBtn .nm").textContent') == 'COOPS_1')
    chk('6b reload does not double count stats', row('coops@example.com')['stats']['kills'] == kills_before)

    # ===== 7. offline then back =====
    fake.offline = True
    ev(A, 'R6Data.get().settings.vol=0.77;R6Acct.dirty();R6Acct.round({me:{kl:3,alive:false,dd:10},side:"A"},"A")')
    A.wait_for_timeout(4500)
    chk('7a offline: status says so, nothing lost locally', ev(A, 'R6Acct.status') in ('offline', 'error') and ev(A, 'R6Acct.stats.kills') == kills_before + 3, ev(A, 'R6Acct.status'))
    fake.offline = False; ev(A, 'window.dispatchEvent(new Event("online"))')
    chk('7b back online: queued edits + stats are delivered exactly once', until(lambda: row('coops@example.com')['settings'].get('vol') == 0.77 and row('coops@example.com')['stats']['kills'] == kills_before + 3, 8000, page=A), row('coops@example.com')['stats'])
    # reload while offline with unsynced edits, then reconnect
    fake.offline = True; ev(A, 'R6Data.apply({settings:{vol:0.55}});R6Acct.dirty()'); A.wait_for_timeout(2500); fake.offline = False
    A.reload(); A.wait_for_timeout(1500); synced(A)
    chk('7c unsynced edit survives a reload and is uploaded on next start', until(lambda: row('coops@example.com')['settings'].get('vol') == 0.55, 8000, page=A), row('coops@example.com')['settings'])

    # ===== 8. expired access token =====
    refreshes = fake.count('grant_type=refresh_token')
    fake.expire_access(); ev(A, 'R6Data.get().settings.vol=0.66;R6Acct.dirty()')
    chk('8a server rejects expired token -> client refreshes and retries transparently', until(lambda: row('coops@example.com')['settings'].get('vol') == 0.66, 8000, page=A) and fake.count('grant_type=refresh_token') == refreshes + 1)
    chk('8b still signed in', ev(A, 'R6Acct.signedIn'))

    # ===== 9. popup + tab refreshing at the same moment =====
    A2 = newpage(ctxA)                                    # same browser profile = same localStorage, like popup + full tab
    ev(A, 'R6Acct.status')
    stored = ev(A, 'JSON.parse(localStorage.r6s_acct)'); stored['expires_at'] = int(time.time()) + 10
    ev(A, f'localStorage.r6s_acct=JSON.stringify({json.dumps(stored)})'); A.wait_for_timeout(200)    # A2 adopts it through the storage event
    stored['expires_at'] += 1; ev(A2, f'localStorage.r6s_acct=JSON.stringify({json.dumps(stored)})'); A.wait_for_timeout(200)  # and so does A
    refreshes = fake.count('grant_type=refresh_token')
    A.evaluate('R6Acct.sync()'); A2.evaluate('R6Acct.sync()'); A.wait_for_timeout(3000)
    chk('9a exactly ONE refresh across both windows (Web Lock)', fake.count('grant_type=refresh_token') == refreshes + 1, fake.count('grant_type=refresh_token') - refreshes)
    chk('9b neither window got signed out', ev(A, 'R6Acct.signedIn') and ev(A2, 'R6Acct.signedIn') and not fake.revoked)
    A2.close()

    # ===== 10. sign out only affects this device =====
    A.click('#acctBtn'); A.wait_for_timeout(300); A.click('#acOut'); A.wait_for_timeout(1200)
    chk('10a logout uses scope=local', any(p.startswith('/auth/v1/logout?scope=local') for m, p in fake.log))
    chk('10b signed out: button, storage', ev(A, 'document.querySelector("#acctBtn .nm").textContent') == 'SIGN IN' and ev(A, 'localStorage.r6s_acct') is None)
    ev(B, 'R6Data.get().settings.vol=0.42;R6Acct.dirty()')
    chk('10c device B stays signed in and still saves', until(lambda: row('coops@example.com')['settings'].get('vol') == 0.42, 6000, page=B))

    # ===== 11. a DIFFERENT account on the same device must not inherit the wallet =====
    fake.confirm = False; open_signup(A, 'second@example.com', 'secondpass1', 'Second_2'); ok = synced(A); fake.confirm = True
    chk('11a second account signs in on the shared device', ok)
    chk('11b first account\'s items are NOT in the second account', not ev(A, f'ECO.has("{item1}")') and ev(A, 'ECO.cr') == 2500, ev(A, 'ECO.cr'))
    chk('11c second account cloud has no leaked items', not any(i in row('second@example.com')['economy'].get('eco', {}).get('inv', {}) for i in (item1, item2, item3)))
    chk('11d first account\'s loadouts did not leak', 'testop' not in row('second@example.com')['loadouts'])
    A.click('#acctBtn'); A.wait_for_timeout(300); A.click('#acOut'); A.wait_for_timeout(1000)
    sign_in(A, 'coops@example.com', 'hunter2hunter2'); ok = synced(A)
    chk('11e first account signs back in and gets everything back', ok and ev(A, f'ECO.has("{item1}")') and ev(A, f'ECO.has("{item3}")') and ev(A, 'R6Data.get().settings.vol') == 0.42)

    # ===== 12. brand-new device that already has local items meets an existing account =====
    ctxC = br.new_context(); C = newpage(ctxC)
    ev(C, 'ECO.grant(ECO.CAT.find(c=>!c.pk&&!c.se&&c.r==="c").id);R6Data.get().loadouts.localonly={f:1}')
    local_item = ev(C, 'Object.keys(ECO.inv)[0]')
    sign_in(C, 'coops@example.com', 'hunter2hunter2'); ok = synced(C)
    chk('12a first link merges: keeps local item AND cloud items', ok and ev(C, f'ECO.has("{local_item}")') and ev(C, f'ECO.has("{item1}")'))
    print('C row', {k: (list(v.get('eco', {}).get('inv', {})) if k == 'economy' else v) for k, v in row('coops@example.com').items() if k in ('economy', 'loadouts', 'version')}, 'local_item', local_item)
    chk('12b merged result uploaded', until(lambda: local_item in row('coops@example.com')['economy']['eco']['inv'] and 'localonly' in row('coops@example.com')['loadouts'] and 'testop' in row('coops@example.com')['loadouts'], 6000, page=C))
    ctxC.close()

    # ===== 13. links from the e-mails =====
    ctxD = br.new_context(); D = newpage(ctxD, GAME + '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')
    D.wait_for_timeout(1200)
    chk('13a used/expired link: friendly toast + hash cleaned', 'ALREADY USED' in D.inner_text('body').upper() and '#' not in D.url, D.url)
    u1 = fake.users['coops@example.com']; s1 = fake.session(u1); D.close()
    D = newpage(ctxD, GAME + f'#access_token={s1["access_token"]}&refresh_token={s1["refresh_token"]}&expires_in=3600&token_type=bearer&type=signup')
    chk('13b confirmation link signs the player straight in', synced(D) and ev(D, 'document.querySelector("#acctBtn .nm").textContent') == 'COOPS_1' and '#' not in D.url)
    ctxE = br.new_context(); s2 = fake.session(u1)
    E = newpage(ctxE, GAME + f'#access_token={s2["access_token"]}&refresh_token={s2["refresh_token"]}&expires_in=3600&token_type=bearer&type=recovery'); E.wait_for_timeout(600)
    chk('13c recovery link opens the new-password form', E.is_visible('#acModal') and E.query_selector('#acP2') is not None)
    E.fill('#acP', 'brandnewpass1'); E.fill('#acP2', 'different1234'); E.click('#acGo'); E.wait_for_timeout(300)
    chk('13d mismatching confirmation blocked', 'DO NOT MATCH' in modal_msg(E))
    E.fill('#acP2', 'brandnewpass1'); E.click('#acGo'); E.wait_for_timeout(1200)
    chk('13e password changed on the server and player is signed in', u1['pw'] == 'brandnewpass1' and ev(E, 'R6Acct.signedIn'))
    # change password from the account tab
    E.click('#acctBtn'); E.wait_for_timeout(300); E.click('#acPw'); E.fill('#acP', 'brandnewpass1'); E.fill('#acP2', 'brandnewpass1'); E.click('#acGo'); E.wait_for_timeout(700)
    chk('13f changing to the same password gives a clear message', 'DIFFERENT' in modal_msg(E), modal_msg(E))
    E.fill('#acP', 'thirdpassword1'); E.fill('#acP2', 'thirdpassword1'); E.click('#acGo'); E.wait_for_timeout(900)
    chk('13g change password from the account tab works', u1['pw'] == 'thirdpassword1')
    ctxD.close(); ctxE.close()

    # ===== 14. account whose username was never reserved =====
    fake.add_user('nameless@example.com', 'namelesspw1', {}, ok=True)
    ctxF = br.new_context(viewport={'width': 800, 'height': 600}); F = newpage(ctxF)
    sign_in(F, 'nameless@example.com', 'namelesspw1'); ok = synced(F)
    chk('14a nameless account signs in', ok)
    F.click('#acctBtn'); F.wait_for_timeout(300)
    chk('14b offers SET USERNAME', F.query_selector('#acName') is not None)
    F.click('#acName'); chk('14c username modal fits 800x600', modal_fits(F))
    F.fill('#acU', 'COOPS_1'); F.click('#acGo'); F.wait_for_timeout(900)
    chk('14d taken name explained', 'TAKEN' in modal_msg(F), modal_msg(F))
    F.fill('#acU', 'Fresh_Name'); F.click('#acGo'); F.wait_for_timeout(1200)
    chk('14e free name claimed and saved', row('nameless@example.com')['username'] == 'Fresh_Name' and F.query_selector('#acName') is None)
    F.click('#acctBtn'); F.click('#acModal [data-ac=close]') if F.is_visible('#acModal') else None
    ctxF.close()

    # ===== 15. wrong password / forgotten password =====
    ctxG = br.new_context(); G = newpage(ctxG)
    sign_in(G, 'coops@example.com', 'wrongwrong'); G.wait_for_timeout(600)
    chk('15a wrong password message', 'WRONG EMAIL OR PASSWORD' in modal_msg(G), modal_msg(G))
    G.click('#acModal [data-ac=reset]'); G.fill('#acE', 'coops@example.com'); G.click('#acGo'); G.wait_for_timeout(600)
    chk('15b reset link request sent', fake.count('/auth/v1/recover?redirect_to=') == 1 and 'RESET LINK' in modal_msg(G))
    ctxG.close()

    chk('99a the game never wrote the table directly (whole run)', fake.direct_writes() == [], fake.direct_writes())
    chk('99b no JS errors in any window', errors == [], errors[:5])
    br.close()

srv.terminate()
print(f'\n{n[0]-len(fails)}/{n[0]} passed'); 
if fails: print('FAILED:', fails); sys.exit(1)
