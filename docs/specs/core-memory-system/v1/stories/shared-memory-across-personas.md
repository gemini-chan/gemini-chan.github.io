# User Story: Shared Memory Across Personas

### **User Story:**

**As a user, I want my foundational memories (like my name, hobbies, or preferences) to be retained and accessible across different personas, so that the AI maintains a continuous and unified understanding of me, regardless of which character I am interacting with.**

### **Acceptance Criteria:**

1.  **Given** I have told one persona (e.g., the VTuber) a key fact about myself (e.g., "My favorite cats are tabbys").
2.  **When** I switch to a different persona (e.g., the Assistant).
3.  **Then** the new persona should have access to that same key fact and be able to use it contextually in conversation.
4.  **Given** I tell the second persona a new fact.
5.  **When** I switch back to the original persona.
6.  **Then** the original persona should also have access to the new fact learned by the second persona.
7.  **The** system must differentiate between memories that are globally applicable to the user and memories that are specific to a particular persona's relationship with the user (future consideration). For v1 of this feature, all memories can be treated as global.

### **Notes:**

*   This story addresses a limitation discovered during prototype validation where switching personas was observed to wipe the memory context, causing the AI to forget previously learned information.
*   The current implementation ties memories strictly to a `personaId`. The technical solution will likely involve creating a global `userId` and associating memories with it, while still allowing for persona-specific context where necessary.