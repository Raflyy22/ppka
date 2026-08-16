# PPKA Simulator — Phase 4 Simulator Engine

Phase 4 turns the app into a playable simulator foundation.

## Engine
- Simulation clock
- Scenario loading
- Train state machine
- Train movement/progress
- Departure/arrival events
- Delay calculation
- Score and XP
- Pause/resume/stop
- Operator hold/release actions
- Live event log
- Simulation state serialization

## Mobile UI
- Live operation clock
- Score panel
- Train progress
- Event log
- Operator controls
- Start / pause / resume / finish

## Persistence
`POST /api/simulations` stores the current simulation state per authenticated user in Netlify Blobs.

## Important
This is the first playable engine foundation. Realistic railway interlocking, signal aspects, route locking, platform occupation, timetable conflicts, incidents, dispatcher decisions, and multiplayer/network synchronization should be layered on top in later simulator phases rather than faking them in the UI.
