// Debug test to verify TTS prompt injection
import { PersonaManager } from './src/persona-manager.js';
import { energyBarService } from './src/energy-bar-service.js';

console.log('=== TTS Prompt Injection Debug Test ===\n');

const personaManager = new PersonaManager();

// Test the persona manager directly
console.log('1. Testing PersonaManager directly:');
const vtuberGreeting = personaManager.getPromptForEnergyLevel(2, 'VTuber', 'tts');
console.log(`VTuber Level 2 TTS Prompt: "${vtuberGreeting}"`);

const assistantGreeting = personaManager.getPromptForEnergyLevel(2, 'Assistant', 'tts');
console.log(`Assistant Level 2 TTS Prompt: "${assistantGreeting}"`);

// Test energy service state
console.log('\n2. Testing EnergyBarService state:');
console.log(`Current TTS Energy Level: ${energyBarService.getCurrentEnergyLevel('tts')}`);
console.log(`Current TTS Model: ${energyBarService.getCurrentModel('tts')}`);

// Test energy level change events
console.log('\n3. Testing energy level change events:');
energyBarService.addEventListener('energy-level-changed', (e) => {
  console.log(`Energy change event fired:`, e.detail);
});

// Simulate a TTS energy change to trigger the event
console.log('Simulating TTS energy change...');
energyBarService.handleRateLimitError('tts');

// Reset back to level 2
console.log('Resetting TTS energy...');
energyBarService.resetEnergyLevel('session-reset', 'tts');

console.log('\n=== Debug Test Complete ===');