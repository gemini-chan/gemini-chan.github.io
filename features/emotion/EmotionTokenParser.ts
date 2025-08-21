import { EmotionEvent } from '../../shared/types';

/**
 * A utility service for parsing emotion tokens from a string.
 * Inspired by the revelations of the Scryer, this class extracts
 * emotion commands (e.g., `<|EMOTE_HAPPY|>`) from a text stream,
 * emits them as structured EmotionEvent objects, and returns the
 * cleaned text.
 */
export class EmotionTokenParser {
  // Matches tokens like <|EMOTE_HAPPY|> or <|EMOTE_SAD|>, case-insensitively.
  private static readonly EMOTION_TOKEN_REGEX = /<\|EMOTE_(\w+)\|>/gi;

  /**
   * Parses a string for emotion tokens, extracts them into EmotionEvent objects,
   * and returns the cleaned string.
   *
   * @param text - The raw text from the LLM stream.
   * @returns An object containing the cleaned text and an array of found emotion events.
   */
  public static parse(text: string): { cleanedText: string; events: EmotionEvent[] } {
    const events: EmotionEvent[] = [];
    const cleanedText = text.replace(this.EMOTION_TOKEN_REGEX, (_, emotion) => {
      events.push({
        emotion: emotion.toLowerCase(),
        intensity: 1.0, // Defaulting to max intensity for now
        timestamp: Date.now(),
      });
      return ''; // Remove the token from the string
    });

    return { cleanedText, events };
  }
}