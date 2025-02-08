"""
Ko-fi WebSocket Bridge

This module implements a FastAPI-based WebSocket bridge for Ko-fi webhooks. It serves
as an intermediary that receives Ko-fi donation webhooks and forwards them to connected
clients via WebSocket connections.

Key Features:
- Receives and validates Ko-fi webhook notifications
- Maintains WebSocket connections with clients
- Forwards webhook data to corresponding clients based on verification tokens
- Implements connection health checks via ping/pong mechanism
- Provides basic API endpoints for status and version information

The bridge uses verification tokens to manage and authenticate WebSocket connections,
ensuring webhook data is delivered to the correct client.

For webhook format details, see:
https://help.ko-fi.com/hc/en-us/articles/360004162298-Does-Ko-fi-have-an-API-or-webhook
"""

import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Form
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.exceptions import HTTPException
from starlette.middleware.cors import CORSMiddleware

active_connections: dict[str, WebSocket] = {}

app = FastAPI(
    version="1.0.5-beta-v3",
    docs_url=None,  # Disable Swagger UI
    redoc_url=None  # Disable ReDoc
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", response_class=HTMLResponse)
async def root():
    """
    Returns the home page of the application, which explains the purpose
    and functionalities of the Ko-fi WebSocket bridge.
    """
    return FileResponse("static/index.html")

@app.get("/favicon.ico")
async def _favicon():
    return FileResponse("static/favicon.ico")

@app.get("/logo.png")
async def _logo():
    return FileResponse("static/kofi-websocket-logo.png")

@app.get("/icon.png")
async def _icon():
    return FileResponse("static/kofi-websocket-icon.png")

@app.get("/ping")
async def _ping():
    return {"message": "pong"}


@app.get("/version")
async def _version():
    return {"version": app.version}


@app.post("/webhook")
async def ko_fi_webhook(data: str = Form(...)):
    """
    Handles incoming webhooks from Ko-fi.

    This endpoint expects a JSON payload with the following structure that
    follows the Ko-fi webhook format:
    https://help.ko-fi.com/hc/en-us/articles/360004162298-Does-Ko-fi-have-an-API-or-webhook#h_01HP1SMJAKE2HQ82A5011Z5648

    The Ko-fi WebSocket bridge will attempt to forward the webhook data to the
    corresponding WebSocket connection. If the connection is not established or
    the connection is closed, the bridge will return a 400 error with the detail
    "Connection closed or not established".
    """
    webhook_data = json.loads(data)
    verification_token = webhook_data.get('verification_token')
    if not verification_token:
        raise HTTPException(
            status_code=400, detail="Missing verification_token")
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
    """
    Establishes a WebSocket connection with the client and forwards incoming
    Ko-fi webhooks to the corresponding connection.

    The endpoint expects a verification token as a path parameter, which is used
    to identify the connection. The endpoint will keep the connection alive by
    sending a "pong" response to the "ping" message sent by the client.

    If the connection is closed, the endpoint will remove the connection from the
    active connections dictionary.
    """
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
