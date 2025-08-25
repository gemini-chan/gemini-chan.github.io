export type PersonaKey = "sourceress" | "assistant" | "vtuber" | string;

export interface PersonaAnimationRules {
  // Map of expressions parameters to default values to apply when persona is active
  paramsOnEmotion?: {
    [emotion: string]: Array<{ id: string; value: number }>;
  };
  // Params that should always be forced while persona is active
  paramsAlways?: Array<{ id: string; value: number }>;
}

// Initial rules for Sourceress persona derived from Fern model specifics
export const personaAnimationRules: Record<PersonaKey, PersonaAnimationRules> = {
  sourceress: {
    paramsAlways: [],
    paramsOnEmotion: {
      // Joyful/happy states: smile with cheeks
      joy: [
        { id: "ParamEyeSmile", value: 0.9 },
        { id: "ParamCheek", value: 0.6 },
      ],
      happy: [
        { id: "ParamEyeSmile", value: 0.9 },
        { id: "ParamCheek", value: 0.6 },
      ],
      delighted: [
        { id: "ParamEyeSmile", value: 0.9 },
        { id: "ParamCheek", value: 0.6 },
      ],
      excited: [
        { id: "ParamEyeSmile", value: 0.8 },
        { id: "ParamCheek", value: 0.5 },
      ],

      // Sad/gloom states: Fern Param34 gloom
      sad: [{ id: "Param34", value: 1 }],
      sadness: [{ id: "Param34", value: 1 }],
      displeased: [{ id: "Param34", value: 1 }],
      disappointed: [{ id: "Param34", value: 1 }],

      // Anger states: Fern Param32
      angry: [{ id: "Param32", value: 1 }],
      anger: [{ id: "Param32", value: 1 }],
      annoyed: [{ id: "Param32", value: 1 }],

      // Surprise/shock: big eyes + open mouth
      surprise: [
        { id: "ParamEyeLOpen", value: 1.2 },
        { id: "ParamEyeROpen", value: 1.2 },
        { id: "ParamMouthOpenY", value: 0.7 },
      ],
      surprised: [
        { id: "ParamEyeLOpen", value: 1.2 },
        { id: "ParamEyeROpen", value: 1.2 },
        { id: "ParamMouthOpenY", value: 0.7 },
      ],
      shock: [
        { id: "ParamEyeLOpen", value: 1.2 },
        { id: "ParamEyeROpen", value: 1.2 },
        { id: "ParamMouthOpenY", value: 0.7 },
      ],

      // Curiosity/thinking: squint / brow angles from sq.exp3.json
      curiosity: [
        { id: "ParamBrowLAngle2", value: 1.0 },
        { id: "ParamBrowRAngle", value: 1.0 },
      ],
      thinking: [
        { id: "ParamBrowLAngle2", value: 1.0 },
        { id: "ParamBrowRAngle", value: 1.0 },
      ],
      squint: [
        { id: "ParamBrowLAngle2", value: 1.0 },
        { id: "ParamBrowRAngle", value: 1.0 },
      ],

      // Fear/anxiety
      fear: [
        { id: "ParamEyeLOpen", value: 1.0 },
        { id: "ParamEyeROpen", value: 1.0 },
        { id: "ParamMouthOpenY", value: 0.4 },
        { id: "ParamBrowLY", value: 0.2 },
        { id: "ParamBrowRY", value: 0.2 },
      ],
      anxious: [
        { id: "ParamEyeLOpen", value: 1.0 },
        { id: "ParamEyeROpen", value: 1.0 },
        { id: "ParamMouthOpenY", value: 0.3 },
        { id: "ParamBrowLY", value: 0.2 },
        { id: "ParamBrowRY", value: 0.2 },
      ],

      // Shy/embarrassed
      shy: [
        { id: "ParamCheek", value: 0.8 },
        { id: "ParamEyeSmile", value: 0.5 },
        { id: "ParamEyeLOpen", value: 0.7 },
        { id: "ParamEyeROpen", value: 0.7 },
      ],
      embarrassed: [
        { id: "ParamCheek", value: 0.8 },
        { id: "ParamEyeSmile", value: 0.5 },
        { id: "ParamEyeLOpen", value: 0.7 },
        { id: "ParamEyeROpen", value: 0.7 },
      ],

      // Sleepy/tired
      sleepy: [
        { id: "ParamEyeLOpen", value: 0.2 },
        { id: "ParamEyeROpen", value: 0.2 },
        { id: "ParamEyeSmile", value: 0.1 },
        { id: "ParamMouthForm", value: -0.2 },
      ],
      tired: [
        { id: "ParamEyeLOpen", value: 0.3 },
        { id: "ParamEyeROpen", value: 0.3 },
        { id: "ParamMouthForm", value: -0.2 },
      ],

      // Neutral: reset Fern specifics
      neutral: [
        { id: "Param32", value: 0 },
        { id: "Param34", value: 0 },
      ],
    },
  },
};
