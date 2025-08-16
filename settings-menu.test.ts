import { fixture, html, waitUntil } from "@open-wc/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "vitest-dom/extend-expect";
import "./settings-menu";
import type { SettingsMenu } from "./settings-menu";
import { type Persona, PersonaManager } from "./src/persona-manager";

// Mock PersonaManager to avoid actual localStorage access and network calls
vi.mock("./src/persona-manager", () => {
  const mockPersonas: Persona[] = [
    {
      id: "default-1",
      name: "Gemini-chan",
      systemPrompt: "Default Prompt",
      live2dModelUrl: "",
      isDefault: true,
    },
    {
      id: "custom-1",
      name: "Custom Persona",
      systemPrompt: "Custom Prompt",
      live2dModelUrl: "",
      isDefault: false,
    },
  ];

  const PersonaManagerMock = vi.fn(() => ({
    getPersonas: vi.fn(() => [...mockPersonas]),
    getActivePersona: vi.fn(() => mockPersonas[0]),
    setActivePersona: vi.fn(),
    createPersona: vi.fn((name: string) => {
      const newPersona = {
        id: `new-${Math.random()}`,
        name,
        systemPrompt: "",
        live2dModelUrl: "",
        isDefault: false,
      };
      mockPersonas.push(newPersona);
      return newPersona;
    }),
    updatePersona: vi.fn(),
    deletePersona: vi.fn(),
  }));

  return { PersonaManager: PersonaManagerMock };
});

/**
 * @vitest-environment jsdom
 */
describe("SettingsMenu Persona Management", () => {
  let element: SettingsMenu;
  let personaManager: PersonaManager;

  beforeEach(async () => {
    // Manually instantiate the mock to get a reference to it
    personaManager = new (vi.mocked(PersonaManager))();

    element = await fixture(html`<settings-menu></settings-menu>`);
    // The component's internal personaManager is the one we want to assert against
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    personaManager = (element as any).personaManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render the list of personas on load", () => {
    const personaButtons =
      element.shadowRoot!.querySelectorAll(".persona-button");
    expect(personaButtons.length).toBe(2);
    expect(personaButtons[0]).toHaveTextContent("Gemini-chan");
    expect(personaButtons[1]).toHaveTextContent("Custom Persona");
  });

  it("should highlight the active persona", () => {
    const activeButton = element.shadowRoot!.querySelector(
      ".persona-button.active",
    );
    expect(activeButton).toBeInTheDocument();
    expect(activeButton).toHaveTextContent("Gemini-chan");
  });

  it("should call setActivePersona and update the UI when a persona is selected", async () => {
    const personaButtons =
      element.shadowRoot!.querySelectorAll(".persona-button");
    const customPersonaButton = personaButtons[1] as HTMLElement;

    // Set the active persona to be the custom one for the mock
    vi.mocked(personaManager.getActivePersona).mockReturnValue(
      personaManager.getPersonas()[1],
    );

    customPersonaButton.click();
    await element.updateComplete;

    expect(personaManager.setActivePersona).toHaveBeenCalledWith("custom-1");

    // Wait until the active class is updated
    await waitUntil(
      () =>
        element
          .shadowRoot!.querySelector(".persona-button.active")
          ?.textContent?.trim() === "Custom Persona",
      "Active persona button did not update",
    );

    const activeButton = element.shadowRoot!.querySelector(
      ".persona-button.active",
    );
    expect(activeButton).toHaveTextContent("Custom Persona");
  });

  it("should open the persona editor when a persona is selected", async () => {
    const personaButtons =
      element.shadowRoot!.querySelectorAll(".persona-button");
    const customPersonaButton = personaButtons[1] as HTMLElement;

    vi.mocked(personaManager.getActivePersona).mockReturnValue(
      personaManager.getPersonas()[1],
    );

    customPersonaButton.click();
    await element.updateComplete;

    const editor = element.shadowRoot!.querySelector(".persona-editor");
    expect(editor).toBeInTheDocument();
  });

  it("should call createPersona when the create button is clicked", async () => {
    const createButton = element.shadowRoot!.querySelector(
      ".section-header button",
    ) as HTMLElement;
    createButton.click();
    await element.updateComplete;

    expect(personaManager.createPersona).toHaveBeenCalledWith("New Persona");
  });

  it("should show the editor for the new persona after creation", async () => {
    const newPersona = {
      id: "new-1",
      name: "New Persona",
      systemPrompt: "",
      live2dModelUrl: "",
      isDefault: false,
    };
    vi.mocked(personaManager.createPersona).mockReturnValue(newPersona);
    vi.mocked(personaManager.getPersonas).mockReturnValue([
      ...personaManager.getPersonas(),
      newPersona,
    ]);

    const createButton = element.shadowRoot!.querySelector(
      ".section-header button",
    ) as HTMLElement;
    createButton.click();
    await element.updateComplete;

    const editor = element.shadowRoot!.querySelector(".persona-editor");
    expect(editor).toBeInTheDocument();
    const nameInput = editor!.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement;
    expect(nameInput).toHaveValue("New Persona");
  });

  it("should call updatePersona when the save button is clicked", async () => {
    // 1. Select a persona to open the editor
    const customPersona = personaManager.getPersonas()[1];
    vi.mocked(personaManager.getActivePersona).mockReturnValue(customPersona);
    const customPersonaButton = element.shadowRoot!.querySelectorAll(
      ".persona-button",
    )[1] as HTMLElement;
    customPersonaButton.click();
    await element.updateComplete;

    // 2. Modify a field in the editor
    const editor = element.shadowRoot!.querySelector(".persona-editor");
    const nameInput = editor!.querySelector(
      'input[type="text"]',
    ) as HTMLInputElement;
    const newName = "Updated Persona Name";
    nameInput.value = newName;
    nameInput.dispatchEvent(new Event("input")); // Simulate input
    await element.updateComplete;

    // 3. Click save
    const saveButton = editor!.querySelector("button") as HTMLElement;
    saveButton.click();
    await element.updateComplete;

    // 4. Assert updatePersona was called with the correct data
    expect(personaManager.updatePersona).toHaveBeenCalled();
    const updatedPersonaArg = vi.mocked(personaManager.updatePersona).mock
      .calls[0][0];
    expect(updatedPersonaArg.id).toBe(customPersona.id);
    expect(updatedPersonaArg.name).toBe(newName);
  });
});
