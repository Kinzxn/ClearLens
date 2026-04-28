from fastapi import APIRouter, HTTPException
from app.db.firestore import firestore

router = APIRouter()

@router.get("/public/{org_slug}")
async def public_scorecard(org_slug: str):
    """
    Only available if org.transparency_enabled == True (opt-in).
    Returns pre-aggregated, privacy-safe data only — no raw metrics,
    no group breakdowns below minimum threshold.
    """
    org = await firestore.get_org_by_slug(org_slug)
    if not org or not org.transparency_enabled:
        raise HTTPException(404, "Transparency page not enabled")
    return await firestore.get_public_scorecard(org.id)
