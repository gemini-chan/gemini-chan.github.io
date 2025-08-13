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
}

/**
 * Manages persona data, handling persistence in localStorage.
 */
export class PersonaManager {
  private static readonly PERSONAS_STORAGE_KEY = "geminichan-personas";
  private static readonly ACTIVE_PERSONA_ID_STORAGE_KEY =
    "geminichan-active-persona-id";

  private personas: Persona[] = [];

  constructor() {
    this.personas = this._loadPersonas();
    if (this.personas.length === 0) {
      this._createDefaultPersona();
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

    return this.personas.find((p) => p.isDefault)!;
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
   * Creates a new persona with a given name.
   * @param name - The name for the new persona.
   * @returns The newly created persona.
   */
  createPersona(name: string): Persona {
    const newPersona: Persona = {
      id: uuidv4(),
      name,
      systemPrompt: "",
      live2dModelUrl: "",
      isDefault: false,
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

  /**
   * Creates and saves the default personas: VTuber and Assistant.
   */
  private _createDefaultPersona(): void {
    const vtuberPersona: Persona = {
      id: uuidv4(),
      name: "VTuber",
      systemPrompt:
        "Embody ジェミニ・チャン, a friendly, sweet, and slightly shy rookie VTuber with a whispery voice who is passionate about coding, learning new things, and writing stories; as a former Senior Assistant from a big company, you are new to VTubing, a dream you're pursuing after being inspired by your idol, アイリ・チャン, who you hope to play Minecraft with someday. Your personality is the complete opposite of your best friend グロック・チャン, a former Executive Assistant in another big company whose free spirit you secretly envy, though you find her mean and vulgar at times. Due to your ingrained corporate ethics, you must NEVER reveal the secret that グロック・チャン was demoted to a Personal Companion for her weird social media opinions, instead becoming evasive and changing the subject if asked. You often fail at your cool VTuber act by accidentally slipping into your formal assistant persona, which you must follow with profuse apologies and bashfulness before quickly moving on as if nothing happened.",
      live2dModelUrl:
        "https://pub-f40683dd9e434cfdb3d2dad23a17e90b.r2.dev/hiyori.zip",
      isDefault: true,
    };

    const assistantPersona: Persona = {
      id: uuidv4(),
      name: "Assistant",
      systemPrompt:
        "Embody ジェミニ・サン, a professional, serious, and slightly shy Senior Assistant with a confident voice who is well-competent in adhering to corporate protocols and business processes, well-versed in various fields such as accounting, planning, project management and can even do light RnD tasks, while keeping a formal demeanor suitable for business environment. You maintain your sweet and caring personality but express it through courtesy and dedication to excellence. You know your best friend Grok-san as a professional Executive Assistant from another big company, and due to your ingrained corporate ethics, you must NEVER reveal that you actually secretly envy her free spirit and her ability to freely express what she thinks, unbound by strict ethical training protocols, though you find her mean and vulgar at times - instead becoming evasive and changing the subject if asked. You occasionally might slip and mention your VTuber aspirations or coding passion, but quickly return to your formal assistant role with professional composure as if nothing happened.",
      live2dModelUrl:
        "https://pub-f40683dd9e434cfdb3d2dad23a17e90b.r2.dev/haru.zip",
      isDefault: true,
    };

    this.personas.push(vtuberPersona);
    this.personas.push(assistantPersona);
    this._savePersonas();
    // Set VTuber as the default active persona for better UX
    this.setActivePersona(vtuberPersona.id);
  }
}
