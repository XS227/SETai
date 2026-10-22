"""Tests for isolation, authentication and public telemetry validation."""
import copy
import json
import pathlib
import tempfile
import time
import unittest
import urllib.error
import urllib.request

import relay


def sample(server='realgram'):
    stamp = int(time.time())
    return {'live': {'schema': 1, 'server_id': server, 'timestamp': stamp,
                     'cpu': {'percent': 42, 'cores': 1}, 'uptime_seconds': 100,
                     'load_average': [0.2, 0.3, 0.4],
                     'memory': {'total': 1000, 'used': 600, 'available': 400, 'percent': 60},
                     'swap': {'total': 2000, 'used': 200, 'percent': 10},
                     'disk': {'total': 10000, 'used': 6000, 'available': 4000, 'percent': 60},
                     'network': {'rx_bytes_per_second': 500, 'tx_bytes_per_second': 700},
                     'services': {'web': True, 'php': None}},
            'history': {'points': [{'timestamp': stamp, 'cpu': 42, 'memory': 60, 'rx': 500, 'tx': 700}]}}


class RelayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        token_file = pathlib.Path(cls.directory.name) / 'tokens.json'
        token_file.write_text(json.dumps({'realgram': 'a' * 64, 'biab': 'b' * 64}))
        cls.receiver = relay.start_receiver(token_file)

    @classmethod
    def tearDownClass(cls):
        cls.receiver.shutdown()
        cls.receiver.server_close()
        cls.directory.cleanup()

    def call(self, path, data=None, token=None):
        request = urllib.request.Request('http://127.0.0.1:9159' + path,
                                         data=json.dumps(data).encode() if data else None,
                                         headers={'Authorization': 'Bearer ' + token} if token else {})
        try:
            response = urllib.request.urlopen(request, timeout=2)
        except urllib.error.HTTPError as error:
            response = error
        return response.status, json.loads(response.read())

    def test_authenticated_ingestion_and_cross_server_isolation(self):
        self.assertEqual(self.call('/biab/live')[0], 503)
        self.assertEqual(self.call('/realgram', sample(), 'wrong-token')[0], 401)
        self.assertEqual(self.call('/biab', sample('biab'), 'a' * 64)[0], 401)
        payload = sample()
        payload['live']['private_key'] = 'must-never-be-relayed'
        self.assertEqual(self.call('/realgram', payload, 'a' * 64)[0], 200)
        code, live = self.call('/realgram/live')
        self.assertEqual(code, 200)
        self.assertEqual(live['server_id'], 'realgram')
        self.assertNotIn('private_key', live)
        self.assertEqual(self.call('/biab/live')[0], 503)
        self.assertEqual(self.call('/realgram', payload, 'a' * 64)[0], 409)
        self.assertEqual(self.call('/../tokens.json')[0], 404)

    def test_invalid_and_oversized_history_rejected(self):
        for mutate in [lambda p: p['live'].update(server_id='biab'),
                       lambda p: p['live']['cpu'].update(percent=float('nan')),
                       lambda p: p['live']['memory'].update(used=999999),
                       lambda p: p['live'].update(timestamp=int(time.time()) - 300),
                       lambda p: p['history'].update(points=p['history']['points'] * 181)]:
            payload = copy.deepcopy(sample())
            mutate(payload)
            self.assertEqual(self.call('/realgram', payload, 'a' * 64)[0], 400)


if __name__ == '__main__':
    unittest.main()
