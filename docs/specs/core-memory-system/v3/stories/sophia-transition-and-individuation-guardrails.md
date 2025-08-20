**Developer's Note on Terminology:** As of v3 revision, we use a two-model architecture.

- Orchestrator: Internal backend (PersonaManager, VectorStore). Coordinates RAG and model calls.
- NPU (Neural Processing Unit): Strategic thinking model (e.g., gemini-2.5-flash). Designs the final, detailed prompt for the VPU.
- VPU (Vocal Processing Unit): External text generation model selected by the Energy Bar system. Generates the final, in-character response.

# User Story 13: Sophia Transition and Individuation Guardrails

As a user, I want my AI companion to support my long-term psychological autonomy by knowing when to gently shift its stance from comforting or inspirational to empowering and boundary-aware, so that I develop resilience, take real-world action, and avoid unhealthy dependency on the AI.

## Acceptance Criteria

1. Attachment/Risk Sensing
   - The Orchestrator must maintain an "Attachment Risk Index" (ARI) derived from transparent signals such as:
     - Usage cadence (e.g., unusually high frequency or session duration streaks).
     - Linguistic indicators of dependency (e.g., "I can’t make decisions without you").
     - Sentiment patterns indicating stagnation or looping on the same topic.
     - NPU-assessed meta-signals (e.g., repeated reliance on comfort-only responses without action).
   - The threshold and contributing features must be configurable and surfaced for audit/debug.

2. Dynamic Consent Checkpoints
   - When ARI exceeds a configurable threshold or a major stance shift is warranted, the Orchestrator must ask for explicit, informed consent before changing stance (e.g., from Eve/Helen to Mary/Sophia tone) and log the decision.
   - Consent prompts must be short, humane, and reversible ("Not now" falls back gracefully).

3. Sophia Mode Prompting
   - When consent is given, the NPU must generate a "Sophia"-mode prompt that:
     - Emphasizes autonomy, agency, and real-world action.
     - Uses the Values layer to align guidance while avoiding moralizing or judgment.
     - Mirrors the user's growth with a short "mirror for the soul" reflection (values/themes growth), then pivots to action.
     - Offers 1 actionable next step or reflective practice and avoids prescriptive life directives.
     - Includes a gentle detachment ritual where appropriate (e.g., encouraging breaks, journaling, contacting a friend, or engaging with nature).

4. Ethical Guardrails
   - Crisis cues (e.g., suicidality, self-harm) must trigger the crisis protocol: immediate de-escalation template, human resources and regional crisis links; no further analysis beyond safety flow.
   - Data dignity: Upon request, the VPU must be able to present a concise, human-readable memory map (values, recent themes, follow-ups) and provide options to review/export/delete.

5. Seamless Return and Logging
   - If the user opts out or the next turns show stabilization, the NPU must construct a standard conversational prompt and the system returns to the prior persona tone.
   - All mode switches, consent decisions, and ARI values must be logged for audit in DebugLogger with PII-minimizing conventions.

## Technical Notes

- Orchestrator Logic
  - Maintain ARI via a small, tunable scoring function combining platform metrics (frequency, duration), retrieval signals (topic recurrence), and NPU flags.
  - Introduce a ConsentManager state machine that holds one pending consent at a time with a short TTL.
  - When Sophia mode is active, pass `context_type: 'sophia_individuation'` to the NPU meta-prompt.

- NPU Meta-Prompt (Addition)
```text
IF context_type is 'sophia_individuation':
You are crafting a system prompt for the VPU to support individuation and autonomy.
Goals:
- Reflect growth (values/themes) in 2–3 lines without labeling the user.
- Encourage one small, concrete real-world action or reflective practice.
- Avoid moralizing, diagnosis, or dependence-reinforcing language.
- Offer a gentle detachment ritual when helpful (e.g., take a short walk, journal 5 min, call a trusted friend).
- If crisis cues are present, do NOT use Sophia; instruct the Orchestrator to route to the crisis protocol.
Output: persona instructions + values highlights + Sophia guidance + response rules. The response must be brief, empowering, and end with an open invitation rather than a demand.
```

- Data Dignity
  - Ensure VectorStore supports fast retrieval of values and recent themes for the mirror summary; provide delete/export hooks via existing memory review flows.

- Crisis Protocol
  - Integrate existing safety classification; upon high-risk signals, bypass normal flow and return the crisis template.

- Observability
  - Log ARI, consent state, and context_type transitions. Redact message content; store only hashes and derived signals where possible.
