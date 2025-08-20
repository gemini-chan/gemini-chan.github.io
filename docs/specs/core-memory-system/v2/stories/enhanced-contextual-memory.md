

# User Story: Enhanced Contextual Memory

This document outlines a new user story that extends the "Enable Persistent Memory" epic, based on insights from our research into Retrieval-Augmented Generation (RAG) patterns.


### **Parent Epic:**

**As a user, I want Gemini-chan to remember key details about me and our past conversations across different sessions, so that our interactions feel more personal, continuous, and meaningful.**


### **User Story 6: Enhanced Contextual Memory**

**As a user, I want Gemini-chan to remember the stories and context behind the facts I share, so her recall feels more natural and our conversations have greater depth.**


#### **Narrative:**

Our current memory system is excellent at remembering discrete facts, much like a set of digital flashcards (e.g., "my hobby is hiking," "my dog's name is Buddy"). This is a critical foundation, but real human memory is about more than just isolated data points; it's about the stories, anecdotes, and feelings *around* those facts. This story is about upgrading Gemini-chan's memory from a collection of flashcards to a rich, searchable diary of our shared experiences.

For example, instead of just remembering the *fact* that the user likes hiking, the system should remember the *chunk* of conversation where they described their favorite trail, the funny story about the time they got caught in a sudden downpour, and the feeling of accomplishment they expressed upon reaching the summit. When the user mentions hiking again weeks later, Gemini-chan can draw from this much richer, more narrative context. Instead of just saying, "I remember you like hiking," she could say, "That's great! I hope the weather is better for you this time. I remember you telling me about getting caught in the rain on the Eagle Peak trail." This level of specific, contextual recall is what elevates the interaction. It makes the AI feel less like a database retrieving a record and more like an attentive friend who truly remembers and values the experiences they've shared with the user, creating a much deeper and more compelling sense of connection.


#### **Acceptance Criteria:**



1. **Given** a conversation has concluded, **when** the memory system processes the transcript for storage, **then** it must group the transcript into semantically related chunks. A single chunk must not separate a question from its immediate answer or break a multi-sentence thought, ensuring the context remains intact.
2. **Given** the transcript has been chunked, **when** the chunks are stored in the vector store, **then** they must be embedded and saved as a new memory type, CONVERSATION_CHUNK, to be stored and retrieved alongside existing FACT and SUMMARY types. Each chunk must also include metadata, such as the conversation date, to aid in future filtering.
3. **Given** I am talking about a topic we've discussed before (e.g., "I'm thinking about going hiking again"), **when** the system retrieves memories to inform its response, **then** the retrieval query must be designed to pull a hybrid of memory types: the most relevant 'FACT' to ground the response in truth, and the top 1-2 most relevant 'CONVERSATION_CHUNK' memories to provide narrative color and detail.
4. **Given** that both facts and conversational chunks are retrieved, **when** Gemini-chan formulates her response, **then** the final response must demonstrate synthesis by referencing a detail from the retrieved 'CONVERSATION_CHUNK' while remaining consistent with the retrieved 'FACT'. For example, the response should be more like 'I remember you said you enjoyed hiking on Eagle Peak trail' (uses chunk detail) rather than just 'I remember you like hiking' (uses fact only).
5. **Given** that multiple conversational chunks from different time periods might be relevant to a new query, **when** retrieving memories, **then** the retrieval algorithm must apply a time-decay factor, slightly boosting the relevance score of more recent chunks. This ensures that if two chunks are equally relevant to a query, the more recent one is prioritized, keeping the AI's memory focused on the user's current context.