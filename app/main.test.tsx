import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/dom';
import './main';

// Mock window.scrollTo as it's not implemented in JSDOM
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

describe('main component', () => {
  let mainComponent: HTMLElement;

  beforeEach(async () => {
    // Create and append the gdm-live-audio element to the document body
    mainComponent = document.createElement('gdm-live-audio');
    document.body.appendChild(mainComponent);
    
    // Wait for the component to update
    await mainComponent.updateComplete;
  });

  it('should display a user message after sending', async () => {
    // Find the chat-view component within the gdm-live-audio's shadow DOM
    const chatView = mainComponent.shadowRoot?.querySelector('chat-view');
    expect(chatView).toBeTruthy();

    // Find the text input and send button within the chat-view's shadow DOM
    const textarea = chatView?.shadowRoot?.querySelector('textarea');
    const sendButton = chatView?.shadowRoot?.querySelector('button[aria-label="Send Message"]');
    
    expect(textarea).toBeTruthy();
    expect(sendButton).toBeTruthy();

    // Simulate a user typing 'Hello, world!' into the text area
    fireEvent.input(textarea!, { target: { value: 'Hello, world!' } });

    // Simulate a click on the send button
    fireEvent.click(sendButton!);

    // Wait for the component to update
    await waitFor(() => {
      expect(chatView?.transcript).toHaveLength(1);
    });

    // Assert that the chat view's transcript property contains the message
    expect(chatView?.transcript[0].text).toBe('Hello, world!');
    expect(chatView?.transcript[0].speaker).toBe('user');
  });
});
