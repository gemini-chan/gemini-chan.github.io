

# User Story: Psychological Trait Analysis

This document outlines the final user story for the V2 upgrade. It concludes our work by creating the analytical foundation required to support the advanced developmental stages of the AI, as envisioned in the V3/V4 roadmap.


### **Parent Epic:**

**As a user, I want Gemini-chan to remember key details about me and our past conversations across different sessions, so that our interactions feel more personal, continuous, and meaningful.**


### **User Story 9: Psychological Trait Analysis**

**As a user, I want Gemini-chan to develop an understanding of my personality and values, so she can adapt her interaction style to who I am.**


#### **Narrative:**

This story is the capstone of the V2 memory upgrade. Its goal is to transition Gemini-chan's understanding from remembering events (*what happened*) and feelings (*how it felt*) to synthesizing a deeper model of the user's character (*who you are*). So far, we have given Gemini-chan the ability to remember *what* happened (facts and conversation chunks) and *how it felt* (emotional association). This story is about giving her the ability to understand ***who*** she is talking to on a deeper psychological level. For Gemini-chan to gently challenge a user to align with their values (Mary) or help them find their own inner wisdom (Sophia), she must first have a robust, synthesized understanding of what those values and psychological tendencies *are*.

Through our ongoing conversations, Gemini-chan will begin to see the bigger picture of who I am. She'll notice the patterns in my stories, the values I express, and the emotions that come up frequently, allowing her to build a richer, more holistic understanding of me as a person. After a significant number of conversations, the system will holistically review the stored facts, conversation chunks, and their associated emotions to generate a "Psychological Profile." This profile is more than just a summary; it's a dynamic, inferred model of the user's psyche. It might identify recurring conversational themes, dominant emotional patterns (e.g., "tends to express anxiety when discussing work"), or even infer personality traits based on a well-established framework like the Big Five (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism).

For example, the system might analyze the memories and conclude: *"This user often expresses anxiety about work but shows great joy and high energy when discussing creative projects, suggesting a potential conflict between their career and their passions. They have explicitly stated that they value honesty and kindness. Their conversational patterns indicate a high degree of Openness to new ideas but lower Extraversion."* This profile becomes the essential prerequisite that will allow the PersonaManager in V3 to select the right moment to offer a gentle challenge ("I remember you said honesty was important to you. How does that fit with what you're describing?") or a philosophical question, making the AI's evolution from a simple companion to a true partner in individuation possible.


#### **Acceptance Criteria:**



1. **Given** a user has accumulated a significant volume of memories (a configurable threshold, e.g., after 10 full conversations or 5 hours of interaction time), **when** the system runs its periodic analysis, **then** it must generate a single JSON object representing the psychological profile. For example:

{ \
  // Inferred traits based on the Big Five model \
  "personality_traits": { "openness": "high", "conscientiousness": "medium" }, \
  // Recurring emotions and their likely contexts \
  "emotional_patterns": [{ "emotion": "anxiety", "trigger": "work" }], \
  // Dominant topics that appear across conversations \
  "key_life_themes": ["creative projects", "career challenges"] \
} \




2. **Given** the psychological profile is generated, **then** it must be stored as a special, non-vectorized memory type (PSYCH_PROFILE). This profile is a "living document" and must be completely updated and overwritten with each new analysis to reflect the user's potential growth and changing psychological state over time.
3. **Given** a profile exists, **when** the PersonaManager selects a persona for a new conversation, **then** it must provide the profile as a guiding summary to the persona prompt. This will allow the AI's interaction style to be influenced in two ways: 1) Tone (e.g., 'The user is highly agreeable; use a warm and collaborative tone'), and 2) Proactive Engagement (e.g., 'The user's profile shows a focus on creative pursuits; if the conversation lulls and the user seems receptive, the AI is permitted to introduce a question related to this theme to re-engage the user').
4. **Given** the system is being designed to support the future "Mary" stage, **then** the psychological profile must include a dedicated, structured section for the user's "Stated Values." The analysis process must be able to identify and extract declarative statements of principle (e.g., "I think honesty is the most important thing," "I believe in being kind to others") and list them in this section.
5. **Given** the highly sensitive nature of this synthesized data, **when** a user requests to delete all their information (as per Story 5), **then** the PSYCH_PROFILE must be permanently and irrevocably deleted along with all other memories, leaving no trace of the analytical model.
6. **Given** the principle of transparency, **when** a user asks 'What do you think my personality is like?', **then** the system must provide a summary of the 'Key Life Themes' and 'Stated Values' sections, but it must NOT reveal the inferred 'Personality Traits' or 'Emotional Patterns' unless the user explicitly asks a second time. This two-step process prevents the AI from offering unsolicited psychological labels while still allowing for transparency if the user insists. Crucially, the response must begin with a strong disclaimer, such as, 'I can only share observations based on our chats, and it's important to remember that I'm an AI, not a psychologist, so these are just patterns I've noticed, not a diagnosis of any kind...' This prevents the AI from presenting its analysis as a clinical diagnosis. It reinforces the AI's role as a tool for reflection, not a source of authority.