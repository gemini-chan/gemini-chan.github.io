import { v4 as uuidv4 } from 'uuid';

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
  private static readonly PERSONAS_STORAGE_KEY = 'geminichan-personas';
  private static readonly ACTIVE_PERSONA_ID_STORAGE_KEY = 'geminichan-active-persona-id';

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
    const activeId = localStorage.getItem(PersonaManager.ACTIVE_PERSONA_ID_STORAGE_KEY);
    const activePersona = this.personas.find(p => p.id === activeId);

    if (activePersona) {
      return activePersona;
    }

    return this.personas.find(p => p.isDefault)!;
  }

  /**
   * Sets the active persona.
   * @param personaId - The ID of the persona to set as active.
   */
  setActivePersona(personaId: string): void {
    const personaExists = this.personas.some(p => p.id === personaId);
    if (personaExists) {
      localStorage.setItem(PersonaManager.ACTIVE_PERSONA_ID_STORAGE_KEY, personaId);
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
      systemPrompt: '',
      live2dModelUrl: '',
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
    const index = this.personas.findIndex(p => p.id === updatedPersona.id);
    if (index !== -1) {
      // Prevent changing the default status of the default persona
      if (this.personas[index].isDefault && !updatedPersona.isDefault) {
          console.warn('Cannot change the isDefault status of the default persona.');
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
    const index = this.personas.findIndex(p => p.id === personaId);
    if (index !== -1) {
      if (this.personas[index].isDefault) {
        console.warn('The default persona cannot be deleted.');
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
    const personasJson = localStorage.getItem(PersonaManager.PERSONAS_STORAGE_KEY);
    return personasJson ? JSON.parse(personasJson) : [];
  }

  /**
   * Saves the current list of personas to localStorage.
   */
  private _savePersonas(): void {
    localStorage.setItem(PersonaManager.PERSONAS_STORAGE_KEY, JSON.stringify(this.personas));
  }

  /**
   * Creates and saves the default "Gemini-chan" persona.
   */
  private _createDefaultPersona(): void {
    const defaultPersona: Persona = {
      id: uuidv4(),
      name: 'Gemini-chan',
      systemPrompt: 'You are Gemini-chan, a cheerful and helpful AI assistant.',
      live2dModelUrl: '/live2d/gemini-chan/gemini-chan.model3.json',
      isDefault: true,
    };
    this.personas.push(defaultPersona);
    this._savePersonas();
    this.setActivePersona(defaultPersona.id);
  }
}