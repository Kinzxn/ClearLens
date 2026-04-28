import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / "sdk"))

import time
import random
from clearlens_sdk.client import ClearLensClient

client = ClearLensClient(api_key="demo_key", schema_config={
  "decision_field": "loan_approved",
  "decision_positive_value": True,
  "sensitive_attributes": ["applicant_gender", "applicant_zip"],
  "timestamp_field": "timestamp",
  "proxy_attributes": ["applicant_zip"],
  "domain": "lending"
})

def generate_decision(bias_level: float = 0.0) -> dict:
    gender = random.choice(["male", "female"])
    credit_score = random.randint(580, 800)
    base_approval = credit_score > 680

    if gender == "female" and random.random() < bias_level:
        approval = False
    else:
        approval = base_approval

    return {
        "loan_approved": approval,
        "applicant_gender": gender,
        "applicant_zip": random.choice(["10001", "10002", "10003"]),
        "credit_score": credit_score,
        "timestamp": "2026-03-30T10:45:00Z"
    }

def run_demo():
    print("--- Phase 1: Fair System ---")
    for _ in range(50):
        client.log_decision(generate_decision(0.0))
        
    print("--- Phase 2: Slow Drift ---")
    for _ in range(50):
        client.log_decision(generate_decision(0.3))
        
    print("--- Phase 3: Critical Spike ---")
    for _ in range(20):
        client.log_decision(generate_decision(0.8))

if __name__ == "__main__":
    run_demo()
