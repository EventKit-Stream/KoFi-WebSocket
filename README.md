# KoFi WebSocket Bridge

A FastAPI application that bridges KoFi webhooks to WebSocket connections, enabling real-time notifications of KoFi events.

[![CI/CD](https://github.com/EventKit-Stream/KoFi-WebSocket/actions/workflows/publish-ghcr.yml/badge.svg?branch=master)](https://github.com/EventKit-Stream/KoFi-WebSocket/actions/workflows/publish-ghcr.yml)
[![codecov](https://codecov.io/gh/EventKit-Stream/KoFi-WebSocket/graph/badge.svg?token=6MEX17B6J5)](https://codecov.io/gh/EventKit-Stream/KoFi-WebSocket)

## Features

- Webhook endpoint for KoFi notifications
- WebSocket endpoint for real-time updates
- Verification token-based security
- Docker support

## Installation

### Prerequisites

- Python 3.9 or higher
- Docker (optional, for containerized deployment)

### Clone the Repository

```sh
git clone https://github.com/EventKit-Stream/KoFi-WebSocket.git
cd KoFi-WebSocket
```

### Install Dependencies

```sh
pip install -r requirements.txt
```

## Usage

### Running the Application

To run the application locally, use the following command:

```sh
fastapi run ./app/main.py --host 0.0.0.0 --port 8000
```

The `host` and `port` are optional.

### Running with Docker

Build and run the Docker container:

```sh
docker build -t kofi-websocket .
docker run -p 8000:8000 kofi-websocket
```

### WebSocket Endpoint

Connect to the WebSocket endpoint using a verification token:

```http
ws://localhost:8000/ws/{verification_token}
```

### Webhook Endpoint

Send a POST request to the webhook endpoint with the required data:

```http
POST /webhook
Content-Type: application/x-www-form-urlencoded

{
  "data": {
    "verification_token": "your_token",
    "some_key": "some_value"
  }
}
```

## Configuration

### Environment Variables

You can configure the application using the following environment variables:

- `HOST`: The host address to bind the server (default: `0.0.0.0`)
- `PORT`: The port to bind the server (default: `8000`)

### Docker Environment Variables

When running with Docker, you can pass environment variables using the `-e` flag:

```sh
docker run -p 8000:8000 -e HOST=0.0.0.0 -e PORT=8000 kofi-websocket
```

## Testing

Run the tests using pytest:

```sh
pytest
```

To check test coverage:

```sh
pytest --cov=app tests/ --cov-report=term-missing
```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries or support, please contact [lordlumineer@eventkit.stream](mailto:lordlumineer@eventkit.stream).
