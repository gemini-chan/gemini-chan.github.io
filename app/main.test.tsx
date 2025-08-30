import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/dom';
import { GdmLiveAudio } from './main';
import { ChatView } from '../components/ChatView';

// Mock the SessionManager module
const mockSessionManagerInstance = {
  textTranscript: [] as { text: string; speaker: string }[],
  constructVpuMessagePayload: vi.fn(),
  initTextSession: vi.fn().mockResolvedValue(true),
  messageStatuses: {},
  messageRetryCount: {},
};

vi.mock('./SessionManager.ts', () => {
  return {
    SessionManager: vi.fn(() => mockSessionManagerInstance),
  };
});

// Mock the VPUService module
vi.mock('@features/vpu/VPUService', () => {
  const mockVPUService = {
    sendMessageWithProgress: vi.fn(),
  };
  return {
    TextSessionManager: vi.fn(() => mockVPUService),
    CallSessionManager: vi.fn(() => mockVPUService),
  };
});

// Mock the NPUService module
vi.mock('@features/ai/NPUService', () => {
  const mockNPUService = {
    analyzeAndAdvise: vi.fn().mockResolvedValue({ 
      suggestions: [],
      analysis: 'Mock analysis'
    }),
  };
  return {
    NPUService: vi.fn(() => mockNPUService),
  };
});

// Mock window.scrollTo as it's not implemented in JSDOM
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(() => ({})),
});

describe('main component', () => {
  let mainComponent: GdmLiveAudio;

  beforeEach(async () => {
    // Set up localStorage for API key
    localStorage.setItem('gemini-api-key', 'test-key');
    
    // Reset the mock's state
    mockSessionManagerInstance.textTranscript = [{ text: 'Hello! How can I help you?', speaker: 'model' }];
    
    // Create and append the gdm-live-audio element to the document body
    mainComponent = document.createElement('gdm-live-audio') as GdmLiveAudio;
    document.body.appendChild(mainComponent);
    
    // Wait for the component to update
    await mainComponent.updateComplete;
  });

  afterEach(() => {
    // Clean up the document body
    document.body.innerHTML = '';
    
    // Remove API key from localStorage
    localStorage.removeItem('gemini-api-key');
  });

  it('should display a user message after sending', async () => {
    // Find the chat-view component within the gdm-live-audio's shadow DOM
    let chatView: ChatView | null = null;
    await waitFor(() => {
      chatView = mainComponent.shadowRoot?.querySelector('chat-view') as ChatView;
      expect(chatView).toBeTruthy();
    });

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
      expect(chatView?.transcript).toHaveLength(2);
    });

    // Assert that the chat view's transcript property contains the message
    expect(chatView?.transcript[1].text).toBe('Hello, world!');
    expect(chatView?.transcript[1].speaker).toBe('user');
  });
});
