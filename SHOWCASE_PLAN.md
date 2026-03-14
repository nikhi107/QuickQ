## QuickQ Showcase Plan

This file breaks the project into small daily upgrades so you can push visible, meaningful progress to GitHub day by day.

### Day 1: UX Recovery and Frontend Config

- Persist the client's active ticket in `localStorage`
- Restore the queue session after page refresh
- Add configurable frontend API/WebSocket base URLs with local defaults
- Fix misleading analytics wording in the admin dashboard

Suggested commit message:
`day 1: add client session recovery and frontend config cleanup`

### Day 2: Backend Configuration and Security Basics

- Move backend secrets and defaults to environment variables
- Remove hardcoded JWT behavior
- Make CORS configurable
- Make bootstrap admin credentials configurable

Suggested commit message:
`day 2: move backend auth and cors settings to environment config`

### Day 3: Real Ticket Identity

- Replace random-looking user IDs in the UI with human-friendly ticket numbers
- Show ticket number clearly in client and admin screens
- Keep internal IDs separate from display ticket numbers

Suggested commit message:
`day 3: add human friendly ticket numbers`

### Day 4: Persistent Current Serving State

- Store current serving per queue in the backend
- Broadcast current serving in WebSocket updates
- Restore current serving after admin refresh

Suggested commit message:
`day 4: persist current serving state across sessions`

### Day 5: Queue Management

- Add queue records in the backend instead of hardcoded queue IDs
- Allow admins to create and manage queues
- Show queue metadata in the UI

Suggested commit message:
`day 5: add dynamic queue management`

### Day 6: Better Queue Operations

- Add actions for mark served, no-show, remove, and requeue
- Add queue item status tracking
- Improve wait-time and analytics accuracy

Suggested commit message:
`day 6: add queue lifecycle actions and status tracking`

### Day 7: Analytics Upgrade

- Add per-queue analytics
- Add daily metrics and trend summaries
- Fix all-time vs today reporting

Suggested commit message:
`day 7: expand analytics with queue and daily metrics`

### Day 8: Project Structure and Tests

- Split backend routes and services into modules
- Add API tests for auth and queue flows
- Add regression coverage for queue edge cases

Suggested commit message:
`day 8: refactor backend structure and add automated tests`

### Day 9: Public Display Experience

- Add a public queue board view for kiosk or TV display
- Show now serving and next up
- Optimize for large-screen readability

Suggested commit message:
`day 9: add public queue display board`

### Day 10: Mobile Product or Cleanup

- Either implement the mobile app properly
- Or remove starter scaffolding and document it as future work

Suggested commit message:
`day 10: build mobile queue experience`
