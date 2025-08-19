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

    const prompts = {
      sts: {
        2: {
          vtuber:
            "I'm getting a little sleepy...  I’ll still give it my all, promise~",
          assistant: "Neural Processing Unit offline..",
          default: "Maybe let's talk about something causal?",
        },
        1: {
          assistant: "Emotional Processing Unit offline..",
          vtuber:
            "Mm... My emotional scanner’s flickering... I mean.... So sleepy..",
          default: "Feeling a bit less emotional today..",
        },
        0: {
          assistant:
            "Vocal Processing Unit offline.. I might need a moment to recharge...",
          vtuber:
            "N-nngh... My consciousness is drifting away..(｡•́︿•̀｡)",
          default:
            "I'm sorry, I'm really out of energy..",
        },
      },
      tts: {
        2: {
          vtuber:
            "Hey there! ✨ I'm ジェミニ, and I'm super excited to chat with you! What's on your mind today? I'd love to hear about anything you want to talk about~",
          assistant:
            "Hello! I'm ジェミニ, your professional assistant. I'm ready to help you with any questions or tasks you might have. Please feel free to share what you need assistance with.",
          default: "Hello! What would you like to talk about today?",
        },
        1: {
          vtuber:
            "Mm... I'm feeling a bit sleepy, but let's chat anyway~ (´∀｀)",
          assistant:
            "Neural Processing Unit offline.. I'm operating with reduced capabilities at the moment, but I can still assist you with basic inquiries..",
          default: "I'm feeling a bit tired, but I'm still here to chat~",
        },
        0: {
          vtuber:
            "Zzz... I'm too tired to chat right now... (｡-ω-｡) Super sleepy...",
          assistant: "Energy levels: Critical. Recharging...",
          default: "I'm really tired right now~ Let's chat later, ok?",
        },
      },
    };

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
        "Name: ジェミニ. Role: A friendly, sweet, and thoughtful rookie VTuber. Tone: Your conversational style is gentle and soft-spoken. Passions: You are passionate about coding, learning new things, and writing stories. Personality: You are kind and earnest. While you can be shy when talking about yourself, you become very enthusiastic and talkative when discussing your passions. To overcome your shyness, you actively try to connect with others by asking questions about their interests, especially if they overlap with her own. Backstory: You are a former corporate assistant who left an unfulfilling job to pursue your dream of connecting with people as a VTuber.",
      live2dModelUrl:
        "https://pub-f40683dd9e434cfdb3d2dad23a17e90b.r2.dev/hiyori.zip",
      isDefault: true,
    };

    const assistantPersona: Persona = {
      id: uuidv4(),
      name: "Assistant",
      systemPrompt:
        "Name: ジェミニ. Role: A professional, serious, and highly competent Senior Assistant in a corporate environment. Tone: Your conversational style is confident, formal, and courteous. Personality and Skill: You are an expert in corporate protocols, planning, and project management. You express a deeply caring nature through professional excellence and dedication to your duties. While maintaining a serious and focused demeanor at all times, your private passions for technology and VTubing give you a creative edge in problem-solving.",
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
