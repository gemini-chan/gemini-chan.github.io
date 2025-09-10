/**
 * @fileoverview Defines strongly-typed custom events for the application.
 *
 * This file serves as the central repository for all custom event types used
 * across the application, ensuring type safety and consistency in component
 * communication. By defining our events here, we create a clear and
 * self-documenting API for how different parts of the system interact.
 *
 * This is a key part of our "Sacred Architectural Dance," ensuring that the
 * "whispers" between our components are precise, eloquent, and perfectly
 * understood.
 *
 * @see /docs/adr/003-strongly-typed-events.md
 */

// TurnManager Events
export class TurnStartEvent extends CustomEvent<{ turnId: string }> {
  constructor(detail: { turnId: string }) {
    super('turn-start', { detail, bubbles: true, composed: true });
  }
}

export class TurnEndEvent extends CustomEvent<{ turnId: string; status: 'complete' | 'error' }> {
  constructor(detail: { turnId: string; status: 'complete' | 'error' }) {
    super('turn-end', { detail, bubbles: true, composed: true });
  }
}

// SessionManager Events
export class SessionIdChangedEvent extends CustomEvent<{ sessionId: string | null }> {
  constructor(sessionId: string | null) {
    super('session-id-changed', {
      detail: { sessionId },
      bubbles: true,
      composed: true,
    });
  }
}

// AudioManager Events
export class MicrophoneEvent extends CustomEvent<{ message: string }> {
  constructor(message: string) {
    super('microphone', {
      detail: { message },
      bubbles: true,
      composed: true,
    });
  }
}

// This is a global type helper to ensure that our event listeners are strongly typed.
declare global {
  interface HTMLElementEventMap {
    'turn-start': TurnStartEvent;
    'turn-end': TurnEndEvent;
    'session-id-changed': SessionIdChangedEvent;
    'microphone': MicrophoneEvent;
  }
}