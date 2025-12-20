import json
from typing import Tuple


def propose_content_json_update(before_text: str, key: str, value: str) -> Tuple[str, str]:
    data = json.loads(before_text)
    data[key] = value
    after_text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    return before_text, after_text
