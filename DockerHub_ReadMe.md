# KoFi WebSocket Bridge

A FastAPI application that bridges KoFi webhooks to WebSocket connections, enabling real-time notifications of KoFi events.

[![CI/CD](https://github.com/EventKit-Stream/KoFi-WebSocket/actions/workflows/ci-cd.yml/badge.svg?branch=master)](https://github.com/EventKit-Stream/KoFi-WebSocket/actions/workflows/ci-cd.yml)
[![codecov](https://codecov.io/gh/EventKit-Stream/KoFi-WebSocket/graph/badge.svg?token=6MEX17B6J5)](https://codecov.io/gh/EventKit-Stream/KoFi-WebSocket)

## Features

- Webhook endpoint for KoFi notifications
- WebSocket endpoint for real-time updates
- Verification token-based security
- Multiple connections with the same token

## Usage

When the application is running, you can connect to the WebSocket endpoint using a `verification_token`. The application will forward any webhook data to connected WebSocket clients. This only happens if the provided `verification_token` matches the one in the webhook's data object.

### WebSocket Endpoint

Connect to the WebSocket endpoint using a verification token:

```http
ws://<your-ip>:8000/ws/{verification_token}
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
    "another_key": "another_value"
  }
}
```

### The Home Page

If you navigate to the root of the application, you will see a simple page explaining how to use the application with a built-in websocket client where you can connect to the WebSocket endpoint with any verification token, and test it by sending a test message.

## How to use this image

**Using** `docker run`

```sh
docker run -d --name kofi-websocket -p 8000:8000 --restart unless-stopped lordlumineer/kofi-websocket:latest
```

or using `docker-compose`:

```yaml
services:
  api:
    container_name: kofi-websocket
    image: lordlumineer/kofi-websocket:latest
    restart: unless-stopped
    ports:
      - "8000:8000"
```

### Image Variants

The `lordlumineer/kofi-websocket` images come in multiple variants:

- Production ready images:
  - `:latest`, this is the latest stable release
  - `:<version>`, you can specify a version to use a specific release
- Development images:
  The development images are not production-ready and should not be used in production environments. They start with `dev` suffix.
  - `:dev`, this is the latest development version
  - `:dev-<version>`, you can specify a version to use the latest development release for a specific main release
  - `:dev-<version>-<stage>`, by specifying a stage (`alpha`, `beta`, `rc`, or `dev`), you can use a specific development stage for a specific main release
  - `:dev-<version>-<stage>-<version>`, by specifying a version, you can use a specific development version for a specific development stage of a specific main release

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For any inquiries or support, please contact [lordlumineer@eventkit.stream](mailto:lordlumineer@eventkit.stream).
