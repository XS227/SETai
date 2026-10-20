import datetime as dt
import unittest
from pathlib import Path
import update_research as R

class ResearchTests(unittest.TestCase):
 def test_pending_prizes_may_complete_but_known_values_stay_frozen(self):
  before={'date':'2026-10-16','main':[12,24,25,29,45],'stars':[1,9],'prizes':[{'rank':1,'winningRows':None,'amount':None}]}
  after={**before,'prizes':[{'rank':1,'winningRows':0,'amount':11398476.48}]}
  changes=R.completed_fields(before,after)
  self.assertEqual(len(changes),2);self.assertEqual(changes[0]['before'],None)
  self.assertEqual(R.completed_fields(after,after),[])
  with self.assertRaises(ValueError):R.completed_fields(after,before)
  with self.assertRaises(ValueError):R.completed_fields(after,{**after,'stars':[1,8]})
  with self.assertRaises(ValueError):R.completed_fields(after,{**after,'prizes':[{'rank':1,'winningRows':1,'amount':11398476.48}]})
 def test_money_and_counts(self):
  self.assertEqual(R.money('120.000.000,00',True),120000000)
  self.assertEqual(R.count('Jackpot'),0)
  self.assertIsNone(R.count('--'))
  self.assertIsNone(R.money('unbesetzt'))
  with self.assertRaises(ValueError):R.money('broken')
 def test_known_before_cutoff(self):
  html='Ergebnisse vom Freitag, den 09.10.2026 <!-- Start MegaJackpot-Anzeige --><p class="prize-level__date">Dienstag</p><p class="prize-level__sum">120</p>Mio.<!-- End MegaJackpot-Anzeige -->'
  draws=[{'date':'2026-10-09'}]
  early=dt.datetime(2026,10,11,23,tzinfo=dt.timezone.utc)
  ann=R.announcement(html,draws,early)
  self.assertEqual(ann['drawDate'],'2026-10-13');self.assertEqual(ann['amountEUR'],120000000)
  self.assertIsNone(R.announcement(html,draws,dt.datetime(2026,10,13,17,tzinfo=dt.timezone.utc)))
  self.assertIsNone(R.announcement(html,[{'date':'2026-10-06'}],early))
if __name__=='__main__':unittest.main()
