
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-02-01

### Changes

- Fixed the issue where the homepage displayed two semicolons after the protocol (e.g. `https:://` is now `https://`)
- Added the version number to the homepage
- Removed the HomePage and test client html files from the github code count (linguist)
- Added `.dockerignore` file to exclude the unnecessary files from the docker image

## [1.0.0] - 2025-02-01

### Added

- Initial release
- Webhook endpoint for KoFi notifications
- WebSocket endpoint with verification token
- Full test coverage
- CI/CD pipeline with GitHub Actions
- Docker support
