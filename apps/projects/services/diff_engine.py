"""Simple diff engine placeholder."""

from typing import List, Tuple


def generate_diff(base_content: str, proposed_content: str) -> List[Tuple[str, str]]:
    """Return a naive line-by-line diff tuple list."""
    base_lines = base_content.splitlines()
    proposed_lines = proposed_content.splitlines()
    return list(zip(base_lines, proposed_lines))
