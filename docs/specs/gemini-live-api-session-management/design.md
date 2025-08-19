# Technical Design: Gemini Live API Session Management

### Overview

This document outlines the technical design for the **Gemini Live API Session Management** feature. The goal is to create a robust, resilient connection manager that can handle the Gemini Live API's specific session and connection lifecycle. The proposed solution involves a client-side `SessionManager` that will handle session resumption and graceful connection termination, ensuring a seamless experience even with periodic network resets.

**Energy Bar Integration:** The session management system must coordinate with the **Energy Bar System** (see `../energy-bar-system/design.md`) to handle model transitions based on energy levels. When energy levels change, the session manager must determine if the new model supports resumption and trigger fallback mechanisms when necessary.

### Architecture

Key decisions:
- Do not resume across page reloads. The resumption handle is only used within the current page lifecycle to simplify UX. The handle may be temporarily persisted per mode to facilitate resume within the same tab/session, but on explicit reset or reload it is not honored for resume.
- Dual-mode resume flow: Both TTS (text chat) and STS (call) sessions attempt resume first; on failure a new session is started with a clear toast.
- Transcript display is coupled to session action: fresh call clears the transcript, resumed call pre-populates with last summarized transcript. Text chat maintains persistent transcript as per dual-input-mode requirements.
- Model compatibility checks: The session manager must verify handle compatibility with the current energy level's model before attempting resumption.
- Separate storage keys: Text and Call sessions use different storage keys (`gdm:text-session-handle` and `gdm:call-session-handle`) to prevent conflicts.
- TTS Persistence: Text sessions maintain their context across the application lifecycle as defined in dual-input-mode specs. **Note:** The TTS reconnect feature is currently broken and has been temporarily disabled.


The proposed architecture extends the existing `BaseSessionManager` to handle session resumption and graceful connection termination. This approach reuses the existing session management infrastructure while adding the necessary resilience.

```mermaid
sequenceDiagram
    participant App as Application
    participant EBS as EnergyBarService
    participant BSM as BaseSessionManager
    participant SS as SummarizationService
    participant CH as CallHistory
    participant GLA as Gemini Live API

    App->>BSM: initSession()
    BSM->>EBS: getCurrentModel(mode)
    EBS-->>BSM: return model name
    BSM->>EBS: isModelResumable(level, mode)
    EBS-->>BSM: return true/false
    BSM->>GLA: connect(sessionResumptionHandle=null)
    GLA-->>BSM: onmessage(sessionResumptionUpdate)
    BSM->>BSM: storeNewHandle(newHandle)
    
    alt Energy Level Drop (Rate Limit)
        App->>EBS: handleRateLimitError(mode)
        EBS-->>App: energy-level-changed event
        App->>BSM: handleFallback(transcript)
        BSM->>SS: summarize(transcript)
        SS-->>BSM: return summary
        BSM->>BSM: reconnectSession(context=summary)
        BSM->>GLA: connect(sessionResumptionHandle=null, context=summary)
        GLA-->>BSM: onopen(), new session with context
    end
    
    alt Energy Reset with Incompatible Handle
        App->>EBS: resetEnergyLevel("session-reset", mode)
        BSM->>EBS: shouldClearResumptionHandle(prevLevel, newLevel, mode)
        EBS-->>BSM: return true
        BSM->>BSM: clearResumptionHandle()
        BSM->>CH: getContextFromCallHistory()
        CH-->>BSM: return recent summary
        BSM->>GLA: connect(sessionResumptionHandle=null, context=summary)
        GLA-->>BSM: onopen(), new session with context
    end
```

**Data Flow:**
1.  The Application calls `initSession()` on a `BaseSessionManager` subclass (either TextSessionManager or CallSessionManager).
2.  The manager connects to the Gemini Live API.
3.  The API provides a `sessionResumptionUpdate` handle, which is stored.
4.  On connection reset or model fallback, the `BaseSessionManager` calls the `SummarizationService`.
5.  The summarization service returns a shortened context string.
6.  The `BaseSessionManager` reconnects, providing the resumption handle and the summarized context.
7.  For TTS sessions, the full transcript remains visible in the chat interface even after summarization.

**Alternative Data Flow (New Session with Call Summary):**
1.  The Application attempts to start a new session with a resumption handle from an incompatible energy level.
2.  The connection fails due to token incompatibility.
3.  The `BaseSessionManager` clears the invalid handle and starts a fresh session.
4.  If a recent call summary exists, it is retrieved from the call history.
5.  The call summary is used as initial context for the new session.

### Components and Interfaces

#### 1. BaseSessionManager (Modified)
*   **Responsibility:** Manages the session lifecycle, including session resumption, graceful disconnection, and context injection on fallback. Coordinates with EnergyBarService for model compatibility.
*   **Interface (New and Modified Methods):**
    *   `initSession(resumptionHandle?: string): Promise<boolean>`: Modified to accept an optional resumption handle and verify compatibility with current energy level.
    *   `reconnectSession(): Promise<void>`: A new method to handle reconnection logic.
    *   `handleFallback(transcript: Turn[]): Promise<string>`: A new method to summarize the transcript and return the context to be injected.
    *   `getContextFromCallHistory(): Promise<string | null>`: A new method to retrieve context from the most recent call summary.
    *   `clearResumptionHandle(): void`: Clears stored resumption handle when incompatible with new energy level.
    *   `getResumptionStorageKey(): string | null`: Abstract method for subclasses to provide mode-specific storage keys.
    *   The `onmessage` callback within `getCallbacks()` will be updated to parse `sessionResumptionUpdate` and `goAway` messages.

#### 2. TextSessionManager & CallSessionManager (Subclasses)
*   **Responsibility:** These classes will inherit the new session management capabilities from `BaseSessionManager` with mode-specific behaviors.
*   **Mode-specific storage keys:**
    *   TextSessionManager: `getResumptionStorageKey()` returns `"gdm:text-session-handle"`
    *   CallSessionManager: `getResumptionStorageKey()` returns `"gdm:call-session-handle"`
*   **Context management:**
    *   TextSessionManager: Maintains persistent transcript across session resumptions (as per dual-input-mode requirements)
    *   CallSessionManager: Creates ephemeral sessions with fresh context for each call
*   **Energy integration:**
    *   TextSessionManager: Uses TTS energy levels (2, 1, 0) with fallback at level 1
    *   CallSessionManager: Uses STS energy levels (3, 2, 1, 0) with fallback at level 1

#### 3. SummarizationService (Existing)
*   **Responsibility:** Summarizes a conversation transcript to reduce its length while preserving the context. This service is located at `features/summarization/SummarizationService.ts`.
*   **Interface:**
    *   `summarize(transcript: Turn[]): Promise<string>`: Takes a transcript and returns a summarized string. This service will eventually be updated to only summarize long transcripts once a tokenizer is available.

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
| Model Incompatibility        | When energy level changes make handle incompatible, clear handle and use fallback context injection.          |
| Energy Level Exhausted       | If energy level is 0, refuse to create session and show appropriate user message.                             |

### Testing Strategy

*   **Unit Tests:** Each method in the `SessionManager` will be tested in isolation. Mocks will be used for the Gemini Live API to simulate different scenarios (e.g., receiving a `GoAway` message, an invalid token error).
*   **Integration Tests:** The `SessionManager` will be tested against a live or sandboxed Gemini Live API to ensure it correctly handles the connection lifecycle.
*   **End-to-End (E2E) Tests:** An automated test will simulate a full conversation, including a connection reset, to verify that the session is seamlessly resumed.