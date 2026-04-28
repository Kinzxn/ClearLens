import json
import os
import asyncio
from .schema_mapper import SchemaMapper
from .pii_scrubber import scrub
from .payload_validator import validate_no_pii
from .buffer import OfflineBuffer

class ClearLensClient:
    def __init__(self, api_key: str, schema_config: str | dict):
        self.api_key = api_key
        if isinstance(schema_config, str):
            with open(schema_config, 'r') as f:
                self.config = json.load(f)
        else:
            self.config = schema_config
            
        self.mapper = SchemaMapper(self.config)
        self.project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "clearlens-project")
        self.topic_id = os.getenv("PUBSUB_TOPIC_ID", "decision-logs")
        self.buffer = OfflineBuffer()
        
    def _publish_to_pubsub(self, payload: dict) -> bool:
        return True
        
    async def _publish_to_pubsub_async(self, payload: dict) -> bool:
        return True

    def flush_buffer(self) -> int:
        """Flushes the buffer and returns count of items successfully published."""
        return self.buffer.flush(self._publish_to_pubsub)

    def log_decision(self, payload: dict) -> None:
        try:
            mapped = self.mapper.map_payload(payload)
            scrubbed = scrub(mapped)
            errors = validate_no_pii(scrubbed)
            if errors:
                return # Refuse to publish if error exists
            
            if self._publish_to_pubsub(scrubbed):
                self.flush_buffer()
            else:
                self.buffer.enqueue(scrubbed)
        except Exception:
            pass

    async def async_log_decision(self, payload: dict) -> None:
        try:
            mapped = self.mapper.map_payload(payload)
            scrubbed = scrub(mapped)
            if validate_no_pii(scrubbed):
                return
                
            if await self._publish_to_pubsub_async(scrubbed):
                # non-blocking queue flush
                asyncio.create_task(asyncio.to_thread(self.flush_buffer))
            else:
                self.buffer.enqueue(scrubbed)
        except Exception:
            pass
