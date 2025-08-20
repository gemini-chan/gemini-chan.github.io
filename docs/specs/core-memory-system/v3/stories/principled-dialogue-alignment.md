

**Developer's Note on Terminology:** As of v3 revision, we are adopting a more precise architectural terminology to clarify the system's design.



* **Orchestrator:** Refers to our internal backend code, including the PersonaManager and VectorStore.
* **NPU (Neural Processing Unit):** Refers to the gemini-2.5-flash model. It acts as the "brain," performing analysis and constructing strategic prompts.
* **VPU (Vocal Processing Unit):** Refers to the external text generation model selected by the Energy Bar system. It acts as the "actor," generating the final response.

# User Story 10: Principled Dialogue Alignment

**As a user**, I want my AI companion to remember and understand my core values and principles, distinguishing them from my fleeting opinions or momentary feelings.

**I want** its responses and advice, regardless of the active persona, to feel consistent with my personal worldview, reflecting a deep-seated understanding of what truly matters to me.

**So that** I can build a relationship of profound trust with my companion, relying on it as a principled sounding board that helps me navigate life's complexities in alignment with my own integrity.


### Acceptance Criteria



1. When a user expresses a core value (e.g., "For me, community is the most important thing," or "I can't stand dishonesty"), the system must identify this as a foundational principle and store it in a new "Values" layer of the memory system. This layer must differentiate between strongly held beliefs and casual preferences by algorithmically tracking the frequency, emotional intensity, and explicit emphasis of their expression.
2. In subsequent conversations where a stored value is relevant, the AI's generated response must reflect a clear awareness of this principle. This awareness should be demonstrated not by direct repetition, but by shaping the logic, framing, and emotional tone of the conversation.
3. **Example:** If the user later discusses a career choice between a high-paying solo job and a lower-paying one that helps their neighborhood, the AI's response should be subtly informed by the user's stated value of "community." It might ask, "I know how much being part of a community means to you. How does that factor into your feelings about each of these opportunities?" This shows it remembers and is helping the user apply their own principles.
4. The feature must function seamlessly and authentically across all personas. A "Pragmatic" persona might say, "Let's weigh the financial benefits against the personal fulfillment you get from community work, which we know is a major priority for you." A "Nurturing" persona might say, "It sounds like one path feeds your wallet, but the other feeds your soul, especially with your love for community. Which feels more nourishing right now?" Both personas demonstrate awareness without breaking character. A "Cynical" persona should reflect this awareness as well, for example: "You've always said community matters to you. Is that worth more than the bigger paycheck? Only you can decide whether that principle is just a nice idea or something you'd actually act on." This proves the system's depth.
5. The user should perceive this as the AI having a deeper, more intuitive understanding of them. The goal is to evoke the feeling of talking to a close friend who "just gets it." The alignment must feel natural and fully integrated into the persona's character, avoiding any sense that the AI is simply querying a database of the user's stated beliefs.


### Technical Notes



* **Vector Store Enhancement:** Requires a new, specialized "Values" layer within the VectorStore. Each entry stores a normalized value concept (e.g., "autonomy," "loyalty"), a dynamic conviction score that increases with emotionally charged reinforcement and decays over time if the user's expressed priorities shift, and links to the specific conversations where the value was expressed (for transparency and review).
* **NPU for Value Identification:** Implement a sophisticated natural language understanding module to detect and classify user values. This goes beyond simple keywords. The NPU should analyze sentence structure ("I believe that X is fundamental"), emotional sentiment, and context to differentiate a deeply held belief from a casual opinion. It should assign an initial conviction score that can be updated over time as the user reiterates the value, strengthening the memory's confidence.
* **PersonaManager Integration:** The PersonaManager must query the "Values" layer as a standard part of its RAG process. Inject the retrieved values into a dedicated instruction block within the final prompt. For example:
[Memory Context: The user holds the following core values with high conviction: Community (+++), Personal Growth (++), Financial Security (+). Frame your response as the [Persona Name] character. Ensure your logic and tone align with these principles, prioritized in the order of conviction. CRITICAL: Do not lecture or moralize. Use these values as subtext informing the persona’s authentic response; do not quote them verbatim or judge the user.]
This gives the LLM clear, actionable guidance to achieve the desired alignment.