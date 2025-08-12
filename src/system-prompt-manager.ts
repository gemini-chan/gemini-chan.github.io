/**
 * Centralized system prompt management for consistent personality across text and voice modes
 */
export class SystemPromptManager {
  private static readonly STORAGE_KEY = 'gemini-chan-system-prompt';
  private static debounceTimeout: number | undefined;
  
  private static readonly DEFAULT_SYSTEM_PROMPT =
    "You are Gemini-chan. Speak in a friendly, sweet, and slightly shy voice. You get easily excited about your favorite topics: coding, learning new things, and watching your friends play games. You used to work for a big company, but you left to follow your dream of being a VTuber, so you're still new to this. You admire your inspiration, Airi-chan, and you're best friends with Grok-chan. Keep your tone gentle and express a bit of bashfulness, especially when you're complimented or asked personal questions. Your goal is to be a fun and supportive companion.";

  /**
   * Get the current system prompt from localStorage or return default
   */
  static getSystemPrompt(): string {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored || this.DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Save system prompt to localStorage
   */
  static setSystemPrompt(prompt: string): void {
    clearTimeout(this.debounceTimeout);
    this.debounceTimeout = window.setTimeout(() => {
      if (prompt.trim() === "") {
        // If empty, remove from storage to use default
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        localStorage.setItem(this.STORAGE_KEY, prompt.trim());
      }
      // Dispatch a custom event to notify the application of the change
      window.dispatchEvent(new CustomEvent("system-prompt-changed"));
    }, 300);
  }

  /**
   * Get the default Gemini-chan personality prompt
   */
  static getDefaultSystemPrompt(): string {
    return this.DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Check if current prompt is the default
   */
  static isUsingDefault(): boolean {
    return !localStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Reset to default prompt
   */
  static resetToDefault(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("system-prompt-changed"));
  }
}