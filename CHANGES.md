
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0 - UNRELEASED] - 2025-02-10

### Changes in 1.1.0

- You can now have multiple websockets connected with the same token, without having the other connection not receiving the messages

- You can try the service directly from the homepage now
  - The button to display the try it out section is located at the bottom right of the page (and is always visible)
- Addition of a navigation panel to quickly jump to the different sections of the homepage
- Theme switcher to change between light and dark mode

- Now using libraries for the UI of the homepage
  - TailwindCSS
  - DaisyUI
  - Json Formatter (to format the json in the try it out section)
- General refactoring of the homepage

- Reduced the amount of endpoints by directly mounting the static files in the server

- CI/CD:
  - Modified the GitHub Actions so it queries the possible versions once at the start of the workflow.
  - The workflow fails if no main version is found (for any release type)
  - For production releases (PR on `master`):
    - The workflow fails if the version is not found in the changelog
    - If version syntax follows the development version (`<release>-<stage [alpha/beta/rc/...]>-<devVersion>`, the use of the `devVersion` is optional), the workflow fails
  - For pre-release (PR on `pre-release`):
    - The workflow fails if the version doesn't follow the development version syntax

- `DockerHub_ReadMe.md` created, this is the file to write the description of the Docker image on DockerHub.

## [1.0.4] - 2025-02-02

### Changes in 1.0.4

- Fixed the favicon type (.svg -> .ico)

## [1.0.3] - 2025-02-02

### Changes in 1.0.3

- Added favicon to the homepage
- Added some SEO to the homepage
- Fixed the `.gitattributes` file not properly ignoring the html files (test_client and homepage)

## [1.0.2] - 2025-02-01

### Changes in 1.0.2

- Fixed the Code in the homePage to be color theme dynamic (light/dark mode)

## [1.0.1] - 2025-02-01

### Changes in 1.0.1

- Fixed the issue where the homepage displayed two semicolons after the protocol (e.g. `https:://` is now `https://`)
- Added the version number to the homepage
- Removed the HomePage and test client html files from the github code count (linguist)
- Added `.dockerignore` file to exclude the unnecessary files from the docker image

## [1.0.0] - 2025-02-01

### Added in 1.0.0

- Initial release
- Webhook endpoint for KoFi notifications
- WebSocket endpoint with verification token
- Full test coverage
- CI/CD pipeline with GitHub Actions
- Docker support
