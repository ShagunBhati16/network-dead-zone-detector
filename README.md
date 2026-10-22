# Network Dead Zone Detector

A web-based network monitoring and survey application designed to help
users investigate weak, unstable, or unavailable connectivity. The
project combines network tests, location-based surveys, a dead-zone map,
indoor floor-plan annotations, history, and report exports in one
interface.

> **Project status:** This README describes the features and setup
> represented in the project files. Verify each feature on your machine
> before presenting it as fully tested. Browser-based measurements and
> operating-system support can affect the values available.

## Contents

-   [Features](#features)
-   [Technology Stack](#technology-stack)
-   [Requirements](#requirements)
-   [Run Locally in VS Code](#run-locally-in-vs-code)
-   [Optional Native Wi-Fi Collector](#optional-native-wi-fi-collector)
-   [Using the Main Features](#using-the-main-features)
-   [Run the Tests](#run-the-tests)
-   [Environment Configuration](#environment-configuration)
-   [Project Structure](#project-structure)
-   [Limitations](#limitations)
-   [Troubleshooting](#troubleshooting)

## Features

-   **Network Test:** checks connectivity and estimates network
    performance using available browser-visible probes.
-   **Network metrics:** displays available information such as latency,
    download/upload estimates, packet loss, and signal readings when
    supported.
-   **Dead Zone Map:** visualizes saved, location-tagged observations
    when coordinates are available.
-   **RSSI/latency heatmap:** supports Auto, RSSI, and Latency modes.
    Heatmap values are estimates based on qualifying measurements; they
    are not direct measurements at every point on the map.
-   **Floor Plan:** upload a PNG/JPG floor plan and click to add named
    indoor points. Optional RSSI values can be entered for a point.
-   **Walk-test Survey:** requests location permission and records
    samples at a selected interval while the survey page remains open.
-   **History and reports:** review saved measurements and use available
    report summaries and CSV/PDF exports.
-   **Account access:** registration/login and protected user-specific
    records are included in the backend implementation.
-   **Optional local collector:** a Python companion service can provide
    additional local Wi-Fi information when supported by the operating
    system.
-   **Validation and tests:** automated tests cover detection logic and
    API behavior, alongside frontend contract checks.

## Technology Stack

-   **Frontend:** React, Vite, JavaScript, CSS
-   **Backend:** Node.js, Express
-   **Data storage:** JSON files for prototype persistence
-   **Reporting:** CSV export and PDF generation through the backend
-   **Testing:** Node.js built-in test runner (`node --test`)
-   **Optional collector:** Python 3 standard library

## Requirements

Install the following before running the project:

1.  **Node.js LTS** (includes npm). Verify installation in a VS Code
    terminal:

    ``` powershell
    node --version
    npm --version
    ```

2.  **Visual Studio Code**

3.  **Python 3** only if you want to run the optional native collector.
    Verify with:

    ``` powershell
    py -3 --version
    ```

## Run Locally in VS Code

### 1. Open the project

Open the project folder in VS Code. For the current Windows setup, the
path may be:

``` powershell
C:\Users\shagu\Desktop\network-dead-zone-detector
```

If your project is saved elsewhere, use your actual folder path instead.

### 2. Configure the backend

Open **Terminal → New Terminal** in VS Code, then run:

``` powershell
cd backend
npm install
```

Create a local environment file by copying the example:

``` powershell
Copy-Item .env.example .env
```

For local development, the example settings use port `5000`. Do not
commit `.env` to GitHub. The project should have `.env` files excluded
through `.gitignore`.

Start the backend:

``` powershell
npm start
```

Keep this terminal open. The backend is expected to listen on
`http://localhost:5000` unless the `PORT` setting changes. The health
endpoint is:

``` text
http://localhost:5000/api/health
```

### 3. Configure and start the frontend

Open a **second VS Code terminal**. From the project root, run:

``` powershell
cd frontend
npm install
```

Create the frontend environment file from the example:

``` powershell
Copy-Item .env.example .env
```

If the backend is running on the default local address, the frontend can
use its default API configuration. If your setup uses a different
backend address, set `VITE_API_URL` in `frontend/.env` to the backend
base URL, for example:

``` dotenv
VITE_API_URL=http://localhost:5000
```

Start the frontend:

``` powershell
npm run dev
```

Vite prints the local URL in the terminal, commonly:

``` text
http://localhost:5173
```

Open that URL in your browser. Keep both the backend and frontend
terminals running while using the application.

### 4. Typical startup routine after the first installation

After dependencies have been installed, you generally only need two
terminals:

**Terminal 1 --- Backend**

``` powershell
cd C:\Users\shagu\Desktop\network-dead-zone-detector\backend
npm start
```

**Terminal 2 --- Frontend**

``` powershell
cd C:\Users\shagu\Desktop\network-dead-zone-detector\frontend
npm run dev
```

Use your actual project path if it differs. Run `npm install` again only
if dependencies change or the `node_modules` directory is missing.

## Optional Native Wi-Fi Collector

The optional collector runs locally and is separate from the frontend
and backend.

### Start it on Windows

From the project root, open a third terminal and run:

``` powershell
py -3 native-collector\collector.py
```

Alternatively, double-click:

``` text
native-collector\start-collector.bat
```

Keep the collector terminal open while using the walk-test feature.
Check its health endpoint in a browser:

``` text
http://127.0.0.1:8765/health
```

The collector binds to loopback (`127.0.0.1`) so it is intended for
local use on the same computer.

**Signal-strength note:** standard Windows `netsh` commonly provides
signal quality as a percentage rather than a reliable actual RSSI
reading in dBm. On supported systems, the collector may provide more
detailed information. Do not treat a percentage or a rough estimate as a
directly measured RSSI value.

## Using the Main Features

1.  **Dashboard:** open the dashboard to access the available network
    testing, mapping, survey, history, and reporting sections.
2.  **Network Test:** run a test and review the measurements returned by
    the available probes.
3.  **Dead Zone Map:** review saved observations with location
    coordinates. Map points cannot be shown accurately if location data
    was not recorded.
4.  **Floor Plan:** upload a PNG/JPG image (up to 2 MB in the current
    implementation) and click the image to place named points. The image
    and its annotations are stored in the current browser's local
    storage; clearing browser site data can remove them.
5.  **Walk-test Survey:** sign in, grant location permission if
    prompted, choose the sampling interval, start the survey, move
    through the area while keeping the page open, and stop the survey
    when finished.
6.  **History and Reports:** review saved measurements and try available
    summary and export actions. Confirm the exported file contents
    before using them in a formal report.

## Run the Tests

From a VS Code terminal:

``` powershell
cd backend
npm install
npm test
```

The backend test command uses Node.js's built-in test runner. Tests are
intended to cover detection/classification rules, API validation,
persistence, reporting/export behavior, and frontend contract checks.

A successful automated test run does **not** replace manual testing in a
browser or on the target device. Also verify location permissions,
actual Wi-Fi behavior, map rendering, and CSV/PDF exports before
presenting these features as verified.

## Environment Configuration

### Backend: `backend/.env`

Start from `backend/.env.example`. Common settings include:

``` dotenv
PORT=5000
NODE_ENV=development
AUTH_SECRET=replace-with-a-long-random-secret-before-production
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
```

-   `PORT`: backend listening port.
-   `NODE_ENV`: environment mode.
-   `AUTH_SECRET`: use a unique, random secret of at least 32 characters
    for production.
-   `CORS_ORIGIN`: comma-separated frontend origins permitted to call
    the API.
-   `NETSPOT_DATA_DIR`: optional directory for persistent JSON data.

### Frontend: `frontend/.env`

If needed, configure the backend URL:

``` dotenv
VITE_API_URL=http://localhost:5000
```

Variables prefixed with `VITE_` are bundled into frontend code. **Never
put passwords, private keys, or other secrets in frontend environment
variables.** Never upload `.env` files or credentials to a public
repository.

## Project Structure

``` text
network-dead-zone-detector/
├── frontend/             # React/Vite user interface
├── backend/              # Express API, detection logic, tests, and JSON data
│   └── tests/             # Automated tests
├── native-collector/     # Optional Python local Wi-Fi collector
├── docs/                 # Testing, deployment, and floor-plan notes
├── README.md             # Project overview and setup instructions
├── Project_Report.pdf    # Add your final report here
└── Project_Presentation.pptx  # Add your final presentation here
```

The exact files may differ slightly by project version. Add the report
and presentation to the repository only after confirming their final
filenames.

## Limitations

-   Browser APIs do not provide reliable, cross-platform access to
    actual Wi-Fi RSSI. Some signal information requires
    operating-system-specific support.
-   Browser-based latency and speed estimates depend on the browser,
    network conditions, endpoints, firewall, and CORS configuration.
-   GPS may be unavailable or inaccurate indoors. Location is optional;
    do not invent coordinates when permission is denied.
-   The floor-plan image is stored locally in the browser in the current
    implementation, not uploaded to the backend.
-   Heatmap cells are interpolated estimates and require enough
    qualifying location-tagged measurements.
-   JSON-file storage is suitable for a prototype or single-instance
    deployment, not concurrent multi-instance production use.
-   The optional collector and all platform-dependent features should be
    verified on the target operating system.

## Troubleshooting

**Frontend opens, but data does not load** - Confirm the backend
terminal is still running. - Visit `http://localhost:5000/api/health`. -
Check that `VITE_API_URL` points to the correct backend address. -
Restart the frontend after changing `frontend/.env`.

**`npm` or `node` is not recognized** - Install Node.js LTS, close and
reopen VS Code, then run `node --version` and `npm --version`.

**Port 5000 is already in use** - Stop the other process using that
port, or configure a different backend `PORT` and update `VITE_API_URL`
accordingly.

**Map has no points** - The map relies on saved records with valid
coordinates. Run a survey with location permission enabled and confirm
that records are saved.

**Collector health endpoint does not respond** - Confirm Python 3 is
installed and the collector terminal has no errors. - Ensure the
collector is running on the same computer and port `8765` is not already
in use.

**Tests fail** - Run `npm install` inside `backend`. - Read the first
test failure carefully and check the Node.js version and project
configuration. - Do not describe a test as passed unless the command
finishes successfully.

## Security and Repository Hygiene

Before pushing the project to a public GitHub repository:

-   Do not commit `.env` files, authentication secrets, passwords,
    access tokens, or private user data.
-   Keep `node_modules/`, build outputs, logs, and local runtime data
    out of Git unless intentionally required.
-   Review `.gitignore` and inspect the files staged for commit.
-   Use a strong `AUTH_SECRET` for any deployment beyond local
    development.
-   For production use, review the security and scaling recommendations
    in `docs/TESTING-AND-DEPLOYMENT.md`.

## Documentation

See `docs/TESTING-AND-DEPLOYMENT.md` for the manual verification
checklist, deployment guidance, data backup notes, and collector
details. See `docs/FLOORPLAN-HEATMAP.md` for more information about
floor-plan annotations and heatmap behavior.
