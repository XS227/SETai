import importlib.util
from pathlib import Path
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "keno_update.py"
spec = importlib.util.spec_from_file_location("keno_update", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class KenoArchiveTests(unittest.TestCase):
    def test_normalize_20_unique_in_range(self):
        row = module.normalize_record("2026-01-03", list(range(20, 0, -1)))
        self.assertEqual(row["numbers"], list(range(1, 21)))

    def test_reject_duplicate_or_out_of_range(self):
        with self.assertRaises(ValueError):
            module.normalize_record("2026-01-03", [1] * 20)
        with self.assertRaises(ValueError):
            module.normalize_record("2026-01-03", list(range(1, 20)) + [71])
        with self.assertRaises(ValueError):
            module.normalize_record("2026-01-03", list(range(1, 20)))

    def test_parser_year_filters_and_reads_20_numbers(self):
        spans = "".join(f'<span class="ball" data-value="{n}">{n}</span>' for n in range(1, 21))
        html = f'<section aria-labelledby="month-1"><ul><li><time datetime="2026-01-03">Jan 3</time><span class="archive-numbers">{spans}</span></li></ul></section>'
        draws = module.parse_archive_year(html, 2026)
        self.assertEqual(draws, [{"date": "2026-01-03", "numbers": list(range(1, 21))}])
        with self.assertRaises(ValueError):
            module.parse_archive_year(html, 2025)

    def test_merge_is_monotonic_and_refuses_revisions(self):
        older = [module.normalize_record("2026-01-01", list(range(1, 21)))]
        newer = [module.normalize_record("2026-01-02", list(range(21, 41)))]
        self.assertEqual(len(module.merge_draws(older, newer)), 2)
        contradictory = [module.normalize_record("2026-01-01", list(range(22, 42)))]
        with self.assertRaisesRegex(ValueError, "DISCREPANCY"):
            module.merge_draws(older, contradictory)

    def test_reject_unsorted_and_duplicate_dates(self):
        a = module.normalize_record("2026-01-01", list(range(1, 21)))
        with self.assertRaises(ValueError):
            module.validate_archive([a, a])
        with self.assertRaises(ValueError):
            module.validate_archive([dict(a, numbers=list(reversed(a["numbers"])))])


if __name__ == "__main__":
    unittest.main()
