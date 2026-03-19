# QuickQ Java Backend

This is the primary Spring Boot backend for QuickQ. It keeps the same API and WebSocket contract used by the existing admin and client frontends.

## Stack

- Java 21+
- Spring Boot
- Spring Security + JWT
- Spring WebSocket
- Spring Data JPA
- Redis
- SQLite

## Endpoints

- `POST /admin/signup` when enabled by backend config
- `POST /admin/login`
- `GET /analytics/history`
- `GET /queues`
- `POST /queue/{queueId}/join`
- `GET /queue/{queueId}/status`
- `POST /queue/{queueId}/next`
- `POST /queue/{queueId}/leave/{userId}`
- `GET /queue/{queueId}/position/{userId}`
- `WS /ws/queue/{queueId}`

## Run

Install Maven first, then:

```powershell
cd backend
mvn spring-boot:run
```

The app listens on `http://localhost:8000`, so the current React frontends can keep using the same `VITE_API_BASE_URL`.

## Environment Variables

The backend now supports environment-driven runtime configuration. The most useful settings are:

- `QUICKQ_SERVER_PORT`
- `QUICKQ_DATASOURCE_URL`
- `QUICKQ_REDIS_HOST`
- `QUICKQ_REDIS_PORT`
- `QUICKQ_JWT_SECRET`
- `QUICKQ_JWT_EXPIRATION_MINUTES`
- `QUICKQ_CORS_ALLOWED_ORIGIN_PATTERNS`
- `QUICKQ_BOOTSTRAP_ADMIN_ENABLED`
- `QUICKQ_BOOTSTRAP_ADMIN_USERNAME`
- `QUICKQ_BOOTSTRAP_ADMIN_PASSWORD`
- `QUICKQ_ADMIN_SIGNUP_ENABLED`
- `QUICKQ_ADMIN_SIGNUP_INVITE_CODE`

## Queue Catalog

Queue metadata is now stored as backend records instead of being hardcoded in the React apps.

On startup, the backend seeds three default queues:

- `main-clinic`
- `pharmacy`
- `support-desk`

Both frontends call `GET /queues` to populate queue selectors, labels, counters, and queue-specific descriptions.

## Admin Signup Policy

Public admin signup is now disabled by default.

If you want to allow admin creation outside the bootstrap admin flow, set:

- `QUICKQ_ADMIN_SIGNUP_ENABLED=true`
- `QUICKQ_ADMIN_SIGNUP_INVITE_CODE=<your-secret-code>` for invite-only signup

Example PowerShell session:

```powershell
$env:QUICKQ_JWT_SECRET="replace-with-a-long-secret"
$env:QUICKQ_BOOTSTRAP_ADMIN_PASSWORD="replace-with-a-strong-password"
mvn spring-boot:run
```
