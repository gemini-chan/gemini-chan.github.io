// Quick test to verify the energy bar changes work correctly
import { energyBarService } from "./src/energy-bar-service.js";

console.log("Testing Energy Bar Service Changes...\n");

// Test initial states
console.log("Initial States:");
console.log(
  `STS Energy Level: ${energyBarService.getCurrentEnergyLevel("sts")}`,
);
console.log(`STS Model: ${energyBarService.getCurrentModel("sts")}`);
console.log(
  `TTS Energy Level: ${energyBarService.getCurrentEnergyLevel("tts")}`,
);
console.log(`TTS Model: ${energyBarService.getCurrentModel("tts")}\n`);

// Test TTS fallback model at level 1
console.log("Testing TTS fallback model...");
energyBarService.handleRateLimitError("tts"); // 2 -> 1
console.log(
  `TTS Energy Level after rate limit: ${energyBarService.getCurrentEnergyLevel("tts")}`,
);
console.log(
  `TTS Model after rate limit: ${energyBarService.getCurrentModel("tts")}`,
);

// Test that STS is unaffected
console.log(
  `STS Energy Level (should be unchanged): ${energyBarService.getCurrentEnergyLevel("sts")}`,
);
console.log(
  `STS Model (should be unchanged): ${energyBarService.getCurrentModel("sts")}\n`,
);

// Test TTS reset to max level 2
console.log("Testing TTS reset...");
energyBarService.resetEnergyLevel("session-reset", "tts");
console.log(
  `TTS Energy Level after reset: ${energyBarService.getCurrentEnergyLevel("tts")}`,
);
console.log(
  `TTS Model after reset: ${energyBarService.getCurrentModel("tts")}\n`,
);

// Test TTS cannot go above level 2
console.log("Testing TTS max level constraint...");
energyBarService.setEnergyLevel(3, "manual", "tts");
console.log(
  `TTS Energy Level after trying to set to 3: ${energyBarService.getCurrentEnergyLevel("tts")}`,
);
console.log(`TTS Model: ${energyBarService.getCurrentModel("tts")}\n`);

console.log("All tests completed!");
