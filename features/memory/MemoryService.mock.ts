// Mock data for MemoryService testing
export const mockConversations = [
  {
    id: "conv-1",
    transcript: `User: Hi, my name is Alex and I work as a software developer.
AI: Nice to meet you Alex! What programming languages do you enjoy?
User: I mainly work with TypeScript and Python. I have a pet dog named Sparky.
AI: That's great! How long have you had Sparky?`,
    expectedFacts: [
      {
        fact_key: "user_name",
        fact_value: "Alex",
        confidence_score: 0.99,
        permanence_score: "permanent",
      },
      {
        fact_key: "user_occupation",
        fact_value: "software developer",
        confidence_score: 0.95,
        permanence_score: "permanent",
      },
      {
        fact_key: "user_programming_languages",
        fact_value: "TypeScript and Python",
        confidence_score: 0.9,
        permanence_score: "permanent",
      },
      {
        fact_key: "user_pet_name",
        fact_value: "Sparky",
        confidence_score: 0.9,
        permanence_score: "permanent",
      },
    ],
  },
  {
    id: "conv-2",
    transcript: `User: I'm feeling really tired today. I didn't get much sleep last night.
AI: That sounds rough. Did you have trouble falling asleep?
User: Yeah, I was up worrying about my upcoming presentation. I'm really nervous about it.
AI: It's natural to feel nervous before a big presentation. What's it about?`,
    expectedFacts: [
      {
        fact_key: "user_current_mood",
        fact_value: "tired",
        confidence_score: 0.8,
        permanence_score: "temporary",
      },
      {
        fact_key: "user_sleep_quality",
        fact_value: "poor",
        confidence_score: 0.85,
        permanence_score: "temporary",
      },
      {
        fact_key: "user_upcoming_event",
        fact_value: "presentation",
        confidence_score: 0.9,
        permanence_score: "temporary",
      },
      {
        fact_key: "user_emotional_state",
        fact_value: "nervous",
        confidence_score: 0.85,
        permanence_score: "temporary",
      },
    ],
  },
];
