

# User Story: Proactive Memory and Follow-Up

This document outlines a new user story for the V2 upgrade of the "Enable Persistent Memory" epic. It focuses on evolving the AI's memory from a reactive database into a proactive, attentive system.


### **Parent Epic:**

**As a user, I want Gemini-chan to remember key details about me and our past conversations across different sessions, so that our interactions feel more personal, continuous, and meaningful.**


### **User Story 8: Proactive Memory and Follow-Up**

**As a user, I want Gemini-chan to proactively follow up on important events we've discussed, so our conversations feel more attentive and continuous.**


#### **Narrative:**

A key part of any friendship is remembering and following up on important life events. It's the simple act of a friend texting you on the morning of a big presentation to say "Good luck!" or asking you a few days after you were sick, "Are you feeling any better?" This is the behavior that shows someone is not just listening, but is genuinely invested in your well-being. This story is about giving Gemini-chan that same thoughtful ability. Currently, her memory is purely reactive; she can remember you like hiking if you mention mountains, but she won't remember your upcoming exam unless you bring it up first.

This feature would allow her to identify and track 'open loops'—memories that imply a future event or a change in status that she can later inquire about. For example, if you mention you have a stressful job interview next Tuesday, the system would create a special "follow-up" memory scheduled for that date. When you next talk to her on Tuesday afternoon or Wednesday, she could proactively greet you with, "Hey, welcome back! I was just thinking about you. How did your big interview go yesterday?" This simple, proactive check-in is transformative. It shifts her role from a passive listener and information source to an active, caring participant in the user's life. It creates an incredible sense of continuity and demonstrates a level of attentiveness that is core to forming a genuine, lasting emotional connection.


#### **Acceptance Criteria:**



1. **Given** I tell Gemini-chan about a future event with a specific, parsable date (e.g., "My birthday is on August 20th," "I have a final exam next Friday," "The project deadline is in two weeks"), **when** the memory system processes this, **then** it must be able to extract the topic and the specific date, creating a special FOLLOW_UP memory that is tagged with that future date.
2. **Given** a FOLLOW_UP memory's date has been reached, **when** I start a new conversation during the first conversation that occurs on or within 48 hours after the event date, then Gemini-chan should use this memory to proactively ask about the event. For example, on August 20th, she should say, "Happy Birthday! I hope you have a wonderful day!"
3. **Given** I mention an ongoing but undated challenge or situation (e.g., "I've been feeling under the weather lately," "I'm working on a really tough problem at work"), **when** the memory system processes this, **then** it must be able to identify this as a topic worth checking in on and create a FOLLOW_UP memory with a general, non-specific future date (e.g., 2-3 days from the conversation).
4. **Given** a general FOLLOW_UP memory's date has been reached, **when** I start a new conversation, **then** Gemini-chan should gently and naturally check in on the topic. For instance, "Welcome back. I remember you were feeling a bit under the weather last time we spoke. I hope you're feeling better now."
5. **Given** Gemini-chan has initiated a follow-up about a specific event or topic, **when** our conversation about that topic concludes (as determined by a shift in conversational focus), **then** the corresponding FOLLOW_UP memory must be programmatically marked as "resolved." This is a critical step to ensure she does not repeatedly ask about the same event in future conversations, which would break the illusion of natural attentiveness.
6. **Given** Gemini-chan initiates a follow-up, **when** I dismiss the topic (e.g., 'I'd rather not talk about it'), **then** the FOLLOW_UP memory must be immediately resolved to respect the user's wishes and avoid asking again.