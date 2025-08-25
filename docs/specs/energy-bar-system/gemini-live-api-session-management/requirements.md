# Feature: Gemini Live API Session Management

## 1. Introduction
This feature manages session lifecycle for Gemini Live API, including resumption across connection resets, graceful reconnection (GoAway), and context window compression. The client maintains an in-memory resumption handle per session type and surfaces non-intrusive UX to the user.

**Integration with Energy Bar System:** This feature must coordinate with the **Energy Bar System** (see `../energy-bar-system/requirements.md`) to handle model transitions based on energy levels. Not all models support session resumption, requiring fallback mechanisms when energy levels change.

Constraints and decisions:
- No resume on page reload: Resuming across reloads is explicitly out of scope to avoid UX ambiguity and complexity. Resume is only attempted within the same page lifecycle.
- Per-mode behavior: Both Call (STS) and Text (TTS) sessions attempt resume first; if resume fails, a new session is started and the user is notified via toast.
- Transcript UX: New call -> empty transcript; resumed call -> previously summarized transcript is pre-populated. Text chat maintains persistent transcript across resumptions.
- Model compatibility: Resumption handles from higher energy models (3, 2 for STS; 2 for TTS) are incompatible with lower energy models (1) due to different model capabilities.
- TTS Transcript Preservation: As per dual-input-mode requirements, the text conversation transcript is preserved across the application lifecycle, but the session resumption handle is ephemeral and does not persist across page reloads.

This document outlines the requirements for managing persistent connections (sessions) in the Gemini Live API. The goal is to handle the unique challenges of the API, such as time limits and connection terminations, to provide a stable and seamless user experience. While `contextWindowCompression` is implemented, sessions still drop, indicating that the primary issue is related to the underlying connection lifecycle.

## 2. Epics

### 2.1. Epic: Seamless Session Resumption
This epic focuses on maintaining a continuous session even when the server connection is periodically reset. This will be achieved by implementing a session resumption mechanism using tokens provided by the server. This applies to both STS (voice call) and TTS (text chat) sessions as defined in the dual-input-mode feature (see `../dual-input-mode/requirements.md`).

### 2.2. Epic: Graceful Connection Handling
This epic covers the client's ability to react to server-sent messages, such as `GoAway`, to proactively manage the connection lifecycle and gracefully handle disconnections before they occur.

### 2.3. Epic: Fallback Context Injection
This epic addresses the scenario where a session cannot be resumed, particularly when falling back to a model that does not support session resumption. This is directly triggered by energy level changes as defined in the **Energy Bar System** (see `../energy-bar-system/requirements.md`, Epic 2.1.6).

#### 2.3.1. User Story: Re-inject Transcript on Fallback
- **Priority**: High
- **As a** user in a voice or text session,
- **I want** the system to automatically re-inject the conversation transcript when my session falls back to a non-resumable model,
- **so that** the context of the conversation is maintained seamlessly.
- **Energy Bar Dependency**: Triggered when STS energy drops from level 2 to 1, or TTS energy drops from 2 to 1.
- **Dual-Input Mode Integration**: TTS sessions preserve their persistent context through fallback, while STS sessions maintain ephemeral context.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Fallback to a non-resumable model
  Given I am in a voice session with a resumable model
  And my energy level drops, triggering a fallback to a non-resumable model
  When the new session is established
  Then the entire transcript of the previous session is injected as context.
```

#### 2.3.2. User Story: Summarize Transcript on Fallback
- **Priority**: High
- **As a** user in a voice or text session,
- **I want** the system to summarize the transcript before re-injecting it on fallback,
- **so that** I don't lose the conversational context due to model limitations.
- **Mode-Specific Behavior**: TTS sessions maintain full persistent transcript history; STS sessions use ephemeral summaries.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Always summarize transcript on fallback (STS)
  Given I am in a voice session
  When the session falls back to a non-resumable model
  Then the system uses the summarization service to process the transcript
  And the summarized transcript, along with the last 4 turns of the conversation (2 user, 2 assistant), is injected as context into the new session.

Scenario: Always summarize transcript on fallback (TTS)
  Given I am in a text chat session
  When the session falls back to a non-resumable model (TTS level 2 to 1)
  Then the system uses the summarization service to process the transcript
  And the summarized transcript is injected as context into the new session
  And the full text transcript remains visible in the chat interface.
```

#### 2.3.3. User Story: Conditionally Summarize Transcript on Fallback
- **Priority**: Low
- **As a** developer,
- **I want** the system to trigger the summarization service only when the transcript is long enough to require it,
- **so that** we can conserve resources and avoid unnecessary processing.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Conditionally summarize a transcript on fallback
  Given a tokenizer is available to measure transcript length
  And I am in a voice session
  And the session transcript is short enough to fit within the model's context window
  When the session falls back to a non-resumable model
  Then the system injects the full transcript without summarization.

Scenario: Summarize a long transcript on fallback
  Given a tokenizer is available to measure transcript length
  And I am in a voice session
  And the session transcript is too long to fit within the model's context window
  When the session falls back to a non-resumable model
  Then the system uses the summarization service to shorten the transcript.
```

#### 2.3.4. User Story: Resume with Call Summary Context  
- **Priority**: High
- **As a** user starting a new voice session,
- **I want** the system to use a previous call summary as context when resuming with an incompatible token,
- **so that** I can start a high-quality session even when falling back from a lower energy level.
- **Energy Bar Integration**: This occurs when STS energy resets to 3 but a resumption handle from level 1 exists.

#### 2.3.5. User Story: Maintain TTS Session Persistence
- **Priority**: High
- **As a** user in a text chat session,
- **I want** my text conversation to be preserved and resumed seamlessly across connection resets and energy level changes,
- **so that** I maintain continuity in my text-based interactions as defined in the dual-input-mode requirements.

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: TTS session persists across reconnection
  Given I have an active TTS session with conversation history
  When the connection is reset due to GoAway or network issues
  Then the system automatically resumes the TTS session with the in-memory handle
  And my previous text conversation context is maintained.

Scenario: TTS session handles energy fallback
  Given I have a TTS session at energy level 2
  When the energy drops to level 1 (non-resumable model)
  Then the system triggers handleFallback for TTS mode
  And the text transcript is summarized and re-injected
  And the full conversation remains visible in the chat interface.
```

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

##### Acceptance Criteria (Gherkin Syntax)
```gherkin
Scenario: Start high-energy session with call summary context
  Given I have a session resumption token from an energy level 1 STS session
  And I have a recent call summary in my call history
  When I attempt to start a new call session at energy level 3
  Then the system detects the incompatible handle (level 1 vs level 3 model)
  And the system clears the incompatible resumption handle
  And the system uses the latest call summary as context for the new session
  And the session starts successfully with the enriched context.

Scenario: Handle energy-triggered model fallback
  Given I am in an STS call session at energy level 2
  And the model supports session resumption
  When a rate limit causes energy to drop to level 1
  Then the system triggers handleFallback mechanism
  And the transcript is summarized using SummarizationService
  And the summarized context is injected into the new session.
```

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