# Feature: Theme Engine

## 1. Introduction
This document captures the requirements for introducing a theme engine with a user-selectable theme toggle exposed in the Settings menu. The goal is to offer a neon "Cyberpunk" theme and other themes, with instant switching and persistence across sessions.

## 2. Requirements

### 2.1. Theme Toggle in Settings
- As a user,
- I want to choose between available UI themes in the Settings menu,
- so that the app matches my aesthetic preference.

#### 2.1.1. Acceptance Criteria
- WHEN the settings menu opens THEN a "Theme" select appears with available theme options ("Cyberpunk", "Dystopia", "Tron", "Synthwave", "Matrix", "Noir")
- WHEN I change the theme THEN the UI updates immediately without reload
- WHEN I change the theme THEN the choice is persisted to localStorage under key `theme`
- WHEN I reopen the app THEN the previously selected theme is restored before UI renders
- WHEN I open the theme selector dropdown THEN it does not visually obscure other settings controls.

### 2.5. Configurable Circuitry Animation
- As a user,
- I want to customize the background circuitry animation,
- so that I can adjust the visual effects to my liking.

#### 2.5.1. Acceptance Criteria
- WHEN I open the settings menu THEN I see options to control the circuitry animation.
- The options include:
  - A checkbox to enable or disable the animation entirely (this also controls the pulsing nodes).
  - A range slider to control the animation speed.
- WHEN I change these settings THEN the animation updates instantly.
- WHEN I change these settings THEN my choices are persisted to `localStorage`.
- WHEN I reopen the app THEN my circuitry animation settings are restored.

### 2.6. Collapsible Advanced Settings
- As a user,
- I want the advanced circuitry settings to be in a collapsible dropdown,
- so that the main settings menu remains clean and uncluttered.

#### 2.6.1. Acceptance Criteria
- WHEN I open the settings menu THEN the circuitry animation controls are hidden under a dropdown labeled "Advanced Settings".
- WHEN I click the "Advanced Settings" dropdown THEN the animation controls become visible.

### 2.2. Theming via CSS Variables
- As a developer,
- I want components to rely on CSS variables for colors and surfaces,
- so that new themes can be added with minimal code changes.

#### 2.2.1. Acceptance Criteria
- Components avoid hard-coded colors for primary surfaces and text
- All shared colors come from variables defined in `index.css`
- Themes are applied by setting `html[data-theme='<name>']`

### 2.3. Default and Fallback Behavior
- As a user,
- I want a sensible default if no theme has been selected,
- so that I always see a consistent UI.

#### 2.3.1. Acceptance Criteria
- Default theme is "Cyberpunk"
- If `localStorage.theme` is missing or invalid, fall back to "Cyberpunk"
- Changing to "Noir" shows a dark theme with a reddish hue.

### 2.4. Accessibility
- As a user,
- I want readable text and sufficient contrast in all themes,
- so that the app is comfortable to use.

#### 2.4.1. Acceptance Criteria
- Text contrast against surfaces and backgrounds meets reasonable readability guidelines
- Focus/hover states remain visible in all themes

