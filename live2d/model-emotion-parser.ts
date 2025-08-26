import { createComponentLogger } from "@services/DebugLogger";

const logger = createComponentLogger("model-emotion-parser");

/**
 * Simplified emotion parser that extracts emotion from NPU response
 * and maps it to Live2D model parameters
 */

// Define the supported emotions
export type EmotionType = 
  | "joy" 
  | "happy" 
  | "delighted" 
  | "excited"
  | "sad" 
  | "sadness" 
  | "displeased" 
  | "disappointed"
  | "angry" 
  | "anger" 
  | "annoyed"
  | "surprise" 
  | "surprised" 
  | "shock"
  | "curiosity" 
  | "thinking" 
  | "squint"
  | "fear" 
  | "anxious"
  | "shy" 
  | "embarrassed"
  | "sleepy" 
  | "tired"
  | "neutral";

// Map emotions to simplified categories
const emotionCategories: Record<EmotionType, string> = {
  // Joyful emotions
  joy: "joy",
  happy: "joy",
  delighted: "joy",
  excited: "joy",
  
  // Sad emotions
  sad: "sadness",
  sadness: "sadness",
  displeased: "sadness",
  disappointed: "sadness",
  
  // Angry emotions
  angry: "anger",
  anger: "anger",
  annoyed: "anger",
  
  // Surprise emotions
  surprise: "surprise",
  surprised: "surprise",
  shock: "surprise",
  
  // Curiosity emotions
  curiosity: "curiosity",
  thinking: "curiosity",
  squint: "curiosity",
  
  // Fear emotions
  fear: "fear",
  anxious: "fear",
  
  // Shy emotions
  shy: "shy",
  embarrassed: "shy",
  
  // Sleepy emotions
  sleepy: "sleepy",
  tired: "sleepy",
  
  // Neutral
  neutral: "neutral"
};

/**
 * Parse emotion from NPU response text
 * @param advisorContext The raw NPU response text
 * @returns The parsed emotion or "neutral" if none found
 */
export function parseModelEmotion(advisorContext: string): EmotionType {
  try {
    // If no context, return neutral
    if (!advisorContext?.trim()) {
      return "neutral";
    }
    
    // Split into lines and look for MODEL_EMOTION line
    const lines = advisorContext.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for MODEL_EMOTION line (more robust regex)
    const modelEmotionLine = lines.find(line => line.startsWith("MODEL_EMOTION:"));
    if (modelEmotionLine) {
      // More robust regex that handles various whitespace scenarios
      const modelEmotionMatch = modelEmotionLine.match(/MODEL_EMOTION:\s*([\w\-]+)\s*(?:\(\s*confidence\s*=\s*[0-9.]+\s*\))?/i);
      if (modelEmotionMatch && modelEmotionMatch.length >= 2) {
        const emotion = modelEmotionMatch[1].toLowerCase() as EmotionType;
        // Validate that it's a supported emotion
        if (emotion in emotionCategories) {
          logger.debug("Parsed model emotion from NPU response", { emotion });
          return emotion;
        }
      }
    }
    
    // If no MODEL_EMOTION found, try to infer from USER_EMOTION as fallback
    const userEmotionLine = lines.find(line => line.startsWith("USER_EMOTION:"));
    if (userEmotionLine) {
      const userEmotionMatch = userEmotionLine.match(/USER_EMOTION:\s*([\w\-]+)\s*(?:\(\s*confidence\s*=\s*[0-9.]+\s*\))?/i);
      if (userEmotionMatch && userEmotionMatch.length >= 2) {
        const emotion = userEmotionMatch[1].toLowerCase() as EmotionType;
        // Validate that it's a supported emotion
        if (emotion in emotionCategories) {
          logger.debug("Inferred model emotion from user emotion", { emotion });
          return emotion;
        }
      }
    }
    
    // Default to neutral if no emotion found
    logger.debug("No emotion found in NPU response, defaulting to neutral");
    return "neutral";
  } catch (error) {
    logger.warn("Failed to parse model emotion, defaulting to neutral", { error });
    return "neutral";
  }
}

/**
 * Get the emotion category for a given emotion
 * @param emotion The emotion to categorize
 * @returns The emotion category
 */
export function getEmotionCategory(emotion: EmotionType): string {
  return emotionCategories[emotion] || "neutral";
}

/**
 * Stub function for animating Live2D model based on emotion
 * This would be called when we want to update the model's emotion
 * @param emotion The emotion to apply
 * @param confidence The confidence level (0-1)
 */
export function animateModelForEmotion(
  emotion: EmotionType, 
  confidence: number = 1.0
): void {
  try {
    // In a real implementation, this would dispatch an event or call a method
    // to update the Live2D model's emotion parameters
    
    // For now, we'll just log the emotion and confidence
    logger.info("Animating model for emotion", { 
      emotion, 
      category: getEmotionCategory(emotion),
      confidence 
    });
    
    // This is where we would actually update the Live2D model
    // For example:
    // document.querySelector('live2d-model')?.setAttribute('emotion', emotion);
    
    // Or dispatch a custom event:
    // window.dispatchEvent(new CustomEvent('model-emotion-change', {
    //   detail: { emotion, confidence }
    // }));
  } catch (error) {
    logger.error("Failed to animate model for emotion", { error, emotion, confidence });
  }
}

// Export the emotion categories for external use
export { emotionCategories };