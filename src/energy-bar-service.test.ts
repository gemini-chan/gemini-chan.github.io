import { expect } from "chai";
import { energyBarService } from "./energy-bar-service";

describe("EnergyBarService", () => {
  beforeEach(() => {
    // Reset to full before every test for both modes
    energyBarService.setEnergyLevel(3, "manual", "sts");
    energyBarService.setEnergyLevel(2, "manual", "tts");
  });

  describe("STS Mode", () => {
    it("initializes at level 3 with correct model", () => {
      const level = energyBarService.getCurrentEnergyLevel("sts");
      expect(level).to.equal(3);
      expect(energyBarService.getCurrentModel("sts")).to.equal(
        "gemini-2.5-flash-exp-native-audio-thinking-dialog",
      );
    });

    it("decrements on handleRateLimitError down to 0", () => {
      energyBarService.handleRateLimitError("sts"); // 3 -> 2
      expect(energyBarService.getCurrentEnergyLevel("sts")).to.equal(2);
      energyBarService.handleRateLimitError("sts"); // 2 -> 1
      expect(energyBarService.getCurrentEnergyLevel("sts")).to.equal(1);
      energyBarService.handleRateLimitError("sts"); // 1 -> 0
      expect(energyBarService.getCurrentEnergyLevel("sts")).to.equal(0);
      // No negative
      energyBarService.handleRateLimitError("sts"); // 0 -> 0
      expect(energyBarService.getCurrentEnergyLevel("sts")).to.equal(0);
    });

    it("resets to 3 on session-reset", () => {
      energyBarService.setEnergyLevel(0, "manual", "sts");
      energyBarService.resetEnergyLevel("session-reset", "sts");
      expect(energyBarService.getCurrentEnergyLevel("sts")).to.equal(3);
    });
  });

  describe("TTS Mode", () => {
    it("initializes at level 2 with correct model", () => {
      const level = energyBarService.getCurrentEnergyLevel("tts");
      expect(level).to.equal(2);
      expect(energyBarService.getCurrentModel("tts")).to.equal(
        "gemini-live-2.5-flash-preview",
      );
    });

    it("decrements on handleRateLimitError down to 0", () => {
      energyBarService.handleRateLimitError("tts"); // 2 -> 1
      expect(energyBarService.getCurrentEnergyLevel("tts")).to.equal(1);
      expect(energyBarService.getCurrentModel("tts")).to.equal(
        "gemini-2.0-flash-live-001", // Fallback model
      );
      energyBarService.handleRateLimitError("tts"); // 1 -> 0
      expect(energyBarService.getCurrentEnergyLevel("tts")).to.equal(0);
      expect(energyBarService.getCurrentModel("tts")).to.equal(null);
      // No negative
      energyBarService.handleRateLimitError("tts"); // 0 -> 0
      expect(energyBarService.getCurrentEnergyLevel("tts")).to.equal(0);
    });

    it("resets to 2 on session-reset", () => {
      energyBarService.setEnergyLevel(0, "manual", "tts");
      energyBarService.resetEnergyLevel("session-reset", "tts");
      expect(energyBarService.getCurrentEnergyLevel("tts")).to.equal(2);
    });

    it("cannot be set above level 2", () => {
      energyBarService.setEnergyLevel(3, "manual", "tts");
      expect(energyBarService.getCurrentEnergyLevel("tts")).to.equal(2);
    });
  });

  describe("Mode Independence", () => {
    it("STS and TTS energy levels are independent", () => {
      // Drain STS energy
      energyBarService.handleRateLimitError("sts"); // 3 -> 2
      energyBarService.handleRateLimitError("sts"); // 2 -> 1

      // TTS should remain at 2
      expect(energyBarService.getCurrentEnergyLevel("sts")).to.equal(1);
      expect(energyBarService.getCurrentEnergyLevel("tts")).to.equal(2);

      // Drain TTS energy
      energyBarService.handleRateLimitError("tts"); // 2 -> 1

      // STS should remain at 1
      expect(energyBarService.getCurrentEnergyLevel("sts")).to.equal(1);
      expect(energyBarService.getCurrentEnergyLevel("tts")).to.equal(1);
    });
  });

  it("emits energy-level-changed with detail", async () => {
    const ev = await new Promise<CustomEvent>((resolve) => {
      const handler = (e: Event) => {
        energyBarService.removeEventListener(
          "energy-level-changed",
          handler as EventListener,
        );
        resolve(e as CustomEvent);
      };
      energyBarService.addEventListener(
        "energy-level-changed",
        handler as EventListener,
      );
      energyBarService.handleRateLimitError("sts");
    });

    expect(ev.detail).to.have.property("prevLevel", 3);
    expect(ev.detail).to.have.property("level", 2);
    expect(ev.detail).to.have.property("reason", "rate-limit-exceeded");
    expect(ev.detail).to.have.property("mode", "sts");
    expect(ev.detail).to.have.property("modelTier").that.is.a("string");
  });
});
