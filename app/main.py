from typing import Dict, List, Optional
import asyncio
from datetime import datetime
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(
    version="1.0.1",
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

active_connections: Dict[str, WebSocket] = {}


class ShopItem(BaseModel):
    direct_link_code: str
    variation_name: str
    quantity: int


class ShippingInfo(BaseModel):
    full_name: str
    street_address: str
    city: str
    state_or_province: str
    postal_code: str
    country: str
    country_code: str
    telephone: str


class KofiData(BaseModel):
    verification_token: str
    message_id: str
    timestamp: datetime
    type: str
    is_public: bool
    from_name: str
    message: Optional[str]
    amount: str
    url: str
    email: str
    currency: str
    is_subscription_payment: bool
    is_first_subscription_payment: bool
    kofi_transaction_id: str
    shop_items: Optional[List[ShopItem]]
    tier_name: Optional[str]
    shipping: Optional[ShippingInfo]

    model_config = {
        'json_schema_extra': {
            'json_encoders': {
                datetime: lambda v: v.isoformat()
            }
        }
    }


class KofiWebhook(BaseModel):
    data: KofiData


@app.get("/ping")
async def ping():
    return {"message": "pong"}


@app.get("/version")
async def version():
    return {"version": app.version}


@app.post("/webhook")
async def ko_fi_webhook(webhook_data: KofiWebhook):
    """Handle incoming Ko-fi webhook data and forward it to connected WebSocket clients."""
    verification_token = webhook_data.data.verification_token
    if verification_token in active_connections:
        websocket = active_connections[verification_token]
        for _ in range(3):  # Try 3 times
            try:
                # Use model_dump_json() to properly handle datetime serialization
                json_str = webhook_data.data.model_dump_json()
                webhook_json = json.loads(json_str)
                await websocket.send_json(webhook_json)
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
