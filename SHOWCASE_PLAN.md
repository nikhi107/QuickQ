## QuickQ 15-Day GitHub Showcase Plan

This plan is designed for clean, professional daily progress updates. Each day should produce:

- one focused code change
- one clean commit
- one short GitHub push
- one small README or screenshot update only if it supports that day's work

The right way to do this is to push real work day by day from now onward. Do not batch all 15 days at once and pretend it happened over time.

### Workflow For Each Day

1. Finish only that day's scoped task
2. Run the relevant build or verification commands
3. Commit with the suggested message pattern
4. Push to `main`
5. Optionally add 2-3 screenshots or a short note in the repo discussion/README if useful

---

### Day 1: Client Session Recovery

Scope:

- Persist active client queue session in `localStorage`
- Restore session after refresh
- Add frontend config files for API/WebSocket URLs
- Fix misleading admin analytics wording

Deliverable:

- Better client UX with no lost ticket on refresh

Suggested commit:
`day 1: add client session recovery and frontend config cleanup`

Status:

- Completed locally

---

### Day 2: Backend Environment Configuration

Scope:

- Move JWT secret to environment variables
- Make token expiry configurable
- Make Redis host/port configurable in a single config path
- Make bootstrap admin credentials configurable

Deliverable:

- Backend can run across environments without hardcoded secrets

Suggested commit:
`day 2: move backend auth and runtime settings to env config`

---

### Day 3: Secure Admin Setup

Scope:

- Remove public unrestricted admin signup from normal flow
- Add guarded bootstrap behavior for first admin or invite-only creation
- Improve admin auth validation and error handling

Deliverable:

- More credible admin authentication design

Suggested commit:
`day 3: tighten admin onboarding and authentication flow`

---

### Day 4: Queue Model Refactor

Scope:

- Introduce queue metadata model in the backend
- Stop relying on hardcoded queue IDs in the admin UI
- Add a queue listing endpoint

Deliverable:

- Queues become real data, not frontend constants

Suggested commit:
`day 4: replace hardcoded queue ids with backend queue records`

---

### Day 5: Admin Queue Management UI

Scope:

- Add create/select/manage queue UI in admin dashboard
- Allow admins to define queue name and queue key
- Improve queue switching UX

Deliverable:

- Admin can manage queues from the product itself

Suggested commit:
`day 5: add admin queue management interface`

---

### Day 6: Human-Friendly Ticket Numbers

Scope:

- Add display ticket numbers like `A-001`
- Keep internal IDs separate from displayed ticket numbers
- Show ticket numbers in both admin and client views

Deliverable:

- Queue feels like a real business system instead of a prototype

Suggested commit:
`day 6: introduce human friendly ticket numbering`

---

### Day 7: Persistent Current Serving State

Scope:

- Store current serving on the backend
- Include current serving in queue updates
- Restore current serving after page refresh or reconnect

Deliverable:

- Shared real-time serving state across sessions

Suggested commit:
`day 7: persist current serving state in backend`

---

### Day 8: Queue Action Improvements

Scope:

- Add actions for remove, requeue, and mark no-show
- Improve admin controls and queue item state transitions
- Handle empty queue and invalid action states more cleanly

Deliverable:

- Better real-world queue operations

Suggested commit:
`day 8: expand admin queue actions and state handling`

---

### Day 9: Analytics Correction

Scope:

- Separate all-time metrics from today metrics
- Add queue-scoped analytics
- Fix analytics naming and calculation consistency

Deliverable:

- Admin dashboard metrics become trustworthy

Suggested commit:
`day 9: correct analytics calculations and reporting labels`

---

### Day 10: Better ETA Estimation

Scope:

- Replace placeholder `position * 3` estimate
- Calculate ETA from historical service or wait data
- Show queue-specific estimated wait more clearly

Deliverable:

- More realistic wait estimation for users

Suggested commit:
`day 10: add data driven wait time estimation`

---

### Day 11: Public Queue Display Screen

Scope:

- Add a display-only queue board page
- Show now serving, next up, and waiting count
- Design for kiosk/TV readability

Deliverable:

- Product gains a useful operational display mode

Suggested commit:
`day 11: add public queue display board`

---

### Day 12: Backend Refactor

Scope:

- Split backend into route modules, services, and config
- Reduce logic concentration in `main.py`
- Keep behavior unchanged where possible

Deliverable:

- Cleaner architecture and more maintainable codebase

Suggested commit:
`day 12: refactor backend into routes services and config modules`

---

### Day 13: Automated Test Coverage

Scope:

- Add tests for join, leave, next, auth, and queue position flows
- Add at least one regression test for reconnect/session behavior
- Document how to run tests

Deliverable:

- Project becomes demonstrably engineered, not just implemented

Suggested commit:
`day 13: add backend tests for queue and auth flows`

---

### Day 14: Documentation Upgrade

Scope:

- Update root README to match actual architecture
- Document env setup, queue flow, and screenshots
- Add a short architecture section and API summary

Deliverable:

- Recruiters and reviewers can understand the project quickly

Suggested commit:
`day 14: refresh project documentation and setup guide`

---

### Day 15: Mobile Decision and Final Polish

Scope:

- Either implement the first real mobile screen or clearly mark mobile as future work
- Remove misleading scaffold assumptions
- Final UI polish and cleanup pass

Deliverable:

- Repo ends in a clean, intentional state

Suggested commit:
`day 15: finalize mobile direction and polish release state`

---

## Recommended Daily Push Pattern

Use this simple command sequence each day:

```bash
git add .
git commit -m "day X: <your scoped change>"
git push origin main
```

## Important GitHub Note

Your GitHub profile URL is not enough to push code. To push this repository, you still need a specific repository URL such as:

- `https://github.com/<username>/QuickQ.git`
- `git@github.com:<username>/QuickQ.git`

Once the repository exists, connect it with:

```bash
git remote add origin <repo-url>
git push -u origin main
```
