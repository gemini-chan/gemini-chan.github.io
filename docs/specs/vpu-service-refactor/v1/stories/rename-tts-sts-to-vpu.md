# Story: Refactor Session Managers into a Unified VPUService

**As a developer,**
**I want** to consolidate the `TextSessionManager` and `CallSessionManager` into a single, unified `VPUService`,
**So that** the codebase aligns with the established NPU-VPU architectural pattern, improving naming consistency and code clarity.

## Acceptance Criteria

1.  **Create VPUService:** A new service module, `features/vpu/VPUService.ts`, will be created to encapsulate the logic for handling both Text-to-Speech (TTS) and Speech-to-Speech (STS) sessions.
2.  **Migrate Logic:** The core functionalities of the existing `TextSessionManager` and `CallSessionManager` classes (currently in `app/main.tsx`) will be migrated into the new `VPUService`.
3.  **Unified Session Management:** The `VPUService` will manage the lifecycle of both "text" (chat) and "call" sessions, including initialization, message handling, and termination.
4.  **Refactor `main.tsx`:** The `gdm-live-audio` component in `app/main.tsx` will be refactored to instantiate and interact with the `VPUService` instead of the individual session managers.
5.  **Remove Old Managers:** The `TextSessionManager` and `CallSessionManager` classes will be removed from `app/main.tsx` after their logic is successfully migrated.
6.  **Maintain Functionality:** All existing features for chat (TTS) and calls (STS), including session resumption, error handling, and transcript updates, must function identically to the previous implementation.
7.  **Code Clarity:** The new implementation should be cleaner and easier to understand, clearly separating the VPU's responsibilities from the main application component.