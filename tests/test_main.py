import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket, WebSocketDisconnect
from datetime import datetime
import json
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_webhook_data():
    # Remove the outer "data" wrapper since the endpoint expects the inner object directly
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
    response = client.post(
        "/webhook", 
        data={'data': json.dumps(sample_webhook_data)}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_websocket_connection():
    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_text()
        assert data == "pong"


@pytest.mark.asyncio
async def test_webhook_with_active_connection(client, sample_webhook_data):
    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        sample_webhook_data["verification_token"] = "test_token"
        sample_webhook_data["timestamp"] = datetime.now().isoformat()
        response = client.post(
            "/webhook", 
            data={'data': json.dumps(sample_webhook_data)}
        )
        assert response.status_code == 200


def test_shop_order_webhook(client, sample_webhook_data):
    response = client.post(
        "/webhook", 
        data={'data': json.dumps(sample_webhook_data)}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


@pytest.mark.asyncio
async def test_websocket_disconnect():
    disconnected = False
    try:
        with TestClient(app).websocket_connect("/ws/test_token") as websocket:
            # First ensure the connection is working
            websocket.send_text("ping")
            assert websocket.receive_text() == "pong"

            # Close the websocket
            websocket._client.close()

            # Try to send after close
            websocket.send_text("ping")
    except Exception as e:
        disconnected = True

    assert disconnected, "Expected websocket to disconnect"


@pytest.mark.asyncio
async def test_webhook_connection_error_retry(client, sample_webhook_data):
    error_count = 0
    original_send_json = WebSocket.send_json

    async def mock_send_json(*args, **kwargs):
        nonlocal error_count
        error_count += 1
        if error_count <= 2:  # Fail twice to test retry
            raise RuntimeError("Simulated connection error")
        return await original_send_json(*args, **kwargs)

    # Create a websocket connection
    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        # Patch the send_json method
        WebSocket.send_json = mock_send_json

        try:
            # Update verification token to match WebSocket connection
            sample_webhook_data["verification_token"] = "test_token"
            response = client.post(
                "/webhook", 
                data={'data': json.dumps(sample_webhook_data)}
            )
            assert response.status_code == 200
            assert error_count > 1  # Verify that retries occurred
        finally:
            # Restore original method
            WebSocket.send_json = original_send_json


@pytest.mark.asyncio
async def test_webhook_max_retries_exceeded(client, sample_webhook_data):
    async def mock_send_json(*args, **kwargs):
        raise RuntimeError("Simulated connection error")

    # Create a websocket connection
    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        # Store original method
        original_send_json = WebSocket.send_json
        # Patch the send_json method
        WebSocket.send_json = mock_send_json

        try:
            # Update verification token to match WebSocket connection
            sample_webhook_data["verification_token"] = "test_token"
            response = client.post(
                "/webhook", 
                data={'data': json.dumps(sample_webhook_data)}
            )
            assert response.status_code == 200
            # Import the active_connections from main module
            from app.main import active_connections
            # Verify the connection was removed after max retries
            assert "test_token" not in active_connections
        finally:
            # Restore original method
            WebSocket.send_json = original_send_json


@pytest.mark.asyncio
async def test_webhook_websocket_disconnect(client, sample_webhook_data):
    async def mock_send_json(*args, **kwargs):
        # Simulate WebSocket disconnect during send
        raise WebSocketDisconnect()

    # Create a websocket connection
    with TestClient(app).websocket_connect("/ws/test_token") as websocket:
        # Store original method
        original_send_json = WebSocket.send_json
        # Patch the send_json method
        WebSocket.send_json = mock_send_json

        try:
            # Update verification token to match WebSocket connection
            sample_webhook_data["verification_token"] = "test_token"
            response = client.post(
                "/webhook", 
                data={'data': json.dumps(sample_webhook_data)}
            )
            assert response.status_code == 200
            # Import the active_connections from main module
            from app.main import active_connections
            # Verify the connection was removed after disconnect
            assert "test_token" not in active_connections
        finally:
            # Restore original method
            WebSocket.send_json = original_send_json


def test_ping_endpoint(client):
    response = client.get("/ping")
    assert response.status_code == 200
    assert response.json() == {"message": "pong"}


def test_version_endpoint(client):
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json() == {"version": app.version}


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert b"<!DOCTYPE html>" in response.content


def test_webhook_missing_verification_token(client):
    invalid_data = {
        "message_id": "123",
        "timestamp": datetime.now().isoformat(),
        "type": "Donation"
        # verification_token is missing
    }
    response = client.post(
        "/webhook", 
        data={'data': json.dumps(invalid_data)}
    )
    assert response.status_code == 400
    assert "Missing verification_token" in response.json()["detail"]


@pytest.mark.asyncio
async def test_invalid_websocket_token():
    with pytest.raises(WebSocketDisconnect):
        with TestClient(app).websocket_connect("/ws/") as websocket:
            websocket.send_text("ping")


@pytest.mark.asyncio
async def test_multiple_websocket_connections():
    # Test handling of multiple connections with same token
    with TestClient(app).websocket_connect("/ws/test_token") as ws1:
        with TestClient(app).websocket_connect("/ws/test_token") as ws2:
            ws1.send_text("ping")
            ws2.send_text("ping")
            assert ws1.receive_text() == "pong"
            assert ws2.receive_text() == "pong"
