from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any
from app.stream.server_pii_guard import server_side_pii_check

router = APIRouter()

class DecisionPayload(BaseModel):
    decision: bool
    sensitive_attrs: dict[str, str]
    timestamp: str
    org_id: str
    # other arbitrary fields captured
    raw_data: dict[str, Any]

@router.post("/ingest")
async def ingest_decision(payload: DecisionPayload):
    # Server-side defense-in-depth PII scan
    pii_flags = server_side_pii_check(payload.raw_data)
    if pii_flags:
        # In real life: await audit_trail.log_pii_rejection(org_id, pii_flags)
        raise HTTPException(
            status_code=422,
            detail={
                "error": "PII_DETECTED_SERVER_SIDE",
                "fields": pii_flags,
                "message": "Payload rejected. Update your SDK pii_scrubber configuration.",
            }
        )
    
    # ... proceed to Pub/Sub publish or stream processor
    return {"status": "accepted"}
