from dataclasses import dataclass


@dataclass
class AIResult:
    target_key: str
    new_value: str


def simple_rule_based_parser(command: str) -> AIResult:
    c = command.lower()

    if "opening" in c or "åpning" in c:
        # MVP: store the full command as value; refine later
        return AIResult("opening_hours", command.strip())

    if "email" in c or "epost" in c or "e-post" in c:
        return AIResult("contact_email", command.split()[-1])

    if "banner" in c or "announcement" in c or "tilbud" in c:
        return AIResult("homepage_banner", command.strip())

    return AIResult("homepage_banner", command.strip())
