import sqlite3
import json
import threading

class OfflineBuffer:
    def __init__(self, db_path="clearlens_buffer.sqlite"):
        self.db_path = db_path
        self.lock = threading.Lock()
        self._init_db()

    def _init_db(self):
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS decisions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        payload TEXT NOT NULL
                    )
                ''')

    def enqueue(self, payload: dict):
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    "INSERT INTO decisions (payload) VALUES (?)",
                    (json.dumps(payload),)
                )

    def flush(self, publish_callback) -> int:
        """
        Attempts to publish all buffered events. Returns number of flushed items.
        `publish_callback(payload) -> bool` indicating success.
        """
        flushed_count = 0
        with self.lock:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, payload FROM decisions")
                rows = cursor.fetchall()
                
                for row_id, payload_str in rows:
                    try:
                        if publish_callback(json.loads(payload_str)):
                            conn.execute("DELETE FROM decisions WHERE id = ?", (row_id,))
                            flushed_count += 1
                        else:
                            break # Assume network is down
                    except Exception:
                        break 
                conn.commit()
        return flushed_count
