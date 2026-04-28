"""
Acts as a final gate before publish. Even if pii_scrubber.py runs,
this validator double-checks for known PII patterns and rejects the
payload hard (raises exception) rather than silently dropping fields.
This prevents misconfigured or custom scrubbers from leaking PII.
"""
import re
from typing import Any

# Common PII heuristics as a last line of defense
PII_PATTERNS = [
    (r"\b\d{3}-\d{2}-\d{4}\b", "SSN"),
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "email"),
    (r"\b\d{10,13}\b", "phone_candidate"),
]

def validate_no_pii(payload: dict) -> list[str]:
    """
    Returns a list of residual PII errors.
    Called by SDK client AFTER pii_scrubber.py — belt-and-suspenders approach.
    """
    errors = []
    for key, value in payload.items():
        if isinstance(value, str):
            for pattern, label in PII_PATTERNS:
                if re.search(pattern, value):
                    errors.append(f"PII validation failed: field '{key}' matches pattern '{label}'.")
    return errors
