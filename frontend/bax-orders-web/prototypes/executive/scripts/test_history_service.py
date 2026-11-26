"""
The kept workbooks (owner, 2026-11-25): every upload is kept for good, listed, downloaded and brought back — the last two
with the Rəhbər's code. The service runs here on a free port with its data and history in a temporary folder; the
workbooks are made with openpyxl, so the figures are countable by hand:

    python -I -m unittest discover -s scripts -p "test_history_service.py"     (from prototypes/executive)
"""
import datetime
import http.client
import importlib
import io
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
import urllib.parse

import openpyxl

CODE = 'test-kod-7'
HEAD = ['Ana kateqoriya', 'Orta kateqoriya', 'Alt kateqoriya', 'Malın adı', 'Miqdarı', 'Ö/V', 'Qiyməti', 'Cəmi', 'Şirkət',
        'Obyekt', 'Tarix', 'Cavabdeh şəxs', 'Sifariş növü']


def workbook(amount, months=(1, 2), year=2025):
    """One «Əsas» sheet: Alfa orders one product for `amount` ₼ in each of the months."""
    book = openpyxl.Workbook()
    sheet = book.active
    sheet.title = 'Əsas'
    sheet.append(HEAD)
    for month in months:
        sheet.append(['Təmizlik', 'Ləvazimat', 'Bez', 'Bez', 1, 'ədəd', amount, amount, 'Cleanfix', 'Alfa',
                      datetime.datetime(year, month, 5), 'Şəxs Adı', 'Aylıq sifariş'])
    out = io.BytesIO()
    book.save(out)
    return out.getvalue()


class KeptWorkbooks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.folder = tempfile.mkdtemp(prefix='history-test-')
        os.environ.update(DATA_DIR=os.path.join(cls.folder, 'data'), HISTORY_DIR=os.path.join(cls.folder, 'history'),
                          REHBER_CODE=CODE, IMPORT_KEY='')
        sys.modules.pop('import_service', None)
        cls.service = importlib.import_module('import_service')
        os.makedirs(cls.service.DATA_DIR, exist_ok=True)
        cls.server = cls.service.http.server.ThreadingHTTPServer(('127.0.0.1', 0), cls.service.Handler)
        cls.server.RequestHandlerClass.log_message = lambda *args: None
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        shutil.rmtree(cls.folder, ignore_errors=True)

    def call(self, method, path, body=b'', headers=None):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_address[1], timeout=30)
        connection.request(method, path, body=body, headers=headers or {})
        response = connection.getresponse()
        payload = response.read()
        kind = response.getheader('Content-Type', '')
        connection.close()
        return response.status, (json.loads(payload) if kind.startswith('application/json') else payload), response

    def upload(self, payload, name):
        headers = {'X-File-Name': urllib.parse.quote(name)}
        status, answer, _ = self.call('POST', '/import?mode=check', payload, headers)
        self.assertEqual(status, 200, answer)
        status, answer, _ = self.call('POST', '/import', payload, {**headers, 'X-Base': answer['base']})
        self.assertEqual(status, 200, answer)

    def figures(self):
        with open(self.service.DATA_FILE, encoding='utf-8') as current:
            return sum(line['amount'] for line in json.load(current)['lines'])

    def test_every_upload_is_kept_listed_downloaded_and_brought_back_with_the_code(self):
        first, second = workbook(100), workbook(250)
        self.upload(first, 'Sifarişlər v1.xlsx')
        self.upload(second, 'Sifarişlər v2.xlsx')
        self.assertEqual(self.figures(), 500)

        # Listed newest first, with the name as uploaded, its lines and years, and which one the site's figures are from.
        status, answer, _ = self.call('GET', '/history')
        self.assertEqual(status, 200)
        listed = answer['workbooks']
        self.assertEqual([item['file'] for item in listed], ['Sifarişlər v2.xlsx', 'Sifarişlər v1.xlsx'])
        self.assertEqual([item['current'] for item in listed], [True, False])
        self.assertEqual(listed[1]['lines'], 2)
        self.assertEqual(listed[1]['years'], [2025])
        older = listed[1]['id']

        # The file itself only with the Rəhbər's code: it carries «Cavabdeh şəxs», which the site never shows.
        status, answer, _ = self.call('POST', '/history/excel', json.dumps(dict(id=older, code='yanlış')).encode())
        self.assertEqual(status, 401)
        status, payload, response = self.call('POST', '/history/excel', json.dumps(dict(id=older, code=CODE)).encode())
        self.assertEqual(status, 200)
        self.assertEqual(payload, first)
        self.assertIn("filename*=UTF-8''Sifari%C5%9Fl%C9%99r%20v1.xlsx", response.getheader('Content-Disposition'))

        # Brought back: checked first (nothing changes), then applied against the figures the check saw.
        status, answer, _ = self.call('POST', '/history/restore?mode=check', json.dumps(dict(id=older, code=CODE)).encode())
        self.assertEqual(status, 200, answer)
        self.assertEqual(self.figures(), 500)
        self.assertEqual({(item['monthName'], item['before'], item['after']) for item in answer['changes']['moved']},
                         {('Yanvar 2025', 250.0, 100.0), ('Fevral 2025', 250.0, 100.0)})
        status, answer, _ = self.call('POST', '/history/restore', json.dumps(dict(id=older, code=CODE)).encode(), {'X-Base': answer['base']})
        self.assertEqual(status, 200, answer)
        self.assertEqual(self.figures(), 200)

        # Not kept a second time; the list now says the figures are the older file's.
        status, answer, _ = self.call('GET', '/history')
        self.assertEqual([(item['file'], item['current']) for item in answer['workbooks']],
                         [('Sifarişlər v2.xlsx', False), ('Sifarişlər v1.xlsx', True)])

        # And undone as an upload is: the figures before the restore come back.
        status, answer, _ = self.call('POST', '/undo?mode=check')
        status, answer, _ = self.call('POST', '/undo', headers={'X-Base': answer['base']})
        self.assertEqual(status, 200, answer)
        self.assertEqual(self.figures(), 500)

    def test_no_path_is_made_of_an_id(self):
        for bad in ('../data/real-data.json', 'real-data.json', '20261124T180528186215-oncesi.json', None):
            status, answer, _ = self.call('POST', '/history/excel', json.dumps(dict(id=bad, code=CODE)).encode())
            self.assertEqual(status, 404, bad)

    def test_the_workbooks_outlive_the_hundred_steps_with_their_notes(self):
        noted = lambda: {entry for entry in os.listdir(self.service.HISTORY_DIR) if entry.endswith(self.service.WORKBOOK_META)}
        before = noted()
        self.upload(workbook(10, months=(3,)), 'Köhnə kitab.xlsx')
        notes = sorted(noted() - before)
        self.assertEqual(len(notes), 1)
        with open(os.path.join(self.service.HISTORY_DIR, notes[0]), encoding='utf-8') as note:
            self.assertEqual({key: value for key, value in json.load(note).items() if key in ('file', 'lines', 'years')},
                             dict(file='Köhnə kitab.xlsx', lines=1, years=[2025]))
        kept = [entry for entry in os.listdir(self.service.HISTORY_DIR) if self.service.is_workbook(entry)]
        # A hundred and more later steps: the figures' copies go, the workbooks and their notes stay.
        for step in range(self.service.KEEP + 5):
            self.service.keep(f'{self.service.new_stamp(datetime.datetime.now(self.service.BAKU))}-deyisiklik.json', b'{}')
        self.service.prune()
        left = os.listdir(self.service.HISTORY_DIR)
        for entry in kept:
            self.assertIn(entry, left)
            self.assertIn(entry + self.service.WORKBOOK_META, left)
        self.assertLessEqual(len([entry for entry in left if entry.endswith('-deyisiklik.json')]), self.service.KEEP)


if __name__ == '__main__':
    unittest.main()
