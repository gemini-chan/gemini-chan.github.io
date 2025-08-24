import defaultPersonas from "@prompts/personas/default-personas.json";
import prompts from "@prompts/personas/energy-level-prompts.json";
import { v4 as uuidv4 } from "uuid";

/**
 * Defines the structure for a persona.
 */
export interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
  live2dModelUrl: string;
  isDefault: boolean;
  aeiEnabled: boolean;
}

/**
 * Manages persona data, handling persistence in localStorage.
 */
export class PersonaManager {
  /**
   * Get a persona-specific prompt for a given energy level.
   * Level 3 returns an empty string as no special prompt is needed.
   */
  getPromptForEnergyLevel(
    level: 0 | 1 | 2 | 3,
    personaName: string,
    mode: "sts" | "tts" = "sts",
  ): string {
    if (level >= 3) return ""; // No special prompt for full energy

    const name = (personaName || "").toLowerCase();
    const promptSet = prompts[mode]?.[level as 0 | 1 | 2];

    if (promptSet) {
      return promptSet[name as keyof typeof promptSet] || promptSet.default;
    }

    return "";
  }

  private static readonly PERSONAS_STORAGE_KEY = "geminichan-personas";
  private static readonly ACTIVE_PERSONA_ID_STORAGE_KEY =
    "geminichan-active-persona-id";

  private personas: Persona[] = [];

  constructor() {
    this.personas = this._loadPersonas();
    let personasChanged = false;

    // Sync default personas to add any that are missing from storage.
    for (const personaData of defaultPersonas) {
      const exists = this.personas.some((p) => p.name === personaData.name);
      if (!exists) {
        const newPersona: Persona = {
          ...(personaData as Omit<Persona, "id" | "aeiEnabled">),
          id: uuidv4(),
          aeiEnabled: (personaData as any).aeiEnabled ?? true,
        };
        this.personas.push(newPersona);
        personasChanged = true;
      }
    }

    // Ensure an active persona is set if one doesn't exist or is invalid.
    const activeId = localStorage.getItem(
      PersonaManager.ACTIVE_PERSONA_ID_STORAGE_KEY,
    );
    const activePersona = this.personas.find((p) => p.id === activeId);

    if (!activePersona) {
      // Default to VTuber for a good first-time experience.
      const vtuberPersona = this.personas.find((p) => p.name === "VTuber");
      if (vtuberPersona) {
        this.setActivePersona(vtuberPersona.id);
      }
    }

    if (personasChanged) {
      this._savePersonas();
    }
  }

  /**
   * Retrieves all personas.
   * @returns An array of all personas.
   */
  getPersonas(): Persona[] {
    return [...this.personas];
  }

  /**
   * Retrieves the currently active persona.
   * Falls back to the default persona if the active one isn't found.
   * @returns The active persona.
   */
  getActivePersona(): Persona {
    const activeId = localStorage.getItem(
      PersonaManager.ACTIVE_PERSONA_ID_STORAGE_KEY,
    );
    const activePersona = this.personas.find((p) => p.id === activeId);

    if (activePersona) {
      return activePersona;
    }

    const defaultPersona = this.personas.find((p) => p.isDefault);
    if (defaultPersona) {
      return defaultPersona;
    }

    throw new Error("No default persona found");
  }

  /**
   * Sets the active persona and dispatches a 'persona-changed' event.
   * @param personaId - The ID of the persona to set as active.
   */
  setActivePersona(personaId: string): void {
    const personaExists = this.personas.some((p) => p.id === personaId);
    if (personaExists) {
      localStorage.setItem(
        PersonaManager.ACTIVE_PERSONA_ID_STORAGE_KEY,
        personaId,
      );
      const event = new CustomEvent("persona-changed", {
        detail: { personaId },
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(event);
    } else {
      console.error(`Persona with ID "${personaId}" not found.`);
    }
  }

  /**
   * Creates a new persona. Can optionally be based on an existing persona.
   * @param name - The name for the new persona.
   * @param basePersonaId - Optional ID of a persona to use as a template.
   * @returns The newly created persona.
   */
  createPersona(name: string, basePersonaId?: string): Persona {
    const basePersona = this.personas.find((p) => p.id === basePersonaId);

    const newPersona: Persona = {
      id: uuidv4(),
      name,
      systemPrompt: basePersona?.systemPrompt || "",
      live2dModelUrl: basePersona?.live2dModelUrl || "",
      isDefault: false,
      aeiEnabled: false,
    };
    this.personas.push(newPersona);
    this._savePersonas();
    return newPersona;
  }

  /**
   * Updates an existing persona.
   * @param updatedPersona - The persona object with updated data.
   */
  updatePersona(updatedPersona: Persona): void {
    const index = this.personas.findIndex((p) => p.id === updatedPersona.id);
    if (index !== -1) {
      // Prevent changing the default status of the default persona
      if (this.personas[index].isDefault && !updatedPersona.isDefault) {
        console.warn(
          "Cannot change the isDefault status of the default persona.",
        );
        updatedPersona.isDefault = true;
      }
      this.personas[index] = updatedPersona;
      this._savePersonas();
    } else {
      console.error(`Persona with ID "${updatedPersona.id}" not found.`);
    }
  }

  /**
   * Deletes a persona.
   * The default persona cannot be deleted.
   * @param personaId - The ID of the persona to delete.
   */
  deletePersona(personaId: string): void {
    const index = this.personas.findIndex((p) => p.id === personaId);
    if (index !== -1) {
      if (this.personas[index].isDefault) {
        console.warn("The default persona cannot be deleted.");
        return;
      }
      this.personas.splice(index, 1);
      this._savePersonas();
    } else {
      console.error(`Persona with ID "${personaId}" not found.`);
    }
  }

  /**
   * Loads personas from localStorage.
   * @returns An array of personas.
   */
  private _loadPersonas(): Persona[] {
    const personasJson = localStorage.getItem(
      PersonaManager.PERSONAS_STORAGE_KEY,
    );
    if (!personasJson) {
      return [];
    }
    try {
      return JSON.parse(personasJson);
    } catch (error) {
      console.warn("Failed to parse personas from localStorage:", error);
      return [];
    }
  }

  /**
   * Saves the current list of personas to localStorage.
   */
  private _savePersonas(): void {
    localStorage.setItem(
      PersonaManager.PERSONAS_STORAGE_KEY,
      JSON.stringify(this.personas),
    );
  }

}
