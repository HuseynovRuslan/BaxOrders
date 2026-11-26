"""
The kept workbooks (owner, 2026-11-25): every upload is kept for good, beside a note of its name, lines and years. The service runs here on a free port with its data and history in a temporary folder; the
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

    def test_the_workbooks_outlive_the_hundred_steps_with_their_notes(self):
        self.upload(workbook(10, months=(3,)), 'Köhnə kitab.xlsx')
        notes = [entry for entry in os.listdir(self.service.HISTORY_DIR) if entry.endswith(self.service.WORKBOOK_META)]
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
