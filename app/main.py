import os
from typing import Dict
import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, Form
from fastapi.responses import HTMLResponse
from fastapi.exceptions import HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.middleware.cors import CORSMiddleware

# Get domain from environment variable or use default
HOSTNAME = os.getenv('HOSTNAME', '<your_domain>')

# Initialize templates
templates = Jinja2Templates(directory="static")

app = FastAPI(
    version="1.0.0",
    docs_url=None,  # Disable Swagger UI
    redoc_url=None  # Disable ReDoc
)

# Mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Replace the existing root endpoint
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"HOSTNAME": HOSTNAME}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_connections: Dict[str, WebSocket] = {}

@app.get("/ping")
async def ping():
    return {"message": "pong"}

@app.get("/version")
async def version():
    return {"version": app.version}

@app.post("/webhook")
async def ko_fi_webhook(data: str = Form(...)):
    """Handle incoming Ko-fi webhook data and forward it to connected WebSocket clients."""
    webhook_data = json.loads(data)
    verification_token = webhook_data.get('verification_token')
    if not verification_token:
        raise HTTPException(status_code=400, detail="Missing verification_token")
    if verification_token in active_connections:
        websocket = active_connections[verification_token]
        for _ in range(3):  # Try 3 times
            try:
                await websocket.send_json(webhook_data)
                break
            except WebSocketDisconnect:
                if verification_token in active_connections:
                    del active_connections[verification_token]
                break
            except (ConnectionError, RuntimeError):
                await asyncio.sleep(1)
        else:
            if verification_token in active_connections:
                await websocket.close()
                del active_connections[verification_token]
    return {"status": "success"}

@app.websocket("/ws/{verification_token}")
async def websocket_endpoint(websocket: WebSocket, verification_token: str):
    await websocket.accept()
    active_connections[verification_token] = websocket
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
            # Keep connection alive
    except WebSocketDisconnect:
        if verification_token in active_connections:
            del active_connections[verification_token]