import { expect } from "chai";
import { PersonaManager } from "./persona-manager";

describe("PersonaManager.getPromptForEnergyLevel", () => {
  const pm = new PersonaManager();

  it("returns empty string for level 3 (full energy)", () => {
    expect(pm.getPromptForEnergyLevel(3, "VTuber")).to.equal("");
    expect(pm.getPromptForEnergyLevel(3, "Assistant")).to.equal("");
    expect(pm.getPromptForEnergyLevel(3, "Generic")).to.equal("");
  });

  it("returns VTuber prompt for medium energy (2)", () => {
    const text = pm.getPromptForEnergyLevel(2, "VTuber");
    expect(text).to.contain("little tired");
  });

  it("returns Assistant prompt for low energy (1)", () => {
    const text = pm.getPromptForEnergyLevel(1, "Assistant");
    expect(text).to.contain("processing power is limited");
  });

  it("returns Generic prompt for exhausted (0)", () => {
    const text = pm.getPromptForEnergyLevel(0, "Generic");
    expect(text.toLowerCase()).to.contain("out of energy");
  });
});
