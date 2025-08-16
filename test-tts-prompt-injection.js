// Test to verify TTS prompt injection works correctly

import { energyBarService } from "./src/energy-bar-service.js";
import { PersonaManager } from "./src/persona-manager.js";

console.log("Testing TTS Prompt Injection...\n");

const personaManager = new PersonaManager();

// Test VTuber persona TTS prompts
console.log("=== VTuber Persona TTS Prompts ===");
console.log(
  "Level 2 (Greeting):",
  personaManager.getPromptForEnergyLevel(2, "VTuber", "tts"),
);
console.log(
  "Level 1 (Degraded):",
  personaManager.getPromptForEnergyLevel(1, "VTuber", "tts"),
);
console.log(
  "Level 0 (Exhausted):",
  personaManager.getPromptForEnergyLevel(0, "VTuber", "tts"),
);

console.log("\n=== Assistant Persona TTS Prompts ===");
console.log(
  "Level 2 (Greeting):",
  personaManager.getPromptForEnergyLevel(2, "Assistant", "tts"),
);
console.log(
  "Level 1 (Degraded):",
  personaManager.getPromptForEnergyLevel(1, "Assistant", "tts"),
);
console.log(
  "Level 0 (Exhausted):",
  personaManager.getPromptForEnergyLevel(0, "Assistant", "tts"),
);

console.log("\n=== Generic Persona TTS Prompts ===");
console.log(
  "Level 2 (Greeting):",
  personaManager.getPromptForEnergyLevel(2, "Generic", "tts"),
);
console.log(
  "Level 1 (Degraded):",
  personaManager.getPromptForEnergyLevel(1, "Generic", "tts"),
);
console.log(
  "Level 0 (Exhausted):",
  personaManager.getPromptForEnergyLevel(0, "Generic", "tts"),
);

console.log("\n=== Energy Service TTS State ===");
console.log(
  `Current TTS Energy Level: ${energyBarService.getCurrentEnergyLevel("tts")}`,
);
console.log(`Current TTS Model: ${energyBarService.getCurrentModel("tts")}`);

console.log("\n=== Testing TTS Energy Level Changes ===");
console.log("All TTS prompts should be injected into the chat window:");
console.log("- Level 2: Welcoming greetings to encourage interaction");
console.log("- Level 1: Degraded state messages explaining reduced capability");
console.log("- Level 0: Exhausted state messages explaining unavailability");

// Simulate TTS rate limit to trigger level 1 prompt
console.log("\nSimulating TTS rate limit (2 -> 1)...");
energyBarService.handleRateLimitError("tts");
console.log(
  `New TTS Energy Level: ${energyBarService.getCurrentEnergyLevel("tts")}`,
);
console.log(`New TTS Model: ${energyBarService.getCurrentModel("tts")}`);
console.log(
  `Level 1 prompt would be injected: "${personaManager.getPromptForEnergyLevel(1, "VTuber", "tts")}"`,
);

// Simulate another rate limit to trigger level 0 prompt
console.log("\nSimulating another TTS rate limit (1 -> 0)...");
energyBarService.handleRateLimitError("tts");
console.log(
  `New TTS Energy Level: ${energyBarService.getCurrentEnergyLevel("tts")}`,
);
console.log(`New TTS Model: ${energyBarService.getCurrentModel("tts")}`);
console.log(
  `Level 0 prompt would be injected: "${personaManager.getPromptForEnergyLevel(0, "VTuber", "tts")}"`,
);

// Reset to level 2
console.log("\nResetting TTS energy...");
energyBarService.resetEnergyLevel("session-reset", "tts");
console.log(
  `Reset TTS Energy Level: ${energyBarService.getCurrentEnergyLevel("tts")}`,
);
console.log(`Reset TTS Model: ${energyBarService.getCurrentModel("tts")}`);
console.log(
  `Level 2 greeting would be injected: "${personaManager.getPromptForEnergyLevel(2, "VTuber", "tts")}"`,
);

console.log("\n✅ TTS prompt injection test completed!");
console.log(
  "All TTS prompts are now injected directly into the chat window where they belong.",
);
