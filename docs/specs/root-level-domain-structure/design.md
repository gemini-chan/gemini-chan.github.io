# Technical Design: Root-Level Domain Structure

### 1. Overview
This document outlines the technical design for refactoring the project's file structure to a root-level, domain-driven architecture. The goal of this refactoring is to improve modularity, scalability, and maintainability by organizing source code according to its business domain. This design addresses the requirements for creating a new directory structure, migrating existing files, updating configurations, and resolving all dependency paths to ensure the application remains fully functional.

### 2. Architecture
The new architecture will be based on a set of domain-specific directories located at the project root. The `src/` directory will be eliminated, and all TypeScript source files will be moved into the new structure.

#### 2.1. Target Directory Structure
The proposed root-level directory structure is as follows:
```
/
├── app/                 # Application entry point and global setup
├── components/          # Reusable UI components
├── features/            # Feature-specific modules and business logic
├── services/            # Cross-cutting concerns (e.g., logging, API services)
├── store/               # Data storage and state management
├── visuals/             # 3D rendering and visual components
├── live2d/              # Live2D integration files
├── shared/              # Shared utilities, types, and hooks
└── tests/               # Global test setup and integration tests
```

### 3. Components and Interfaces
In the context of this structural refactor, "components" refer to the new root-level directories. Their responsibilities are defined as follows:

*   **`app/`**: Contains the main application entry point (`main.tsx`) and global environment type definitions.
*   **`components/`**: Houses reusable UI components that are not specific to any single feature.
*   **`features/`**: Contains self-contained modules representing distinct business domains (e.g., `persona`, `summarization`).
*   **`services/`**: Holds services that provide cross-cutting functionality, such as logging or energy management.
*   **`store/`**: Manages data persistence and state, such as the vector store.
*   **`visuals/`**: Contains all components and logic related to 3D rendering and visual effects.
*   **`live2d/`**: Contains all files related to the Live2D integration.
*   **`shared/`**: A repository for shared code, including common types, utility functions, and hooks that are used across multiple domains.
*   **`tests/`**: For end-to-end tests, integration tests, and any test setup that spans multiple domains.

### 4. Data Models
This feature is a structural refactoring and does not introduce any changes to the application's data models. This section is not applicable.

### 5. Error Handling
This refactoring will not alter the existing error-handling logic of the application. All current error-handling mechanisms will remain in place.

### 6. Testing Strategy
The testing strategy is focused on verifying that the application remains fully functional and stable after the refactoring.

*   **Static Analysis**: After the file migration, run a full TypeScript compilation (`tsc --noEmit`) and linting to catch any unresolved import paths or syntax errors.
*   **Unit & Integration Tests**: Execute the entire existing test suite to ensure that all individual components and services function as expected in their new locations.
*   **Build Verification**: Run the production build process (`vite build`) to confirm that all configuration changes are correct and the application can be successfully bundled.
*   **Manual Smoke Testing**: Perform a manual run-through of the application's core features in a development environment to catch any runtime errors that may not have been caught by automated tests.