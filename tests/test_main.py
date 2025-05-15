import json
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket, WebSocketDisconnect

from app.main import app


@pytest.fixture
def client():
    """Create a test client fixture."""
    return TestClient(app)


@pytest.fixture
def sample_webhook_data():
    """Create a sample webhook data fixture."""
    return {
        "verification_token": "test_token",
        "message_id": "123",
        "timestamp": datetime.now().isoformat(),
        "type": "Donation",
        "is_public": True,
        "from_name": "Test User",
        "message": "Test message",
        "amount": "10.00",
        "url": "http://test.com",
        "email": "test@test.com",
        "currency": "USD",
        "is_subscription_payment": False,
        "is_first_subscription_payment": False,
        "kofi_transaction_id": "123456",
        "shop_items": None,
        "tier_name": None,
        "shipping": None
    }


def test_webhook_without_active_connection(client, sample_webhook_data):
    """Test webhook endpoint without active WebSocket connection."""
    response = client.post(
        "/webhook",
        data={'data': json.dumps(sample_webhook_data)}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_websocket_connection():
    """Test basic WebSocket connection functionality."""
    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"


@pytest.mark.asyncio
async def test_webhook_with_active_connection(client, sample_webhook_data):
    """Test webhook endpoint with active WebSocket connection."""
    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        sample_webhook_data["verification_token"] = "test_token"
        sample_webhook_data["timestamp"] = datetime.now().isoformat()
        response = client.post(
            "/webhook",
            data={'data': json.dumps(sample_webhook_data)}
        )
        assert response.status_code == 200


def test_shop_order_webhook(client, sample_webhook_data):
    """Test shop order webhook."""
    response = client.post(
        "/webhook",
        data={'data': json.dumps(sample_webhook_data)}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


@pytest.mark.asyncio
async def test_websocket_disconnect():
    """Test WebSocket disconnect."""
    disconnected = False
    try:
        with TestClient(app).websocket_connect("/ws/test_token") as websocket:
            websocket.send_text("ping")
            assert websocket.receive_text() == "pong"
            websocket._client.close()
            websocket.send_text("ping")
    except Exception as e:
        disconnected = True

    assert disconnected, "Expected websocket to disconnect"


@pytest.mark.asyncio
async def test_webhook_connection_error_retry(client, sample_webhook_data):
    """Test webhook retry mechanism on connection errors."""
    error_count = 0
    original_send_json = WebSocket.send_json

    async def mock_send_json(*args, **kwargs):
        nonlocal error_count
        error_count += 1
        if error_count <= 2:
            raise RuntimeError("Simulated connection error")
        return await original_send_json(*args, **kwargs)

    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        WebSocket.send_json = mock_send_json
        try:
            sample_webhook_data["verification_token"] = "test_token"
            response = client.post(
                "/webhook",
                data={'data': json.dumps(sample_webhook_data)}
            )
            assert response.status_code == 200
            assert error_count > 1
        finally:
            WebSocket.send_json = original_send_json


@pytest.mark.asyncio
async def test_webhook_max_retries_exceeded(client, sample_webhook_data):
    """Test webhook max retries exceeded."""
    async def mock_send_json(*args, **kwargs):
        raise RuntimeError("Simulated connection error")

    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        original_send_json = WebSocket.send_json
        WebSocket.send_json = mock_send_json
        try:
            sample_webhook_data["verification_token"] = "test_token"
            response = client.post(
                "/webhook",
                data={'data': json.dumps(sample_webhook_data)}
            )
            assert response.status_code == 200
            from app.main import active_connections
            assert "test_token" not in active_connections
        finally:
            WebSocket.send_json = original_send_json


@pytest.mark.asyncio
async def test_webhook_websocket_disconnect(client, sample_webhook_data):
    """
    Tests that when a WebSocket disconnect occurs during webhook processing, the connection is removed from active connections.
    
    Opens a WebSocket connection, mocks the send_json method to raise a disconnect, posts webhook data, and verifies the connection is cleaned up.
    """
    async def mock_send_json(*args, **kwargs):
        raise WebSocketDisconnect()

    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        original_send_json = WebSocket.send_json
        WebSocket.send_json = mock_send_json
        try:
            sample_webhook_data["verification_token"] = "test_token"
            response = client.post(
                "/webhook",
                data={'data': json.dumps(sample_webhook_data)}
            )
            assert response.status_code == 200
            from app.main import active_connections
            assert "test_token" not in active_connections
        finally:
            WebSocket.send_json = original_send_json


def test_version_endpoint(client):
    """
    Tests that the /version endpoint returns the correct application version.
    
    Sends a GET request to /version and asserts the response status is 200 and the JSON
    payload contains the expected version string.
    """
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json() == {"version": app.version}


def test_webhook_missing_verification_token(client):
    """Test webhook endpoint with missing verification token."""
    invalid_data = {
        "message_id": "123",
        "timestamp": datetime.now().isoformat(),
        "type": "Donation"
    }
    response = client.post(
        "/webhook",
        data={'data': json.dumps(invalid_data)}
    )
    assert response.status_code == 400
    assert "Missing verification_token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_multiple_websocket_connections():
    """Test multiple WebSocket connections with the same token."""
    with TestClient(app).websocket_connect("/ws/test_token") as ws1:
        with TestClient(app).websocket_connect("/ws/test_token") as ws2:
            ws1.send_text("ping")
            ws2.send_text("ping")
            assert ws1.receive_text() == "pong"
            assert ws2.receive_text() == "pong"
