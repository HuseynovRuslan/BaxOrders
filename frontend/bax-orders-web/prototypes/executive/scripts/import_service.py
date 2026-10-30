"""
The «Excel yüklə» button's server side (owner, 2026-10-28): the site's figures change for everyone when the owner
uploads a workbook. Runs in its own container on the QRLog VPS, reachable only through the site's nginx at
/api/import and /api/undo.

Two steps, so a wrong file is seen before it counts (owner, 2026-10-28):

    POST /import?mode=check   the workbook is read and compared with the current figures — nothing changes
    POST /import              the same workbook applied, if the figures are still those it was checked against
    POST /undo?mode=check     what restoring the figures before the last change would do — nothing changes
    POST /undo                those figures restored; the ones they replace are kept all the same
    POST /catalog?mode=check  an edit made on the site («Mallar»: a price, a new product, a name or category, a
    POST /catalog             product taken out — catalog_edit.py), checked and then applied the same way

With IMPORT_KEY set, every request carries it (header X-Import-Key). Empty, the steps are open to anyone who has the
site's address — the owner's choice (2026-10-28) — and the history (100 steps back) and the baseline copy kept outside
it are what stands between a visitor and the figures management reads. An apply carries X-Base, the fingerprint of the figures its
check saw: if someone changed them in between, it is refused and checked again. The workbook is read by
import_workbook.convert and refused whole if it does not hang together. Before figures change, the ones they replace
go to the history; nothing else on the server is touched.

    DATA_DIR=/data HISTORY_DIR=/history IMPORT_KEY=… python import_service.py
"""
import datetime
import hashlib
import hmac
import http.server
import json
import os
import re
import sys
import threading
import time
import traceback
import urllib.parse

from catalog_edit import EditError, apply_edit
from import_workbook import MONTH_NAMES, WorkbookError, convert

DATA_DIR = os.environ.get('DATA_DIR', '/data')
HISTORY_DIR = os.environ.get('HISTORY_DIR', '/history')
KEY = os.environ.get('IMPORT_KEY', '').encode()  # empty: no key asked (owner, 2026-10-28)
PORT = int(os.environ.get('PORT', '8080'))
DATA_FILE = os.path.join(DATA_DIR, 'real-data.json')
MAX_BYTES = 25 * 1024 * 1024
KEEP = 100  # history entries kept, by time
BAKU = datetime.timezone(datetime.timedelta(hours=4))
BEFORE = '-oncesi.json'  # the figures an import replaced: what an undo restores

lock = threading.Lock()
failures = []  # when a wrong key came, for slowing a guesser down


def current_bytes():
    try:
        with open(DATA_FILE, 'rb') as current:
            return current.read()
    except FileNotFoundError:
        return b''


def fingerprint(raw):
    return hashlib.sha256(raw).hexdigest() if raw else 'none'


def month_totals(data):
    totals = {}
    for line in data.get('lines', []):
        figure = totals.setdefault(line['month'], dict(monthly=0.0, outside=0.0))
        figure[line['type']] += line['amount']
    return {month: {kind: round(value, 2) for kind, value in figure.items()} for month, figure in totals.items()}


def changes(before, after):
    """What the figures would do, month by month and kind by kind: what the Rəhbər would see move."""
    old, new = month_totals(before), month_totals(after)
    moved = []
    for month in sorted(set(old) | set(new)):
        for kind in ('monthly', 'outside'):
            a = old.get(month, {}).get(kind, 0.0)
            b = new.get(month, {}).get(kind, 0.0)
            if abs(a - b) >= 0.005:
                moved.append(dict(month=month, monthName=MONTH_NAMES[month - 1], kind=kind, before=a, after=b))
    return dict(linesBefore=len(before.get('lines', [])), linesAfter=len(after.get('lines', [])), moved=moved)


def version(data):
    meta = data.get('meta', {})
    edits = meta.get('edits', [])
    return dict(source=meta.get('source'), importedAt=meta.get('importedAt'), edits=len(edits), lastEdit=edits[-1] if edits else None)


def replace(source, target):
    """os.replace, patient with a reader that holds the file for a moment (Windows, in development only)."""
    for attempt in range(15):
        try:
            return os.replace(source, target)
        except PermissionError:
            if attempt == 14:
                raise
            time.sleep(0.2)


def write_figures(payload):
    """The new figures in one step: a reader sees the old file or the new one, never half."""
    temporary = DATA_FILE + '.tmp'
    try:
        with open(temporary, 'wb') as out:
            out.write(payload)
        replace(temporary, DATA_FILE)
    except OSError:
        if os.path.exists(temporary):
            os.remove(temporary)
        raise


def keep(name, payload):
    os.makedirs(HISTORY_DIR, exist_ok=True)
    path = os.path.join(HISTORY_DIR, name)
    with open(path, 'wb') as out:
        out.write(payload)
    return path


last_stamp = ['']


def new_stamp(now):
    """A history name no other change has: to the microsecond, and always later than the last one — two changes in
    one second keep both, so an undo never skips one."""
    stamp = f'{now:%Y%m%dT%H%M%S}{now.microsecond:06d}'
    if stamp <= last_stamp[0]:
        stamp = f'{last_stamp[0][:15]}{int(last_stamp[0][15:]) + 1:06d}'
    last_stamp[0] = stamp
    return stamp


def prune():
    """The oldest history entries go; a failure here is logged — the figures have already changed."""
    try:
        entries = sorted(os.listdir(HISTORY_DIR))
        for old in sorted({entry.split('-', 1)[0] for entry in entries})[:-KEEP]:
            for entry in entries:
                if entry.split('-', 1)[0] == old:
                    os.remove(os.path.join(HISTORY_DIR, entry))
    except OSError:
        traceback.print_exc()


def undo_target():
    """The figures before the last import still standing: the newest «…-oncesi.json» in the history."""
    if not os.path.isdir(HISTORY_DIR):
        return None
    names = sorted(name for name in os.listdir(HISTORY_DIR) if name.endswith(BEFORE))
    return os.path.join(HISTORY_DIR, names[-1]) if names else None


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = 'executive-import'
    sys_version = ''

    def reply(self, status, body):
        payload = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        client = self.headers.get('X-Forwarded-For', self.client_address[0]) if self.headers else self.client_address[0]
        sys.stderr.write(f'{datetime.datetime.now(BAKU):%Y-%m-%d %H:%M:%S} {client} {format % args}\n')

    def do_GET(self):
        if self.path == '/health':
            return self.reply(200, dict(ok=True))
        if self.path == '/data/real-data.json' and os.path.exists(DATA_FILE):
            # For development (IMPORT_DEV=1 in vite.config.ts); on the server nginx serves the file itself.
            payload = current_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            return self.wfile.write(payload)
        self.reply(404, dict(error='Tapılmadı.'))

    def do_POST(self):
        url = urllib.parse.urlsplit(self.path)
        mode = urllib.parse.parse_qs(url.query).get('mode', ['apply'])[0]
        if url.path not in ('/import', '/undo', '/catalog') or mode not in ('check', 'apply'):
            return self.reply(404, dict(error='Tapılmadı.'))
        length = int(self.headers.get('Content-Length') or 0)
        if length > MAX_BYTES:
            self.close_connection = True
            return self.reply(413, dict(error='Fayl çox böyükdür: 25 MB-dan çox ola bilməz.'))
        # The whole upload is read before any answer: an early reply would leave it unread and break the connection.
        body = self.rfile.read(length) if length > 0 else b''

        if KEY:
            now = time.monotonic()
            failures[:] = [t for t in failures if now - t < 600]
            if len(failures) >= 30:
                return self.reply(429, dict(error='Çox səhv parol cəhdi oldu. 10 dəqiqə sonra yenidən yoxlayın.'))
            if not hmac.compare_digest(self.headers.get('X-Import-Key', '').encode(), KEY):
                failures.append(now)
                time.sleep(1)
                return self.reply(401, dict(error='İmport parolu səhvdir.'))

        with lock:
            try:
                if url.path == '/import':
                    return self.import_workbook(body, mode)
                if url.path == '/catalog':
                    return self.catalog(body, mode)
                return self.undo(mode)
            except Exception:
                traceback.print_exc()
                return self.reply(500, dict(error='Gözlənilməz server xətası. Rəqəmlər dəyişmədi.'))

    def stale(self, base):
        """An apply for figures other than those its check saw: someone changed them in between."""
        if self.headers.get('X-Base') == base:
            return False
        self.reply(409, dict(error='Rəqəmlər yoxlamadan sonra dəyişib. Yenidən yoxlayın. Rəqəmlər dəyişmədi.'))
        return True

    def import_workbook(self, workbook, mode):
        if not workbook:
            return self.reply(400, dict(error='Fayl boşdur.'))
        name = urllib.parse.unquote(self.headers.get('X-File-Name', '') or 'kitab.xlsx')[:200]
        if not workbook.startswith(b'PK'):
            return self.reply(400, dict(error='Bu, .xlsx faylı deyil. Excel-də «.xlsx» kimi saxlayıb yenidən yükləyin.'))
        try:
            data, report = convert(workbook, name)
        except WorkbookError as error:
            self.log_message('refused %s: %s', name, error.message)
            return self.reply(400, dict(error=error.message, details=error.details))

        raw = current_bytes()
        base = fingerprint(raw)
        current = json.loads(raw) if raw else {}
        moved = changes(current, data)
        # Edits made on the site since the last import: a new workbook replaces them with its own figures.
        lost = len(current.get('meta', {}).get('edits', []))
        if mode == 'check':
            return self.reply(200, dict(ok=True, mode='check', base=base, report=report, changes=moved, editsLost=lost))
        if self.stale(base):
            return

        imported = datetime.datetime.now(BAKU)
        data['meta']['importedAt'] = imported.isoformat(timespec='minutes')
        stamp = new_stamp(imported)
        before = None
        try:
            if raw:
                before = keep(f'{stamp}{BEFORE}', raw)  # the current figures are kept before anything changes
            keep(f'{stamp}-{re.sub(r"[^A-Za-z0-9._-]+", "_", name)[-120:] or "kitab.xlsx"}', workbook)
            write_figures(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode())
        except OSError:
            traceback.print_exc()
            if before and os.path.exists(before):
                os.remove(before)  # no import happened: nothing for an undo to go back to
            return self.reply(500, dict(error='Fayl yazılmadı: server xətası. Rəqəmlər dəyişmədi.'))
        prune()
        self.log_message('imported %s: %d lines', name, report['lines'])
        self.reply(200, dict(ok=True, mode='apply', importedAt=data['meta']['importedAt'], report=report, changes=moved))

    def catalog(self, body, mode):
        try:
            edit = json.loads(body or b'{}')
        except ValueError:
            return self.reply(400, dict(error='Sorğu oxunmadı.'))
        raw = current_bytes()
        if not raw:
            return self.reply(400, dict(error='Hələ rəqəm yoxdur: əvvəl Excel faylını yükləyin.'))
        base = fingerprint(raw)
        current = json.loads(raw)
        try:
            data, summary = apply_edit(current, edit)
        except EditError as error:
            return self.reply(400, dict(error=error.message))
        moved = changes(current, data)
        if mode == 'check':
            return self.reply(200, dict(ok=True, mode='check', base=base, summary=summary, changes=moved))
        if self.stale(base):
            return

        now = datetime.datetime.now(BAKU)
        data['meta'].setdefault('edits', []).append(dict(at=now.isoformat(timespec='minutes'), op=edit.get('op'), text=summary[0]))
        stamp = new_stamp(now)
        before = None
        try:
            before = keep(f'{stamp}{BEFORE}', raw)  # the current figures are kept before anything changes
            keep(f'{stamp}-deyisiklik.json', json.dumps(edit, ensure_ascii=False).encode())
            write_figures(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode())
        except OSError:
            traceback.print_exc()
            if before and os.path.exists(before):
                os.remove(before)
            return self.reply(500, dict(error='Dəyişiklik yazılmadı: server xətası. Rəqəmlər dəyişmədi.'))
        prune()
        self.log_message('edit %s: %s', edit.get('op'), summary[0])
        self.reply(200, dict(ok=True, mode='apply', summary=summary, changes=moved))

    def undo(self, mode):
        target = undo_target()
        if target is None:
            return self.reply(400, dict(error='Geri qaytarılacaq əvvəlki versiya yoxdur.'))
        raw = current_bytes()
        base = fingerprint(raw)
        current = json.loads(raw) if raw else {}
        with open(target, 'rb') as previous:
            restored_raw = previous.read()
        restored = json.loads(restored_raw)
        result = dict(current=version(current), restore=version(restored), changes=changes(current, restored))
        if mode == 'check':
            return self.reply(200, dict(ok=True, mode='check', base=base, **result))
        if self.stale(base):
            return

        stamp = new_stamp(datetime.datetime.now(BAKU))
        try:
            if raw:
                keep(f'{stamp}-geri-alinan.json', raw)  # the figures taken back are kept all the same
            write_figures(restored_raw)
        except OSError:
            traceback.print_exc()
            return self.reply(500, dict(error='Geri qaytarılmadı: server xətası. Rəqəmlər dəyişmədi.'))
        try:
            os.replace(target, target + '.geri')  # the next undo goes one step further back
        except OSError:
            traceback.print_exc()  # the figures are restored; the next undo would offer this same step, with no change
        prune()
        self.log_message('undid the last change, restored %s (%s edits)', result['restore']['source'], result['restore']['edits'])
        self.reply(200, dict(ok=True, mode='apply', **result))


if __name__ == '__main__':
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f'executive-import on :{PORT}, data {DATA_FILE}', flush=True)
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
