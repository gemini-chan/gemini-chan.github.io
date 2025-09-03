# Task: Update GdmLiveAudio to Listen for Typed Turn Events

**Architectural Goal (The 'Why'):**

The `GdmLiveAudio` component (`app/main.tsx`) is the central orchestrator for our various manager classes. To make our system more robust and responsive to the conversation lifecycle, it needs to listen for the new, specific `turn-start` and `turn-end` events being dispatched by the `TurnManager`.

This step is foundational. For now, we will simply add event listeners and log the received events to the console. This will verify that the new communication channel is working correctly before we build more complex logic upon it.

**File to Modify:**
- `app/main.tsx`

**Implementation Steps (The 'What'):**

1.  **Import Event Types:** At the top of `app/main.tsx`, please import `TurnStartEvent` and `TurnEndEvent` from `../shared/events.ts`.
2.  **Add Event Listeners:** Locate the `firstUpdated` lifecycle method. Inside it, add event listeners to `this` for the `turn-start` and `turn-end` events, pointing to new handler methods.
3.  **Implement Handler Methods:** Create two new private methods within the `GdmLiveAudio` class:
    -   `private handleTurnStart(e: TurnStartEvent)`: This method should log the turn ID from the event details. For example: `console.log('Turn started:', e.detail.turnId);`
    -   `private handleTurnEnd(e: TurnEndEvent)`: This method should log the turn ID and the status from the event details. For example: `console.log('Turn ended:', e.detail.turnId, 'with status:', e.detail.status);`