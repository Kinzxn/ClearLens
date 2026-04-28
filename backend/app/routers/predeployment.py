from fastapi import APIRouter, UploadFile
import pandas as pd
from app.stream.fairness import FairnessMetricsEngine
from app.stream.risk_score import BiasRiskScorer

router = APIRouter()

@router.post("/predeployment/test")
async def predeployment_test(file: UploadFile, sensitive_col: str, decision_col: str):
    """
    Accepts a CSV of model predictions + sensitive attributes.
    Runs full fairness metric suite.
    """
    try:
        # Prevent OOM loading massive malicious CSVs by capping at 100,000 rows
        df = pd.read_csv(file.file, nrows=100000)
    except Exception as e:
        return {"status": "error", "message": f"Failed to parse CSV: {e}"}
        
    engine = FairnessMetricsEngine()
    results = engine.compute(df, decision_col, sensitive_col)
    risk = BiasRiskScorer().compute(results, drift_rate=0, z_score=0)
    return {
        "status":    "pre_deployment_test_complete",
        "metrics":   results,
        "risk_score": risk,
        "recommendation": (
            "Safe to deploy" if risk["score"] < 20
            else "Bias detected — address before deployment"
        ),
    }
