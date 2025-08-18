# Feature: Gemini Live API Session Management

## 1. Introduction
This feature manages session lifecycle for Gemini Live API, including resumption across connection resets, graceful reconnection (GoAway), and context window compression. The client maintains a resumption handle per session type and surfaces non-intrusive UX to the user.

Constraints and decisions:
- No resume on page reload: Resuming across reloads is explicitly out of scope to avoid UX ambiguity and complexity. Resume is only attempted within the same page lifecycle.
- Per-mode behavior: Call sessions attempt resume first; if resume fails, a new session is started and the user is notified via toast. Text-session parity can be added later.
- Transcript UX: New call -> empty transcript; resumed call -> previously summarized transcript is pre-populated.

This document outlines the requirements for managing persistent connections (sessions) in the Gemini Live API. The goal is to handle the unique challenges of the API, such as time limits and connection terminations, to provide a stable and seamless user experience. While `contextWindowCompression` is implemented, sessions still drop, indicating that the primary issue is related to the underlying connection lifecycle.

## 2. Epics

### 2.1. Epic: Seamless Session Resumption
This epic focuses on maintaining a continuous session even when the server connection is periodically reset. This will be achieved by implementing a session resumption mechanism using tokens provided by the server.

### 2.2. Epic: Graceful Connection Handling
This epic covers the client's ability to react to server-sent messages, such as `GoAway`, to proactively manage the connection lifecycle and gracefully handle disconnections before they occur.
#### 2.1.1. User Story: Obtain Session Resumption Token
- **Priority**: High
- **As a** developer using the Gemini Live API,
- **I want** the server to provide a resumption token when a connection is about to be terminated,
- **so that** I can use this token to re-establish the session on a new connection.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Server provides a resumption token
  Given I have an active session with the Gemini Live API
  And the server is about to terminate the current connection
  When the server sends a message indicating the imminent disconnection
  Then the message includes a session resumption token.
```

#### 2.1.2. User Story: Re-establish Session with Token
- **Priority**: High
- **As a** developer using the Gemini Live API,
- **I want** to be able to start a new connection and provide the session resumption token,
- **so that** the server resumes the previous session without any loss of context.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Successfully resume a session
  Given I have received a session resumption token from the server
  And the previous connection has been terminated
  When I establish a new connection and provide the resumption token
  Then the server restores the previous session, and I can continue the conversation.

Scenario: Invalid or expired token
  Given I have a session resumption token
  When I try to resume a session with an invalid or expired token
  Then the server rejects the connection and provides a clear error message.
```
### 2.2. Epic: Graceful Connection Handling
This epic covers the client's ability to react to server-sent messages, such as `GoAway`, to proactively manage the connection lifecycle and gracefully handle disconnections before they occur.

#### 2.2.1. User Story: Proactively Handle Imminent Disconnection
- **Priority**: High
- **As a** developer using the Gemini Live API,
- **I want** to receive a `GoAway` message from the server before the connection is terminated,
- **so that** I can prepare for the disconnection and initiate a new connection.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Receive a GoAway message
  Given I have an active session with the Gemini Live API
  When the server is about to terminate the connection
  Then the server sends a `GoAway` message with the `timeLeft` before termination.
```

#### 2.2.2. User Story: Act on generationComplete Message
- **Priority**: Medium
- **As a** developer using the Gemini Live API,
- **I want** to be notified when the model has finished generating its current response,
- **so that** I can safely perform actions that should only occur after the model's turn is complete.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Model completes its generation
  Given the model is generating a response in an active session
  When the model finishes sending its complete response
  Then the server sends a `generationComplete` message.
```