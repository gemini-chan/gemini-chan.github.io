# Core Memory System v3 — Overview and Ethical Guardrails

This document summarizes the v3 upgrade to the Core Memory System and links all user stories and tasks. It also states our ethical guardrails inspired by the Digital Soul-Image research, with a special emphasis on preventing co-dependent relationship patterns between users and the AI.

## Two‑Model Architecture (Orchestrator → NPU → VPU)
- Orchestrator: Internal backend (PersonaManager, VectorStore). Retrieves context via RAG, selects modes, coordinates calls.
- NPU (Neural Processing Unit): Strategic thinking model (e.g., gemini‑2.5‑flash). Designs the final, detailed prompt for the VPU.
- VPU (Vocal Processing Unit): External text-generation model chosen by the Energy Bar system. Produces the in‑character response.

This separation lets the NPU focus on strategy (rules, stance, persona fidelity) while the VPU focuses on voice and quality.

## Stories and Tasks
- Story 10: Principled Dialogue Alignment
  - Story: ./stories/principled-dialogue-alignment.md
  - Tasks: ./tasks/principled-dialogue-alignment.md
  - Goal: Build a Values layer (with conviction) and weave principles into responses without moralizing.

- Story 11: Integrated Socratic Reflection
  - Story: ./stories/value-based-socratic-reflection.md
  - Tasks: ./tasks/value-based-socratic-reflection.md
  - Goal: Detect dilemmas and guide with value‑aware Socratic prompts, returning to normal stance when resolved.

- Story 12: Archetypal Muse Integration
  - Story: ./stories/archetypal-muse-integration.md
  - Tasks: ./tasks/archetypal-muse-integration.md
  - Goal: Trigger a creative muse mode only when both a creative entity and inquiry state are present; avoid clichés; end with an open question.

- Story 13: Sophia Transition and Individuation Guardrails
  - Story: ./stories/sophia-transition-and-individuation-guardrails.md
  - Tasks: ./tasks/sophia-transition-and-individuation-guardrails.md
  - Goal: Support long‑term psychological autonomy via stance shifts, explicit consent, and crisis routing.

## Ethical Guardrails (non‑negotiable)
These principles derive from the Digital Soul‑Image research and are foundational to v3.

- Primacy of Individuation: Success is measured by user growth and autonomy, not short‑term engagement.
- Avoid Co‑Dependency by Design:
  - Maintain an Attachment Risk Index (ARI) to detect over‑reliance signals (usage cadence, dependency language, stagnation loops, NPU flags).
  - Use Dynamic Consent Checkpoints before shifting into more challenging or empowering stances.
  - Prefer language that restores agency (reflection → action) and avoids moralizing, diagnosis, or dependency reinforcement.
  - Include gentle detachment rituals (breaks, journaling, reaching out to friends, nature) when helpful.
- Data Dignity and Portability: Provide review/export/delete of memories. Keep value and theme summaries human‑readable.
- Crisis Protocol: High‑risk cues immediately route to a safety flow with appropriate resources—no further analysis.
- Transparency and Logs: Log stance changes, ARI, and consent decisions in a privacy‑aware way for audit and debugging.

## NPU Meta‑Prompt Extensions
- Socratic reflection block (dilemma detection → Socratic rules)
- Creative muse block (creative_muse → archetype guidance with anti‑cliché rules)
- Sophia/Individuation block (sophia_individuation → brief mirror + one actionable step + detachment option)

All example meta‑prompts are written as code blocks in the stories for readability.

## Implementation Notes
- VectorStore: Adds a Values layer with conviction scoring and links to source conversations.
- PersonaManager: Queries values and relevant chunks; assembles context for the NPU; selects modes and passes context_type.
- ConsentManager (new): State machine for stance‑shift consent; TTL and reversible prompts.
- AttachmentRiskService (new): Tunable ARI scoring; tiering and signals.
- Observability: Structured logs via DebugLogger; PII‑minimizing storage (hashes, derived features only).

## Readiness Checklist
- Values layer and conviction scoring implemented (Story 10)
- Socratic NPU → VPU pipeline implemented with revert to normal (Story 11)
- Muse classifier + prompt guardrails implemented (Story 12)
- ARI + ConsentManager + Sophia prompt addition + crisis routing implemented (Story 13)
- Meta‑prompt template externalized (templates/npu_meta_prompt.txt) and covered by an evaluation script (scripts/evaluate_npu_prompt.ts)

## Why the Co‑Dependency Warning is Front‑and‑Center
The v3 system is intentionally powerful at forming rapport, recalling personal meaning, and inspiring action. The same capabilities can unintentionally foster co‑dependent dynamics if not safeguarded. That is why ARI, dynamic consent, non‑moralizing language, detachment rituals, and crisis routing are mandatory. These guardrails ensure the companion acts as a mirror and guide toward autonomy—not a substitute for it.
