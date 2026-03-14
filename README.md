# QuickQ: Smart Queue Management System

A high-performance, real-time smart queue management system capable of handling 100+ concurrent users with sub-50ms queue state updates. Built as a full-stack solution featuring a Python/FastAPI backend and two React/Vite frontends (Admin Dashboard and Client Web App).

## 🌟 Key Features

*   **Lightning Fast Queue Updates**: Utilizes Redis as an in-memory database to achieve sub-50ms queue state sync across all connected clients.
*   **Real-time WebSockets**: Live progress tracking and immediate notifications for both clients and administrators without needing to refresh pages.
*   **Premium Admin Dashboard**: Built with React, Vite, and Tailwind CSS. Features dynamic queue visualization, statistics, and 1-click controls to call the next person in line.
*   **Responsive Client Web App**: Built with React and Vite, providing a seamless experience for users to join lines, monitor their position, and get accurate wait-time estimations on any device.
*   **Highly Scalable Backend**: Driven by FastAPI (Python), utilizing PostgreSQL/SQLite for user history analytics and asynchronous operations to smoothly handle large volumes of simultaneous queue requests.
*   **Secure Administration**: Features JWT token-based authentication for the admin panel.

---

## 🏗️ Technical Architecture

This repository is intuitively structured into three standalone components:

1.  **`/backend`**: The Python FastAPI server handling the logic, WebSockets, Redis, and Database connections.
2.  **`/admin-frontend`**: The React.js web application for staff and administrators.
3.  **`/client-frontend`**: The React.js responsive web application designed for the end-users.

---

## 🚀 Getting Started (Local Setup)

### Prerequisites

*   [Node.js](https://nodejs.org/) (v16+)
*   [Python](https://www.python.org/) 3.10+
*   **Redis**: You *must* have Redis installed and running locally on port `6379`.
    *   *Windows*: Install via [WSL](https://redis.io/docs/latest/operate/oss_and_stack/install/install-redis/install-redis-on-windows/), [Docker](https://hub.docker.com/_/redis), or use [Memurai](https://www.memurai.com/).
    *   *Mac/Linux*: Install via Homebrew `brew install redis` or `apt-get install redis-server`.

### ⚡ Quick Start Method (Windows)

For Windows users, we've included a handy batch script to start all services simultaneously:

1. Ensure Redis is running in the background.
2. Double-click the `start_all.bat` file in the root directory.
3. The script will automatically launch:
   * Backend API (`localhost:8000`)
   * Admin Dashboard (`localhost:5173`)
   * Client Web App (`localhost:5174`)

### 🛠 Manual Setup Method

If you prefer to start the services manually or are on Mac/Linux, follow these steps:

#### 1. Backend Setup
```bash
cd backend

# Create a virtual environment
python -m venv venv

# Activate it (Windows)
.\venv\Scripts\activate
# Activate it (Mac/Linux)
# source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn redis websockets pydantic sqlalchemy psycopg2-binary pyjwt bcrypt python-multipart

# Run the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Admin Frontend Setup
```bash
cd admin-frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

#### 3. Client Frontend Setup
```bash
cd client-frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

---

## 📖 User Guide

### For Administrators (Using the Admin Dashboard)

1. **Access the Dashboard**: Open your browser and navigate to `http://localhost:5173`.
2. **Login**: Login with credentials `admin` / `admin123` or create a new account via the Signup toggle.
3. **Select a Queue**: Use the dropdown on the left side to switch between different operational queues (e.g., "Main Clinic", "Pharmacy").
4. **Monitor Live Status**: The right panel displays the live "Waiting Line Queue." You can see exactly who is in line, their assigned ticket number, and total users waiting.
5. **Call the Next Person**: Click the large purple **"Call Next Person"** button on the left panel. The person at the front of the line will instantly be removed from the queue and highlighted in the "Currently Serving" box.

### For End-Users (Using the Client Web App)

1. **Access the app**: Open `http://localhost:5174` in your browser.
2. **Join a Queue**: 
   * Pre-fill the Queue ID using the "Scan Clinic QR Code" button or manually type the ID you wish to join (e.g., `main-clinic` - this must match the Admin Dashboard).
   * Enter your Name.
   * Click "Get Ticket".
3. **Wait in line**: The app will transition to a live-updating screen showing your **current position** in line and your **estimated wait time**.
4. **Instant Updates**: As the administrator clicks "Call Next Person", your position number will automatically tick down in real-time until it is your turn!
5. **Leaving the queue**: If you need to give up your spot, tap the red "Leave Queue" button.
