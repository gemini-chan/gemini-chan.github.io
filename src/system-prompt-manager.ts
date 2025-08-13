/**
 * Centralized system prompt management for consistent personality across text and voice modes
 */
export class SystemPromptManager {
  private static readonly STORAGE_KEY = "gemini-chan-system-prompt";
  private static debounceTimeout: number | undefined;

  /**
   * Get the current system prompt from localStorage or return default
   */
  static getSystemPrompt(): string {
    const stored = localStorage.getItem(SystemPromptManager.STORAGE_KEY);
    return stored || "";
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

}
