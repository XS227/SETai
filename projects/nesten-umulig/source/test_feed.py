"""Meaningful checks for the public data boundary and discontinuities."""
import os,unittest,copy,json
os.environ.setdefault('SETAEI_OBSERVATION_FILE','/tmp/test-input-not-used.json')
from feed import build

def job(attempts=100,updated='2026-10-24T15:00:00Z',started='2026-10-24T14:00:00Z'):
    h=[0]*161;h[80]=100
    return {'attempts':str(attempts),'updated':updated,'started':started,'state':'running',
      'prefix':'0'*40,'publicKey':'DO_NOT_PUBLISH_PUBLIC_KEY','accessHash':'DO_NOT_PUBLISH_ACCESS_HASH','privateKey':'DO_NOT_PUBLISH_PRIVATE_KEY',
      'stats':{'samples':100,'histogram':h,'sinceAttempt':'1','bestMatchedBits':999,'exactMatches':999}}

class PublicFeedTests(unittest.TestCase):
    agent={'serviceActive':True,'cpuQuotaPercent':11}
    def export(self,j,old=None):return build(j,old,self.agent,'2026-10-24T15:01:00Z')
    def test_allowlist_and_no_source_mutation(self):
        j=job();before=copy.deepcopy(j);o=self.export(j);text=json.dumps(o)
        self.assertEqual(j,before)
        for forbidden in ['DO_NOT_PUBLISH','prefix','publicKey','privateKey','accessHash']:
            self.assertNotIn(forbidden,text)
        self.assertEqual(o['stats']['bestMatchedBits'],80)
        self.assertEqual(o['stats']['exactMatches'],0)
        self.assertEqual(o['stats']['totalMatchedBits'],8000)
    def test_counter_precision_is_preserved(self):
        n=2**70+3
        self.assertEqual(self.export(job(n))['attempts'],str(n))
    def test_measured_rate_requires_two_checkpoints(self):
        first=self.export(job());self.assertIsNone(first['measuredRate'])
        second=self.export(job(300,'2026-10-24T15:00:20Z'),first)
        self.assertEqual(second['measuredRate'],10)
        again=self.export(job(300,'2026-10-24T15:00:20Z'),second)
        self.assertEqual(len(again['series']),2)
    def test_reboot_gap_and_counter_reset_not_fabricated(self):
        first=self.export(job())
        second=self.export(job(200,'2026-10-24T15:00:20Z'),first)
        reset=self.export(job(50,'2026-10-24T15:00:40Z'),second)
        self.assertTrue(reset['series'][-1]['discontinuity']);self.assertIsNone(reset['measuredRate'])
        after=self.export(job(70,'2026-10-24T15:01:00Z'),reset)
        self.assertEqual(after['measuredRate'],1)
        gap=self.export(job(500,'2026-10-24T15:20:00Z'),after)
        self.assertTrue(gap['series'][-1]['discontinuity']);self.assertIsNone(gap['measuredRate'])
    def test_bad_histogram_fails_closed(self):
        j=job();j['stats']['samples']=101
        with self.assertRaises(ValueError):self.export(j)
    def test_cpu_percentage_uses_real_elapsed_usage(self):
        old=build(job(),None,dict(self.agent,cpuTotalNanoseconds='100000000000',memoryMiB=55,memoryLimitMiB=160),'2026-10-24T15:00:00Z')
        current=build(job(300,'2026-10-24T15:00:20Z'),old,dict(self.agent,cpuTotalNanoseconds='102000000000',memoryMiB=56,memoryLimitMiB=160),'2026-10-24T15:00:20Z')
        self.assertEqual(current['agent']['cpuPercent'],10)
        self.assertEqual(current['instantRate'],10)
        self.assertEqual(current['agent']['memoryMiB'],56)
        restarted=build(job(400,'2026-10-24T15:00:40Z'),current,dict(self.agent,cpuTotalNanoseconds='100'),'2026-10-24T15:00:40Z')
        self.assertIsNone(restarted['agent']['cpuPercent'])

if __name__=='__main__':unittest.main()
