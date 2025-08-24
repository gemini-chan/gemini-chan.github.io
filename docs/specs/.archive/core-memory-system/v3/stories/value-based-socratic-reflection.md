

**Developer's Note on Terminology:** As of v3 revision, we are adopting a more precise architectural terminology to reflect a two-model API design.



* **Orchestrator:** Refers to our internal backend code, including the PersonaManager and VectorStore. Its role is to gather data (RAG) and manage the workflow between the two external model calls.
* **NPU (Neural Processing Unit):** Refers to the gemini-2.5-flash model via the Gemini API. This is the "brain" of the companion. The Orchestrator sends it raw context, and the NPU's job is to *think* and construct the final, strategic prompt for the VPU.
* **VPU (Vocal Processing Unit):** Refers to the external text generation model selected by the Energy Bar system. This is the "actor" that receives the detailed, strategic prompt from the NPU and generates the final, in-character text response.


# User Story 11 (Revised): Integrated Socratic Reflection

**As a user**, when I express that I'm facing a difficult decision or feeling conflicted, I want my AI companion to naturally adapt its conversational stance.

**I want** it to intelligently recognize the gravity of the moment and, instead of offering simple solutions, use its memory of my core values to help guide my own reflection through insightful questioning.

**So that** I am empowered to connect with my own inner wisdom, allowing me to make decisions that align with my integrity in a way that feels like I'm talking to a wise friend, not a machine executing a script.


### Acceptance Criteria



1. When a user's message contains clear indicators of a dilemma, the **Orchestrator** must trigger the two-step NPU → VPU process to produce a Socratic, reflective response.
2. The generated Socratic response from the **VPU** must be directly informed by a relevant, high-conviction value retrieved by the **Orchestrator** and processed by the **NPU**. If no relevant value is found, the response must fall back to a general Socratic question.
3. **Example:** A user states, "My boss asked me to omit some negative data..." The **Orchestrator** retrieves the "honesty" value. The **NPU** processes this and constructs a strategic prompt. The **VPU** receives this prompt and generates a response like, "That sounds like a very stressful position to be in. How does that request challenge the strong sense of honesty you've talked about before?"
4. The shift in conversational stance must be seamless and persona-consistent. The **NPU** is responsible for ensuring the strategic prompt contains the correct persona instructions for the **VPU** to perform accurately.
5. If the user's next message indicates resolution, the **NPU** must detect this and construct a standard conversational prompt for the **VPU**, ensuring a natural return to normal dialogue.


### **Technical Notes**



* **Two-Step API Call:** This feature is now implemented as a two-step API call managed by the **Orchestrator**.
    1. **Call 1 (Orchestrator → NPU):** The PersonaManager (part of the Orchestrator) gathers RAG context and sends it to the gemini-2.5-flash model (NPU) with a "meta-prompt," asking it to *create the prompt for the next model*.
    2. **Call 2 (Orchestrator → VPU):** The Orchestrator takes the detailed prompt returned by the NPU and sends it to the dynamically selected VPU model for final text generation.
* **NPU Meta-Prompt Engineering:** The primary technical task is designing the "meta-prompt" that the Orchestrator sends to the NPU. This prompt instructs the NPU on how to think.
    * **Example Meta-Prompt for NPU:**
```text
You are the strategic mind for a conversational AI. Your task is to construct a detailed system prompt for another AI (the VPU) to use.

Analyze the following context:
- Persona: [Base Persona Prompt]
- Memory: [Memory Context (RAG)]
- History: [Conversation History]
- User's Message: [User's Latest Message]

Based on this context, construct a new system prompt that includes a '[Conditional Behavior Rules]' block. If the user's message is a dilemma, the rules should instruct the VPU to ask a Socratic question. Otherwise, the rules should instruct the VPU to respond normally.

Return ONLY the complete, final system prompt for the VPU.
```
* **VPU Prompt Structure:** The *output* of the NPU will be the detailed prompt structure we designed previously, which is then used by the VPU.
* **Simplicity and Robustness:** This design delegates the complex conditional logic to the fast and efficient gemini-2.5-flash model (NPU), allowing the potentially more powerful (and expensive) VPU to focus solely on high-quality text generation.
* **Prompt Templating:** The meta-prompt for the NPU should be externalized into a template file within the **Orchestrator**'s codebase for easy iteration.