import datetime as dt,json,unittest
from pathlib import Path
import fit_last50 as A
ROOT=Path(__file__).resolve().parents[2]
H=A.read_js(ROOT/'EuroJackpot/history.js')['draws']
R=json.loads((ROOT/'LotteryAudit/inverse-50-20261020.json').read_text())
class InverseAuditTests(unittest.TestCase):
 def test_all50_cutoffs_and_reproduced_models(self):
  self.assertEqual(len(R['draws']),50)
  self.assertEqual([r['date'] for r in R['draws']],[r['date'] for r in H if r['date']<='2026-10-20'][-50:])
  fixed_full=0;other_full=0;refit_full=0
  for row in R['draws']:
   self.assertEqual(row['cutoffDate'],A.cutoff(row['date']))
   self.assertLessEqual(row['available']['main']['asOf'],row['cutoffDate'])
   fixed={};refitted={}
   for field,n,k in A.POOLS:
    f,meta=A.features(H,field,n,k,row['cutoffDate']);self.assertEqual(meta,row['available'][field])
    m=R['model']['pools'][field];fixed[field]=A.select(A.expand(f,m['terms']),m['weights'],k);self.assertEqual(fixed[field],row['frozen'][field])
    fitted=row['answerRefit'][field]['fit'];self.assertIsNotNone(fitted);self.assertGreater(fitted['margin'],1e-7)
    refitted[field]=A.select(A.expand(f,fitted['terms']),fitted['weights'],k);self.assertEqual(refitted[field],row['actual'][field])
   score=A.hits(fixed,row['actual']);self.assertEqual(score,row['frozen']['hits']);fixed_full+=score['full'];other_full+=score['full'] and row['date']!='2026-10-20';refit_full+=A.hits(refitted,row['actual'])['full']
  self.assertEqual((fixed_full,other_full,refit_full),(1,0,50))
  self.assertEqual(R['summary']['frozenOtherDraws'],49)
 def test_future_results_do_not_enter_a_feature_snapshot(self):
  for field,n,k in A.POOLS:
   old,_=A.features(H,field,n,k,'2026-10-13')
   changed=[dict(r,main=[1,2,3,4,5],stars=[1,2]) if r['date']>'2026-10-13' else r for r in H]
   new,_=A.features(changed,field,n,k,'2026-10-13')
   self.assertTrue((old==new).all())
 def test_joint_common_weight_results_are_not_presented_as_success(self):
  for field in ['main','stars']:
   for m in R['jointFitWithOneCoefficientSet'][field]:self.assertFalse(m['all50StrictlySeparated']);self.assertLessEqual(m['maximumCommonMargin'],1e-7)
if __name__=='__main__':unittest.main()
