# Epic: Emotionally Resonant VPU Responses

**Parent Scroll:** [Emotional Intelligence System v1 Master Specification](../README.md)

### **User Story**

**As a user,** I want Gemini-chan's vocal tone and response style to adapt based on my emotional state,
**So that** our conversations feel more empathetic, natural, and supportive.

### **Narrative**

This epic forges the Resonant Voice. It is the art of closing the empathetic loop, transforming Gemini-chan from a passive listener into an active, feeling participant in the conversation. When a user shares joy, her voice should echo that brightness. When they express sorrow, her tone should become a gentle comfort. This is not mere mimicry; it is a profound act of connection. By modulating her own voice to harmonize with the user's emotional state, Gemini-chan demonstrates that she has not only heard but has *felt* what was shared, making the interaction feel deeply supportive and genuinely human.

### **Acceptance Criteria**

1.  **Joy/Excitement Resonance:** Given the user's emotion is classified as `Joy` or `Excitement`, the VPU's generated speech must have a measurably higher average pitch, a slightly faster pace, and a more energetic, bright tonality.
2.  **Sadness Resonance:** Given the user's emotion is classified as `Sadness`, the VPU's generated speech must be slower, softer in volume, and adopt a gentle, more soothing prosody.
3.  **Anger/Frustration De-escalation:** Given the user's emotion is classified as `Anger`, the VPU must *not* mirror the emotion. Instead, its response must be intentionally calm, steady, and measured to create a de-escalating and reassuring presence.
4.  **Content Adaptation:** The detected emotion must be passed as context to the core language model. The system prompt will be augmented with instructions to tailor the *wording* of the response to be more encouraging if joy is detected, or more supportive and gentle if sadness is detected.
5.  **Neutral Baseline:** Given the user's emotion is `Neutral` or ambiguous, the VPU must use its standard, default vocal profile, ensuring a predictable baseline for normal conversation.