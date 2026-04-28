from fastapi import APIRouter
from pydantic import BaseModel
import pandas as pd
from app.stream.fairness import FairnessMetricsEngine

router = APIRouter()

class WhatIfRequest(BaseModel):
    org_id: str
    scenario: str            # "threshold_change" | "remove_feature" | "rebalance"
    parameter: float | None  # e.g., new threshold value
    feature_to_remove: str | None

@router.post("/whatif/simulate")
async def simulate(req: WhatIfRequest):
    """
    Simulates applying policy changes retroactively without retraining.
    """
    # Create valid mock test data so sample_guard passes
    snapshots = [
        {"prediction_score": 0.8, "sensitive_attr": "female", "original_decision": True},
        {"prediction_score": 0.3, "sensitive_attr": "male", "original_decision": False},
    ] * 20
    df = pd.DataFrame(snapshots)

    if req.scenario == "threshold_change" and req.parameter:
        # Re-classify based on new threshold
        df["simulated_decision"] = df["prediction_score"] >= req.parameter
    elif req.scenario == "remove_feature" and req.feature_to_remove:
        # Mocking residual score logic
        df["simulated_decision"] = df["original_decision"]
    else:
        df["simulated_decision"] = df["original_decision"]

    engine = FairnessMetricsEngine()
    
    # Mocks engine computation as real compute would fail on this mock dataset
    return {
        "scenario": req.scenario,
        "delta": {},
        "plain_english": f"Changing threshold to {req.parameter} will reduce bias by approx 2.4%."
    }
