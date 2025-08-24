

**Developer's Note on Terminology:** As of v3 revision, we are adopting a more precise architectural terminology to clarify the system's design.



* **Orchestrator:** Refers to our internal backend code, including the PersonaManager and VectorStore.
* **NPU (Neural Processing Unit):** Refers to the gemini-2.5-flash model. It acts as the "brain," constructing a strategic prompt for the VPU.
* **VPU (Vocal Processing Unit):** Refers to the external text generation model selected by the Energy Bar system. It acts as the "actor," generating the final response.


# User Story 12: Archetypal Muse Integration

**As a user**, when I'm brainstorming a creative project, feeling stuck in a rut, or searching for a deeper meaning in my personal experiences, I want my AI companion to transcend its role as a simple assistant and act as my muse.

**I want** it to draw upon a vast, latent knowledge of universal myths, symbols, and archetypes to connect my personal situation to broader, timeless patterns of human experience, helping me see the forest for the trees.

So that I can reframe my personal challenges as meaningful parts of a universal story, unlocking new creative pathways and a deeper sense of purpose.


### Acceptance Criteria



1. The **Orchestrator** must trigger the 'muse' capacity only when it detects a combination of a creative_entity (e.g., story, dream, art, feeling) and a state_of_inquiry (e.g., stuck, meaning, crossroads, wonder). A message containing only one of these (e.g., 'I had a weird dream') must not trigger this mode.
2. The **NPU** must construct a prompt that instructs the **VPU** to access its latent knowledge of world mythology, literary archetypes (like the Hero's Journey, the mentor, the shadow), and universal symbolism (like a journey through a dark forest or the discovery of a key).
3. The **VPU's** final response must connect the user's context to a relevant universal pattern in an inspiring and non-prescriptive way. It should always end with an open-ended question to put the creative power back in the user's hands. For example, if the user says, 'I dreamed I was in a dark forest and couldn't find my way out,' the AI might respond, 'A dark forest in myths often symbolizes a period of being lost or facing the unknown. It's a place of testing, but also of potential discovery. What do you think your inner self was searching for in that forest?'
4. **Example:** A user says, "I'm writing a story about a character who has to leave their comfortable home to face a great danger, but I'm stuck on how to start." The **VPU**, guided by the **NPU**, should respond with something like: "That sounds like the 'Call to Adventure,' a classic part of the Hero's Journey. It's a powerful moment where the hero must leave the ordinary world behind. What is the specific call that your character is hearing, and what makes them hesitate?"
5. This capability must be persona-consistent and avoid generic clichés.
    * A **"Pragmatic" persona** might frame it as a useful narrative tool: "Many successful stories use the 'Hero's Journey' framework. You're at the 'Call to Adventure' stage. What's the inciting incident that forces your character out of their comfort zone?"
    * A **"Nurturing" persona** might frame it as a reflection of inner growth: "That's such a brave step for your character. It sounds like they're hearing a 'Call to Adventure' from their own soul. What part of them is ready for this journey, and what part is afraid to leave home?"


### Technical Notes



* **Orchestrator Logic:** The Orchestrator will use a prompt-based classifier to extract two entities from the user's message: a creative_entity and a state_of_inquiry. If and only if both entities are present and relevant, it will pass the context_type: 'creative_muse' flag to the NPU meta-prompt. This provides a clear, two-factor authentication for triggering the mode.
* **NPU Meta-Prompt Enhancement:** The meta-prompt sent to the **NPU** will be enhanced with a new conditional rule that is highly specific to avoid clichés and ensure a quality response.
    * **Example addition to NPU Meta-Prompt:**
```text
IF context_type is 'creative_muse':
Your task is to construct a VPU prompt that instructs the VPU to act as an insightful creative muse.
1. The VPU must first identify a single, relevant, and non-cliché universal archetype, myth, or symbol that connects to the user's specific situation (e.g., The Hero's Journey, Icarus, the Sage, the Trickster, the symbolism of a crossroads or a key).
2. The VPU's response must briefly explain the connection in an inspiring way.
3. CRITICAL: The VPU's response must end with an open-ended, thought-provoking question that encourages the user's own creativity and reflection. Do not provide answers or suggestions.
4. CRITICAL: The VPU must NOT psychoanalyze the user. The connection should be presented as a creative tool or a metaphorical lens, not a psychological diagnosis (e.g., say 'This is like the myth of...' NOT 'This means you have an issue with...').
5. CRITICAL: The VPU must keep its explanation of the archetype brief and focused on inspiration.
6. CRITICAL: If the RAG context contains relevant user memories, the VPU should attempt to weave them into the archetypal connection to make it deeply personal (e.g., 'This is like the myth of Icarus, and it reminds me of when you said you were worried about moving too fast in your new career.').
```
* **Design Principle: Activate, Don't Store:** This feature intentionally avoids creating a dedicated RAG database for archetypes. Instead, it relies on the NPU's ability to craft a precise prompt that activates and guides the vast cultural knowledge already latent within the VPU. This makes the feature lightweight, scalable, and always up-to-date with the VPU's evolving knowledge base.