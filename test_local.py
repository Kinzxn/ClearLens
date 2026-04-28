import pandas as pd
import numpy as np
import asyncio

# Setup mock for presidio to avoid spacy dependency issues locally
import sys
from unittest import mock
sys.modules['presidio_analyzer'] = mock.MagicMock()
sys.modules['presidio_anonymizer'] = mock.MagicMock()
sys.modules['redis'] = mock.MagicMock()
sys.modules['redis.asyncio'] = mock.MagicMock()

from app.stream.fairness import FairnessMetricsEngine
from app.stream.drift import DriftDetector
from app.stream.anomaly import SpikeDetector

def run_test():
    print("=== ClearLens Project Test Run ===")
    
    # 1. Test Fairness metrics with contradictions
    df = pd.DataFrame({
        "credit_decision": [1]*50 + [0]*50 + [1]*10 + [0]*90,
        "applicant_group": ["Majority"]*100 + ["Minority"]*100,
        "ground_truth": [1]*40 + [0]*60 + [1]*5 + [0]*95
    })
    
    engine = FairnessMetricsEngine()
    print("\n[1] Running FairnessMetricsEngine...")
    results = engine.compute(df, "credit_decision", "applicant_group", "ground_truth")
    print("Computing metrics on test DataFrame (n=200)")
    for key, val in results.items():
        if isinstance(val, dict) and "value" in val:
            print(f" - {key}: {val['value']} (Status: {val.get('status', val.get('label_status'))})")
            if "plain_english" in val:
                print(f"   -> {val['plain_english']}")
        elif key == "contradictions" and val:
            print(f"\n[! CONTRADICTION TRIGGERED !]")
            print(f"   {val[0]['explanation']}")
            print(f"   {val[0]['recommendation']}")
            
            
    # 2. Test Anomaly detection (Isolation Forest)
    print("\n[2] Running IsolationForest Spike Detector...")
    spike = SpikeDetector()
    history = [10, 11, 10, 12, 10, 11, 11, 10, 11, 9] * 5 # history of 50
    res = spike.detect(current_value=40, history=history)
    print(f"Current Value: 40, Recent Mean: {res['mean_val']}, Score: {res['anomaly_score']}")
    print(res["plain_english"])
    
    # 3. Test SDK Buffer
    print("\n[3] Testing SDK Offline Buffer...")
    from clearlens_sdk.buffer import OfflineBuffer
    buf = OfflineBuffer("test_buffer.db")
    buf.enqueue({"id": 1, "test": "payload1"})
    buf.enqueue({"id": 2, "test": "payload2"})
    
    def my_publisher(p):
        print(f"Mock publishing: {p}")
        return True
        
    f_count = buf.flush(my_publisher)
    print(f"Successfully flushed {f_count} buffered items!")
    
if __name__ == "__main__":
    run_test()
