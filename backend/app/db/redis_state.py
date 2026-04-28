import json
import redis.asyncio as redis
from datetime import datetime, timedelta

class RollingWindowStore:
    """
    Redis-backed rolling window for metric history.
    Keys: clearlens:{org_id}:{metric}:{YYYY-MM-DD-HH}
    TTL:  8 days (covers 7-day window with 1-day buffer)
    """

    def __init__(self, redis_url: str):
        self.client = redis.from_url(redis_url)
        self.TTL_SECONDS = 8 * 24 * 3600

    async def append_snapshot(self, org_id: str, metric: str, value: float, ts: datetime):
        import json
        key = f"clearlens:{org_id}:{metric}"
        score = ts.timestamp()
        member = json.dumps({"value": value, "ts": ts.isoformat()})
        await self.client.zadd(key, {member: score})
        # Trim historical data
        cutoff = (ts - timedelta(days=8)).timestamp()
        await self.client.zremrangebyscore(key, '-inf', cutoff)
        await self.client.expire(key, self.TTL_SECONDS)

    async def get_window(self, org_id: str, metric: str, days: int = 7) -> list[dict]:
        """Returns all snapshots from the last `days` days."""
        import json
        now = datetime.utcnow()
        cutoff = (now - timedelta(days=days)).timestamp()
        key = f"clearlens:{org_id}:{metric}"
        members = await self.client.zrangebyscore(key, cutoff, '+inf')
        return [json.loads(m) for m in members]
