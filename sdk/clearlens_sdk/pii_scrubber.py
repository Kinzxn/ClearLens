import re
from presidio_analyzer import AnalyzerEngine
from presidio_anonymizer import AnonymizerEngine

analyzer = AnalyzerEngine()
anonymizer = AnonymizerEngine()

FIELDS_TO_ALWAYS_DROP = ["name", "full_name", "email", "phone", "ssn", "national_id", "passport"]

def scrub(decision: dict) -> dict:
    """
    Remove PII from decision dict before publishing.
    Always drop known PII fields.
    Run Presidio on string values to catch unexpected PII.
    """
    cleaned = {}
    for key, value in decision.items():
        if key.lower() in FIELDS_TO_ALWAYS_DROP:
            continue
        if isinstance(value, str):
            results = analyzer.analyze(text=value, language="en")
            if results:
                continue  # Drop field entirely if PII detected
        cleaned[key] = value
    return cleaned
