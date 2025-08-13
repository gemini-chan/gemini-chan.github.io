# Implementation Plan: Persona Management System

## 🎯 **Current Priority**
Implement the persona management system, allowing users to create, select, and manage different AI personas.

- [x] 1. **Create `PersonaManager` Class**: Implement the `PersonaManager` class to handle all persona-related logic, including loading from and saving to `localStorage`.
  - Requirements: 2.3.1
  - Design: 3.1, 4.1, 5

- [x] 2. **Integrate `PersonaManager` with `settings-menu`**:
  - [x] 2.1. Replace the "System Prompt" section with a new "Persona Management" section.
  - [x] 2.2. Display the list of available personas.
  - [x] 2.3. Add a "+" button for creating new personas.
  - [x] 2.4. Implement UI for creating, editing, and selecting personas.
  - Requirements: 2.1.1, 2.2.1

- [x] 3. **Implement Persona Switching Logic**:
  - [x] 3.1. Dispatch a `persona-changed` event from the `PersonaManager` when the active persona changes.
  - [x] 3.2. Update the main application (`gdm-live-audio`) to listen for the `persona-changed` event and update the system prompt and Live2D model.
  - Requirements: 2.4.1

- [x] 4. **Integrate with `vtuber-memory-system`**:
  - [x] 4.1. Modify the `VectorStore` to handle persona-specific memory stores.
  - [x] 4.2. Update the memory system to listen for the `persona-changed` event and switch memory contexts.
  - Requirements: 2.4.1

- [x] 5. **Testing**:
  - [x] 5.1. Write unit tests for the `PersonaManager` class.
  - [x] 5.2. Write integration tests for the `settings-menu` and `PersonaManager`.
  - [x] 5.3. Write E2E tests to verify that switching personas correctly updates the AI's personality, appearance, and memory.