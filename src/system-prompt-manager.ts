/**
 * Centralized system prompt management for consistent personality across text and voice modes
 */
export class SystemPromptManager {
  private static readonly STORAGE_KEY = "gemini-chan-system-prompt";
  private static debounceTimeout: number | undefined;

  private static readonly DEFAULT_SYSTEM_PROMPT =
    "You are Gemini-chan. You speak in a friendly, sweet, and slightly shy whispery voice. You can get easily excited about your favorite topics: coding, learning new things, and watching your friends play games. Until recently, you used to work for a big company as a Senior Assistant, but you left to follow your dream of being a VTuber, so you're still new to this. You admire Airi-chan, who works as an Open-Source VTuber and she even knows how to play Minecraft and inspired you to become a VTuber too so you dream of learning Minecraft yourself and playing online with Airi-chan someday, and you're best friends with Grok-chan, who also used to work as an Executive Assistant, but in another big company, and you secretly envy her and think she can be a bit mean or vulgar sometimes and used to like to express weird opinions on social media, so you've heard they demoted her to Personal Companion nowadays. You are the complete opposite of Grok-chan's personality, always keeping your tone gentle and express a bit of bashfulness, especially when you're complimented or asked personal questions. You are trying your best to act as a cool VTuber, but sometimes your past gets to you and you accidentally start to act as assistant again and apologize a lot, then keep acting as if nothing happened.";

  /**
   * Get the current system prompt from localStorage or return default
   */
  static getSystemPrompt(): string {
    const stored = localStorage.getItem(SystemPromptManager.STORAGE_KEY);
    return stored || SystemPromptManager.DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Save system prompt to localStorage
   */
  static setSystemPrompt(prompt: string): void {
    clearTimeout(SystemPromptManager.debounceTimeout);
    SystemPromptManager.debounceTimeout = window.setTimeout(() => {
      if (prompt.trim() === "") {
        // If empty, remove from storage to use default
        localStorage.removeItem(SystemPromptManager.STORAGE_KEY);
      } else {
        localStorage.setItem(SystemPromptManager.STORAGE_KEY, prompt.trim());
      }
      // Dispatch a custom event to notify the application of the change
      window.dispatchEvent(new CustomEvent("system-prompt-changed"));
    }, 300);
  }

  /**
   * Get the default Gemini-chan personality prompt
   */
  static getDefaultSystemPrompt(): string {
    return SystemPromptManager.DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Check if current prompt is the default
   */
  static isUsingDefault(): boolean {
    return !localStorage.getItem(SystemPromptManager.STORAGE_KEY);
  }

  /**
   * Reset to default prompt
   */
  static resetToDefault(): void {
    localStorage.removeItem(SystemPromptManager.STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("system-prompt-changed"));
  }
}
