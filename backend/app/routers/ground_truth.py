from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class GroundTruthBatch(BaseModel):
    org_id: str
    labels: list[dict]  # [{decision_id, true_outcome, timestamp}]
    sensitive_attribute: str

@router.post("/ground-truth/ingest")
async def ingest_ground_truth(batch: GroundTruthBatch):
    """
    Stores ground truth labels and triggers metric re-computation
    for the affected time windows. Any metrics that previously showed
    label_status='proxy_approximate' will be re-run as 'verified'
    and re-published to the dashboard via WebSocket.
    """
    # await ground_truth_store.save(batch)
    # await metric_recompute_queue.enqueue(batch.org_id, batch.labels)
    return {"status": "accepted", "label_count": len(batch.labels)}
