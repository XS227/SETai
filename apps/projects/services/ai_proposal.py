"""AI proposal utilities."""

from dataclasses import dataclass
from typing import Any, Dict


def generate_proposal(prompt: str) -> Dict[str, Any]:
    """Return a placeholder proposal for the given prompt."""
    return {"prompt": prompt, "proposal": "This is a proposed change."}


@dataclass
class ParsedCommand:
    target_key: str
    new_value: str


def simple_rule_based_parser(command: str) -> ParsedCommand:
    """
    Extremely small helper to extract a target key and value from a natural-language command.

    Examples:
        "title: Welcome" -> target_key="title", new_value="Welcome"
        "headline = Hello" -> target_key="headline", new_value="Hello"
        "Just update the hero copy" -> target_key="content", new_value="Just update the hero copy"
    """
    if ":" in command:
        key, value = command.split(":", 1)
        return ParsedCommand(target_key=key.strip(), new_value=value.strip())

    if "=" in command:
        key, value = command.split("=", 1)
        return ParsedCommand(target_key=key.strip(), new_value=value.strip())

    return ParsedCommand(target_key="content", new_value=command.strip())
