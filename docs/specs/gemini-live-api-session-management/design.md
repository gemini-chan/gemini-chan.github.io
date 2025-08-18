# Technical Design: Gemini Live API Session Management

### Overview

This document outlines the technical design for the **Gemini Live API Session Management** feature. The goal is to create a robust, resilient connection manager that can handle the Gemini Live API's specific session and connection lifecycle. The proposed solution involves a client-side `SessionManager` that will handle session resumption and graceful connection termination, ensuring a seamless experience even with periodic network resets.

### Architecture

Key decisions:
- Do not resume across page reloads. The resumption handle is only used within the current page lifecycle to simplify UX. The handle may be temporarily persisted per mode to facilitate resume within the same tab/session, but on explicit reset or reload it is not honored for resume.
- Call-first resume flow: The UI attempts to resume call sessions first; on failure a new session is started with a clear toast. Text parity can be introduced later.
- Transcript display is coupled to session action: fresh call clears the transcript, resumed call pre-populates with last summarized transcript.


The proposed architecture extends the existing `BaseSessionManager` to handle session resumption and graceful connection termination. This approach reuses the existing session management infrastructure while adding the necessary resilience.

```mermaid
sequenceDiagram
    participant App as Application
    participant BSM as BaseSessionManager
    participant GLA as Gemini Live API

    App->>BSM: initSession()
    BSM->>GLA: connect(sessionResumptionHandle=null)
    GLA-->>BSM: onmessage(sessionResumptionUpdate)
    BSM->>BSM: storeNewHandle(newHandle)
    GLA-->>BSM: onmessage(goAway)
    BSM->>BSM: reconnectSession()
    BSM->>GLA: connect(sessionResumptionHandle=storedHandle)
    GLA-->>BSM: onopen(), session resumed
```

**Data Flow:**
1.  The Application calls `initSession()` on a `BaseSessionManager` subclass (`TextSessionManager` or `CallSessionManager`).
2.  The manager connects to the Gemini Live API. On the first connection, the resumption handle is null.
3.  The API sends a `sessionResumptionUpdate` message with a new handle, which the manager stores.
4.  Before the connection terminates, the API sends a `GoAway` message.
5.  The `BaseSessionManager` detects this message and triggers a reconnection using the stored handle.

### Components and Interfaces

#### 1. BaseSessionManager (Modified)
*   **Responsibility:** Manages the session lifecycle, including session resumption and graceful disconnection.
*   **Interface (New and Modified Methods):**
    *   `initSession(resumptionHandle?: string): Promise<boolean>`: Modified to accept an optional resumption handle.
    *   `reconnectSession(): Promise<void>`: A new method to handle reconnection logic.
    *   The `onmessage` callback within `getCallbacks()` will be updated to parse `sessionResumptionUpdate` and `goAway` messages.

#### 2. TextSessionManager & CallSessionManager (Subclasses)
*   **Responsibility:** These classes will inherit the new session management capabilities from `BaseSessionManager` with minimal changes.

### Data Models

#### Session State
The `SessionManager` will maintain an internal state object:

| Property                | Type          | Description                                         |
|-------------------------|---------------|-----------------------------------------------------|
| `currentHandle`         | `string` \| `null` | The session resumption handle from the API.         |
| `isConnected`           | `boolean`     | The current connection status.                      |
| `lastMessageTimestamp`  | `number`      | Timestamp of the last received message for timeouts. |

### Error Handling

| Error Condition              | Handling Strategy                                                                                             |
|------------------------------|---------------------------------------------------------------------------------------------------------------|
| Invalid/Expired Token        | The `SessionManager` will catch the error on connection, clear the expired handle, and start a new session.   |
| Network Failure on Reconnect | The `SessionManager` will implement an exponential backoff strategy for reconnection attempts.                |
| Unexpected Disconnection     | If the connection is lost without a `GoAway` message, the `SessionManager` will immediately attempt to reconnect. |

### Testing Strategy

*   **Unit Tests:** Each method in the `SessionManager` will be tested in isolation. Mocks will be used for the Gemini Live API to simulate different scenarios (e.g., receiving a `GoAway` message, an invalid token error).
*   **Integration Tests:** The `SessionManager` will be tested against a live or sandboxed Gemini Live API to ensure it correctly handles the connection lifecycle.
*   **End-to-End (E2E) Tests:** An automated test will simulate a full conversation, including a connection reset, to verify that the session is seamlessly resumed.