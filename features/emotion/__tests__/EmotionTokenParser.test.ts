import { EmotionTokenParser } from '../EmotionTokenParser';
import { assert } from '@open-wc/testing';

suite('EmotionTokenParser', () => {
  test('should extract a single emotion token and clean the text', () => {
    const rawText = "Hello there! <|EMOTE_HAPPY|> How are you?";
    const { cleanedText, events } = EmotionTokenParser.parse(rawText);

    assert.equal(cleanedText, "Hello there!  How are you?", "The text should be cleaned of the token.");
    assert.lengthOf(events, 1, "There should be one emotion event.");
    assert.equal(events[0].emotion, "happy", "The emotion should be 'happy'.");
    assert.closeTo(events[0].timestamp, Date.now(), 100, "Timestamp should be recent.");
  });

  test('should extract multiple emotion tokens', () => {
    const rawText = "<|EMOTE_JOY|>What a wonderful day!<|EMOTE_EXCITED|>";
    const { cleanedText, events } = EmotionTokenParser.parse(rawText);

    assert.equal(cleanedText, "What a wonderful day!", "The text should be cleaned of all tokens.");
    assert.lengthOf(events, 2, "There should be two emotion events.");
    assert.equal(events[0].emotion, "joy", "The first emotion should be 'joy'.");
    assert.equal(events[1].emotion, "excited", "The second emotion should be 'excited'.");
  });

  test('should handle text with no emotion tokens', () => {
    const rawText = "This is a plain sentence.";
    const { cleanedText, events } = EmotionTokenParser.parse(rawText);

    assert.equal(cleanedText, rawText, "The text should remain unchanged.");
    assert.lengthOf(events, 0, "There should be no emotion events.");
  });

  test('should be case-insensitive to the token tag', () => {
    const rawText = "Feeling <|emote_SAD|>.";
    const { cleanedText, events } = EmotionTokenParser.parse(rawText);

    assert.equal(cleanedText, "Feeling .", "The text should be cleaned of the token.");
    assert.lengthOf(events, 1, "There should be one emotion event.");
    assert.equal(events[0].emotion, "sad", "The emotion should be 'sad' and lowercased.");
  });

  test('should handle empty strings', () => {
    const rawText = "";
    const { cleanedText, events } = EmotionTokenParser.parse(rawText);

    assert.equal(cleanedText, "", "The text should be an empty string.");
    assert.lengthOf(events, 0, "There should be no emotion events.");
  });
});