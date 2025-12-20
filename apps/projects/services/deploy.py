import httpx


def trigger_deploy(webhook_url: str) -> None:
    if not webhook_url:
        return
    with httpx.Client(timeout=10.0) as client:
        client.post(webhook_url, json={"source": "setai"})
