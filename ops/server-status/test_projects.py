import json
import pathlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from projects import ProjectMonitor
from relay import sanitize_projects


class ProjectTests(unittest.TestCase):
    def test_longest_root_owns_process_without_double_counting(self):
        with tempfile.TemporaryDirectory() as temp:
            parent = pathlib.Path(temp) / 'site'
            child = parent / 'nested'
            child.mkdir(parents=True)
            config = pathlib.Path(temp) / 'projects.json'
            config.write_text(json.dumps([{'id': 'parent', 'name': 'Parent', 'roots': [str(parent)], 'mode': 'static'},
                                          {'id': 'child', 'name': 'Child', 'roots': [str(child)]}]))
            process = subprocess.Popen(['/bin/sleep', '10'], cwd=child)
            try:
                with patch.object(ProjectMonitor, 'disk_worker', return_value=None):
                    monitor = ProjectMonitor(config)
                first = {row['id']: row for row in monitor.snapshot()['rows']}
                self.assertEqual(first['child']['processes'], 1)
                self.assertGreater(first['child']['memory_bytes'], 0)
                self.assertIsNone(first['child']['cpu_percent'])
                self.assertIsNone(first['parent']['memory_bytes'])
                self.assertEqual(first['parent']['status'], 'static')
                second = monitor.snapshot()
                clean = sanitize_projects(second)
                self.assertEqual(len(clean['rows']), 2)
                self.assertNotIn('roots', json.dumps(clean))
                self.assertNotIn(str(child), json.dumps(clean))
                clean['rows'][0]['cpu_percent'] = 101
                with self.assertRaises(ValueError):
                    sanitize_projects(clean)
            finally:
                process.terminate()
                process.wait(timeout=2)


if __name__ == '__main__':
    unittest.main()
