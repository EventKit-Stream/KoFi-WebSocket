import pytest
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket, WebSocketDisconnect
from datetime import datetime
from app.main import app, KofiWebhook, KofiData, ShopItem, ShippingInfo


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_webhook_data():
    return {
        "data": {
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
    }


@pytest.fixture
def sample_shop_webhook_data(sample_webhook_data):
    sample_webhook_data["data"]["type"] = "Shop Order"
    sample_webhook_data["data"]["shop_items"] = [
        {
            "direct_link_code": "ABC123",
            "variation_name": "Test Variation",
            "quantity": 1
        }
    ]
    sample_webhook_data["data"]["shipping"] = {
        "full_name": "Test User",
        "street_address": "123 Test St",
        "city": "Test City",
        "state_or_province": "Test State",
        "postal_code": "12345",
        "country": "Test Country",
        "country_code": "TC",
        "telephone": "123456789"
    }
    return sample_webhook_data


def test_webhook_without_active_connection(client, sample_webhook_data):
    response = client.post("/webhook", json=sample_webhook_data)
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
        # Update the verification token to match the WebSocket connection
        sample_webhook_data["data"]["verification_token"] = "test_token"
        # Ensure timestamp is a string
        sample_webhook_data["data"]["timestamp"] = datetime.now().isoformat()
        response = client.post("/webhook", json=sample_webhook_data)
        assert response.status_code == 200


def test_shop_order_webhook(client, sample_shop_webhook_data):
    response = client.post("/webhook", json=sample_shop_webhook_data)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}


def test_model_validation():
    shop_item = ShopItem(
        direct_link_code="ABC123",
        variation_name="Test Variation",
        quantity=1
    )
    assert shop_item.direct_link_code == "ABC123"

    shipping_info = ShippingInfo(
        full_name="Test User",
        street_address="123 Test St",
        city="Test City",
        state_or_province="Test State",
        postal_code="12345",
        country="Test Country",
        country_code="TC",
        telephone="123456789"
    )
    assert shipping_info.full_name == "Test User"


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
            sample_webhook_data["data"]["verification_token"] = "test_token"
            response = client.post("/webhook", json=sample_webhook_data)
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
            sample_webhook_data["data"]["verification_token"] = "test_token"
            response = client.post("/webhook", json=sample_webhook_data)
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
            sample_webhook_data["data"]["verification_token"] = "test_token"
            response = client.post("/webhook", json=sample_webhook_data)
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
