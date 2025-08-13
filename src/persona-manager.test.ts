import { v4 as uuidv4 } from "uuid";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Persona, PersonaManager } from "./persona-manager";

// Mock the uuid module to have predictable IDs
vi.mock("uuid", () => ({
  v4: vi.fn(),
}));

/**
 * @vitest-environment jsdom
 */
describe("PersonaManager", () => {
  let personaManager: PersonaManager;
  let localStorageMock: Record<string, string> = {};
  const mockUuid = "mock-uuid-1";
  const defaultPersonaId = "default-persona-id";

  beforeEach(() => {
    // Reset mocks and localStorage before each test
    localStorageMock = {};
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(
      (key: string) => localStorageMock[key],
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
      },
    );
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(
      (key: string) => {
        delete localStorageMock[key];
      },
    );
    vi.spyOn(document, "dispatchEvent");

    // Mock uuidv4 to return predictable values
    (vi.mocked(uuidv4) as any)
      .mockReturnValueOnce(defaultPersonaId)
      .mockReturnValue(mockUuid);

    personaManager = new PersonaManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create a default persona if none exist", () => {
    const personas = personaManager.getPersonas();
    expect(personas).toHaveLength(1);
    const defaultPersona = personas[0];
    expect(defaultPersona.name).toBe("VTuber");
    expect(defaultPersona.isDefault).toBe(true);
    expect(defaultPersona.id).toBe(defaultPersonaId);
  });

  it("should load existing personas from localStorage", () => {
    const existingPersonas: Persona[] = [
      {
        id: "1",
        name: "Test Persona 1",
        systemPrompt: "Prompt 1",
        live2dModelUrl: "",
        isDefault: true,
      },
      {
        id: "2",
        name: "Test Persona 2",
        systemPrompt: "Prompt 2",
        live2dModelUrl: "",
        isDefault: false,
      },
    ];
    localStorageMock["geminichan-personas"] = JSON.stringify(existingPersonas);

    const manager = new PersonaManager();
    const personas = manager.getPersonas();
    expect(personas).toHaveLength(2);
    expect(personas).toEqual(existingPersonas);
  });

  describe("getActivePersona", () => {
    it("should return the active persona from localStorage", () => {
      const personas = personaManager.getPersonas();
      const secondPersona = personaManager.createPersona("Second");
      personaManager.setActivePersona(secondPersona.id);

      const activePersona = personaManager.getActivePersona();
      expect(activePersona).toBe(secondPersona);
    });

    it("should return the default persona if active ID is not found", () => {
      localStorageMock["geminichan-active-persona-id"] = "non-existent-id";
      const activePersona = personaManager.getActivePersona();
      const defaultPersona = personaManager
        .getPersonas()
        .find((p) => p.isDefault);
      expect(activePersona).toBe(defaultPersona);
    });

    it("should return the default persona if no active ID is set", () => {
      const activePersona = personaManager.getActivePersona();
      const defaultPersona = personaManager
        .getPersonas()
        .find((p) => p.isDefault);
      expect(activePersona).toBe(defaultPersona);
    });
  });

  describe("setActivePersona", () => {
    it("should set the active persona ID in localStorage", () => {
      const newPersona = personaManager.createPersona("New Active");
      personaManager.setActivePersona(newPersona.id);
      expect(localStorageMock["geminichan-active-persona-id"]).toBe(
        newPersona.id,
      );
    });

    it('should dispatch a "persona-changed" event', () => {
      const newPersona = personaManager.createPersona("Event Persona");
      personaManager.setActivePersona(newPersona.id);

      expect(document.dispatchEvent).toHaveBeenCalled();
      const event = vi.mocked(document.dispatchEvent).mock
        .calls[0][0] as CustomEvent;
      expect(event.type).toBe("persona-changed");
      expect(event.detail).toEqual({ personaId: newPersona.id });
    });

    it("should log an error if persona ID does not exist", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const nonExistentId = "non-existent-id";
      personaManager.setActivePersona(nonExistentId);

      expect(localStorageMock["geminichan-active-persona-id"]).not.toBe(
        nonExistentId,
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Persona with ID "${nonExistentId}" not found.`,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("createPersona", () => {
    it("should create a new persona with the given name", () => {
      const personaName = "My New Persona";
      const newPersona = personaManager.createPersona(personaName);

      expect(newPersona.name).toBe(personaName);
      expect(newPersona.id).toBe(mockUuid);
      expect(newPersona.isDefault).toBe(false);

      const personas = personaManager.getPersonas();
      expect(personas).toContain(newPersona);
    });

    it("should save the updated persona list to localStorage", () => {
      const personaName = "My New Persona";
      personaManager.createPersona(personaName);
      const storedPersonas = JSON.parse(
        localStorageMock["geminichan-personas"],
      );
      expect(storedPersonas.some((p: Persona) => p.name === personaName)).toBe(
        true,
      );
    });
  });

  describe("updatePersona", () => {
    it("should update an existing persona", () => {
      const newPersona = personaManager.createPersona("Original Name");
      const updatedPersonaData: Persona = {
        ...newPersona,
        name: "Updated Name",
        systemPrompt: "Updated prompt.",
      };

      personaManager.updatePersona(updatedPersonaData);

      const personas = personaManager.getPersonas();
      const updatedPersona = personas.find((p) => p.id === newPersona.id);
      expect(updatedPersona?.name).toBe("Updated Name");
      expect(updatedPersona?.systemPrompt).toBe("Updated prompt.");
    });

    it("should not allow changing the isDefault status of the default persona", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const defaultPersona = personaManager.getActivePersona();
      const updatedDefaultPersona: Persona = {
        ...defaultPersona,
        isDefault: false,
      };

      personaManager.updatePersona(updatedDefaultPersona);

      const personas = personaManager.getPersonas();
      const stillDefaultPersona = personas.find(
        (p) => p.id === defaultPersona.id,
      );
      expect(stillDefaultPersona?.isDefault).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Cannot change the isDefault status of the default persona.",
      );
      consoleWarnSpy.mockRestore();
    });

    it("should log an error if persona to update is not found", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const fakePersona: Persona = {
        id: "fake-id",
        name: "Fake",
        systemPrompt: "",
        live2dModelUrl: "",
        isDefault: false,
      };
      personaManager.updatePersona(fakePersona);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Persona with ID "${fakePersona.id}" not found.`,
      );
      consoleErrorSpy.mockRestore();
    });
  });

  describe("deletePersona", () => {
    it("should delete a non-default persona", () => {
      const personaToDelete = personaManager.createPersona("To Delete");
      const initialCount = personaManager.getPersonas().length;

      personaManager.deletePersona(personaToDelete.id);

      const finalCount = personaManager.getPersonas().length;
      expect(finalCount).toBe(initialCount - 1);
      expect(
        personaManager.getPersonas().find((p) => p.id === personaToDelete.id),
      ).toBeUndefined();
    });

    it("should not allow deleting the default persona", () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      const defaultPersona = personaManager.getActivePersona();
      const initialCount = personaManager.getPersonas().length;

      personaManager.deletePersona(defaultPersona.id);

      const finalCount = personaManager.getPersonas().length;
      expect(finalCount).toBe(initialCount);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "The default persona cannot be deleted.",
      );
      consoleWarnSpy.mockRestore();
    });

    it("should log an error if persona to delete is not found", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const nonExistentId = "non-existent-id";
      personaManager.deletePersona(nonExistentId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Persona with ID "${nonExistentId}" not found.`,
      );
      consoleErrorSpy.mockRestore();
    });
  });
});
