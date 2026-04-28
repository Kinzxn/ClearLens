from fastapi import FastAPI, WebSocket
from app.routers import ingest, ground_truth, whatif, predeployment, report, transparency

app = FastAPI(title="ClearLens API")

app.include_router(ingest.router)
app.include_router(ground_truth.router)
app.include_router(whatif.router)
app.include_router(predeployment.router)
app.include_router(report.router)
app.include_router(transparency.router)

@app.websocket("/ws/metrics/{org_id}/{metric_name}")
async def websocket_endpoint(websocket: WebSocket, org_id: str, metric_name: str):
    await websocket.accept()
    # Real impl hooks into PubSub / Redis events
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except Exception:
        pass
