import { expect } from "chai";
import { PersonaManager } from "./persona-manager";

describe("PersonaManager.getPromptForEnergyLevel", () => {
  const pm = new PersonaManager();

  describe("STS Mode (Voice Calls)", () => {
    it("returns empty string for level 3 (full energy)", () => {
      expect(pm.getPromptForEnergyLevel(3, "VTuber", "sts")).to.equal("");
      expect(pm.getPromptForEnergyLevel(3, "Assistant", "sts")).to.equal("");
      expect(pm.getPromptForEnergyLevel(3, "Generic", "sts")).to.equal("");
    });

    it("returns VTuber prompt for medium energy (2)", () => {
      const text = pm.getPromptForEnergyLevel(2, "VTuber", "sts");
      expect(text).to.contain("brainpower");
    });

    it("returns Assistant prompt for low energy (1)", () => {
      const text = pm.getPromptForEnergyLevel(1, "Assistant", "sts");
      expect(text).to.contain("processing power is limited");
    });

    it("returns Generic prompt for exhausted (0)", () => {
      const text = pm.getPromptForEnergyLevel(0, "Generic", "sts");
      expect(text.toLowerCase()).to.contain("out of energy");
    });
  });

  describe("TTS Mode (Text Chat)", () => {
    it("returns empty string for level 3 (full energy)", () => {
      expect(pm.getPromptForEnergyLevel(3, "VTuber", "tts")).to.equal("");
      expect(pm.getPromptForEnergyLevel(3, "Assistant", "tts")).to.equal("");
      expect(pm.getPromptForEnergyLevel(3, "Generic", "tts")).to.equal("");
    });

    it("returns VTuber greeting for level 2", () => {
      const text = pm.getPromptForEnergyLevel(2, "VTuber", "tts");
      expect(text).to.contain("Gemini-chan");
      expect(text).to.contain("excited to chat");
    });

    it("returns Assistant greeting for level 2", () => {
      const text = pm.getPromptForEnergyLevel(2, "Assistant", "tts");
      expect(text).to.contain("Gemini-san");
      expect(text).to.contain("professional assistant");
    });

    it("returns VTuber degraded prompt for level 1", () => {
      const text = pm.getPromptForEnergyLevel(1, "VTuber", "tts");
      expect(text).to.contain("sleepy");
      expect(text).to.contain("simpler");
    });

    it("returns Assistant degraded prompt for level 1", () => {
      const text = pm.getPromptForEnergyLevel(1, "Assistant", "tts");
      expect(text).to.contain("reduced capabilities");
    });

    it("returns VTuber exhausted prompt for level 0", () => {
      const text = pm.getPromptForEnergyLevel(0, "VTuber", "tts");
      expect(text).to.contain("tired");
      expect(text).to.contain("rest");
    });

    it("returns Assistant exhausted prompt for level 0", () => {
      const text = pm.getPromptForEnergyLevel(0, "Assistant", "tts");
      expect(text).to.contain("offline");
      expect(text).to.contain("maintenance");
    });
  });

  describe("Backward Compatibility", () => {
    it("defaults to STS mode when mode is not specified", () => {
      const stsText = pm.getPromptForEnergyLevel(2, "VTuber", "sts");
      const defaultText = pm.getPromptForEnergyLevel(2, "VTuber");
      expect(defaultText).to.equal(stsText);
    });
  });
});
