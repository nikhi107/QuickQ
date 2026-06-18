# QuickQ: High-Performance Smart Queue Management System

A production-ready, real-time smart queue management system capable of handling 100+ concurrent users with sub-50ms queue state updates. Built as a full-stack solution featuring a Java/Spring Boot backend and two vanilla HTML/CSS/JS frontends (Admin Dashboard and Client Web App).

## 🌟 Key Features

*   **Lightning Fast Queue Updates**: Utilizes **Redis** for ephemeral state and pipelining to achieve sub-50ms queue state sync across all connected clients.
*   **Separation of Concerns**: Uses **SQLite (JPA)** for persistent data (User History, Analytics) and **Redis** strictly for fast queue management, avoiding transactional bottlenecks.
*   **Real-time WebSockets**: Live progress tracking and immediate notifications for both clients and administrators without needing to refresh pages.
*   **Production-Ready Security & API**:
    *   **Rate Limiting Filter**: Protects endpoints (10 requests/min per IP) to prevent abuse.
    *   **JWT Authentication**: Secure endpoints and role-based access control (Admin vs. Guest).
    *   **Global Exception Handling**: Returns standardized JSON error responses.
    *   **Swagger OpenAPI Integration**: Beautiful interactive API documentation available at `/swagger-ui.html`.
*   **Premium Dynamic UI**: 
    *   Stunning gradients, skeleton loaders, toast notifications, and CSS shimmer animations.
    *   Dynamic frontend configuration loading from `config.js` via `.env`.
*   **Smart ETA & Ticketing**: Generates short, human-friendly ticket numbers (e.g., `P-005`) and calculates dynamic estimated wait times based on live historical averages.
*   **Resume-Ready CI/CD**: Fully Dockerized with a complete `docker-compose.yml` stack, Nginx reverse proxy, and GitHub Actions CI pipeline.

---

## 🏗 Architecture

The system is split into three main parts:
1.  **`/backend`**: Java Spring Boot server handling business logic, WebSockets, Redis (Queue State), and SQLite (Analytics/History).
2.  **`/admin-frontend`**: Vanilla JavaScript SPA for staff and administrators. Served by Nginx.
3.  **`/client-frontend`**: Vanilla JavaScript responsive web application for end-users. Served by Nginx.

---

## 🚀 Getting Started (Docker Compose)

The easiest way to run the entire stack in a production-like environment is using Docker Compose.

### Prerequisites
*   [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### ⚡ Quick Start

1.  Clone the repository and enter the directory.
2.  Start the entire stack using Docker Compose:
    ```bash
    docker-compose up -d --build
    ```
3.  The services will automatically start up and network together:
    *   **Backend API & Swagger UI**: `http://localhost:8000` -> `http://localhost:8000/swagger-ui.html`
    *   **Client Web App**: `http://localhost:80/`
    *   **Admin Dashboard**: `http://localhost:80/admin-portal`

*(Note: The default admin credentials are configurable via the `docker-compose.yml` environment variables: `admin` / `admin123`)*

---

## 🛠 Manual Setup Method (Local Dev)

If you prefer to start the services manually or are actively developing, follow these steps:

### Prerequisites
*   Java 21+ and Maven 3.9+
*   Node.js (v16+) - optional, for formatting
*   **Redis**: Must be running locally on port `6379`.

### 1. Backend Setup
Create a `.env` file from the example:
```bash
cd backend/resources
cp .env.example ../.env
```
Start the Spring Boot server:
```bash
cd backend
mvn spring-boot:run
```

### 2. Frontend Setup (Admin & Client)
Update your configuration:
1. Copy `client-frontend/config.example.js` to `client-frontend/config.js`
2. Copy `admin-frontend/config.example.js` to `admin-frontend/config.js`

Since the frontends are built with pure HTML, CSS, and vanilla JavaScript without build tools, you don't need `npm` or `node_modules`! You can serve them using any simple static file server, for instance using Python:
```bash
# Terminal 1: Start Admin Frontend
cd admin-frontend
python -m http.server 5173

# Terminal 2: Start Client Frontend
cd client-frontend
python -m http.server 5174
```

---

## 📖 User Guide

### For Administrators (Using the Admin Dashboard)
1. **Access the Dashboard**: Navigate to `/admin-portal` (or `http://localhost:5173` locally).
2. **Login**: Login with the bootstrap admin credentials to have full control over queues and calling patients. Use "Login as Guest" (`guest`/`guest123`) to enter view-only mode.
3. **Manage Queues**: Click the gear icon to create dynamic queues with custom labels and UI gradient colors!
4. **Call the Next Person**: Click the large **"Call Next Person"** button. The ticket number will visually flash, and the person will be highlighted. *(Note: This instantly updates the Service Snapshot analytics metrics!)*

### For End-Users (Using the Client Web App)
1. **Access the app**: Open `/` (or `http://localhost:5174` locally).
2. **Join a Queue**: Select a queue from the dropdown, enter your name, and click "Get Ticket".
3. **Wait in line**: Watch the sleek, responsive UI show your **current position** in line and your **estimated wait time**.
4. **Instant Updates**: As the administrator clicks "Call Next Person", your position ticks down in real-time until it is your turn. When called, an animated "Your Turn" screen will pop up to alert you!

---

## 🧪 Testing and CI

This repository uses **GitHub Actions** for Continuous Integration.
* Every push or pull request to the `main` branch triggers the CI pipeline.
* The pipeline spins up a Redis service container and runs the comprehensive JUnit and Spring Boot test suite using `mvn test`.

To run the tests locally:
```bash
cd backend
mvn test
```
