import re

def server_side_pii_check(payload: dict) -> list[str]:
    """
    Defense-in-depth PII check run on the server side.
    Returns a list of fields that contain suspected PII.
    """
    PII_PATTERNS = [
        (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
        (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "email"),
        (r"\b\d{10,13}\b", "phone_candidate"),
    ]
    flags = []
    for key, value in payload.items():
        if isinstance(value, str):
            for pattern, label in PII_PATTERNS:
                if re.search(pattern, value):
                    flags.append(key)
    return flags
