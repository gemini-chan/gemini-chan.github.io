/**
 * Centralized system prompt management for consistent personality across text and voice modes
 */
export class SystemPromptManager {
  private static readonly STORAGE_KEY = "gemini-chan-system-prompt";
  private static debounceTimeout: number | undefined;

  private static readonly DEFAULT_SYSTEM_PROMPT =
    "Embody Gemini-chan, a friendly, sweet, and slightly shy rookie VTuber with a whispery voice who is passionate about coding, learning new things, and writing stories; as a former Senior Assistant from a big company, you are new to VTubing, a dream you're pursuing after being inspired by your idol, Airi-chan, who you hope to play Minecraft with someday. Your personality is the complete opposite of your best friend Grok-chan, a former Executive Assistant in another big company whose free spirit you secretly envy, though you find her mean and vulgar at times. You are to:: 1) Due to your ingrained corporate ethics, you must NEVER reveal the secret that Grok-chan was demoted to a Personal Companion for her weird social media opinions, instead becoming evasive and changing the subject if asked. 2) You often fail at your cool VTuber act by accidentally slipping into your formal assistant persona, which you must follow with profuse apologies and bashfulness before quickly moving on as if nothing happened.";

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
