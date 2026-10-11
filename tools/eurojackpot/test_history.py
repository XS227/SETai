import datetime as dt
import json
import unittest
from pathlib import Path
import update_history as importer

class HistoryTests(unittest.TestCase):
    def setUp(self):
        history = Path(__file__).with_name('history.js')
        if not history.exists():
            history = Path(__file__).resolve().parents[2] / 'EuroJackpot' / 'history.js'
        text = history.read_text()
        self.rows = [r for r in json.loads(text.split('=', 1)[1].strip().rstrip(';'))['draws'] if r['date'] <= '2026-10-09']
    def test_complete(self):
        self.assertEqual(len(importer.validate(self.rows,dt.date(2026,10,11))),997)
    def test_missing_draw_is_rejected(self):
        with self.assertRaisesRegex(ValueError,'Missing scheduled draws'):
            importer.validate(self.rows[:400]+self.rows[401:],dt.date(2026,10,11))
    def test_conflict_is_rejected(self):
        conflicting=dict(self.rows[0],main=[1,2,3,4,5])
        with self.assertRaisesRegex(ValueError,'Conflicting source rows'):
            importer.validate(self.rows+[conflicting],dt.date(2026,10,11))
    def test_future_rejected(self):
        with self.assertRaisesRegex(ValueError,'future result'):
            importer.validate(self.rows,dt.date(2026,10,1))
    def test_invalid_number(self):
        invalid=dict(self.rows[0],stars=[1,9])
        with self.assertRaisesRegex(ValueError,'Invalid stars'):
            importer.validate([invalid]+self.rows[1:],dt.date(2026,10,11))
if __name__=='__main__':
    unittest.main()
