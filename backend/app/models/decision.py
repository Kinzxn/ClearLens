from pydantic import BaseModel
from datetime import datetime

class DecisionEvent(BaseModel):
    decision:          bool
    sensitive_attrs:   dict[str, str]
    prediction_score:  float | None = None  # stored for What-If simulator
    model_version:     str = "unknown"       # [NEW] e.g. "v1.3.2"
    timestamp:         datetime
    org_id:            str
