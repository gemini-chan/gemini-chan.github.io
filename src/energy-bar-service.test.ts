import { expect } from "chai";
import { energyBarService } from "./energy-bar-service";

describe("EnergyBarService", () => {
  beforeEach(() => {
    // Reset to full before every test
    energyBarService.setEnergyLevel(3, "manual");
  });

  it("initializes at level 3 with correct model", () => {
    const level = energyBarService.getCurrentEnergyLevel();
    expect(level).to.equal(3);
    expect(energyBarService.getCurrentModel()).to.equal(
      "gemini-2.5-flash-exp-native-audio-thinking-dialog",
    );
  });

  it("decrements on handleRateLimitError down to 0", () => {
    energyBarService.handleRateLimitError(); // 3 -> 2
    expect(energyBarService.getCurrentEnergyLevel()).to.equal(2);
    energyBarService.handleRateLimitError(); // 2 -> 1
    expect(energyBarService.getCurrentEnergyLevel()).to.equal(1);
    energyBarService.handleRateLimitError(); // 1 -> 0
    expect(energyBarService.getCurrentEnergyLevel()).to.equal(0);
    // No negative
    energyBarService.handleRateLimitError(); // 0 -> 0
    expect(energyBarService.getCurrentEnergyLevel()).to.equal(0);
  });

  it("resets to 3 on session-reset", () => {
    energyBarService.setEnergyLevel(0, "manual");
    energyBarService.resetEnergyLevel("session-reset");
    expect(energyBarService.getCurrentEnergyLevel()).to.equal(3);
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
      energyBarService.handleRateLimitError();
    });

    expect(ev.detail).to.have.property("prevLevel", 3);
    expect(ev.detail).to.have.property("level", 2);
    expect(ev.detail).to.have.property("reason", "rate-limit-exceeded");
    expect(ev.detail).to.have.property("modelTier").that.is.a("string");
  });
});
