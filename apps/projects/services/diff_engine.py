"""Simple diff engine utilities."""

import json
from dataclasses import dataclass
from typing import List, Tuple


@dataclass
class Proposal:
    path: str
    before_text: str
    after_text: str


def generate_diff(base_content: str, proposed_content: str) -> List[Tuple[str, str]]:
    """Return a naive line-by-line diff tuple list."""
    base_lines = base_content.splitlines()
    proposed_lines = proposed_content.splitlines()
    return list(zip(base_lines, proposed_lines))


def propose_content_json_update(before_text: str, key: str, value: str) -> Tuple[str, str]:
    data = json.loads(before_text)
    data[key] = value
    after_text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    return before_text, after_text
