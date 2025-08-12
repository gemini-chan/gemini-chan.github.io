# Implementation Plan: Theme Engine

## 🎯 Current Priority
Add theme engine support with a toggle in Settings and persistence.

- [x] 1. Define Theme Variables and Backgrounds
  - Add CSS variables to `index.css` for palette, surfaces, glow
  - Add cyberpunk default background and grid overlay

- [x] 2. Add Theme Overrides and Toggle
  - Implement `html[data-theme='...']` overrides in `index.css` for theme switching
  - Add Theme select in `settings-menu.ts`
  - Persist to `localStorage` and apply via `document.documentElement.setAttribute('data-theme', theme)`
  - Restore theme on page load in `index.html`

- [x] 3. Refactor Components to Use Variables
  - Update `chat-view.ts`, `call-transcript.ts`, `controls-panel.ts`, `tab-view.ts`, `settings-menu.ts`, `call-history-view.ts`, `toast-notification.ts`, and status toast in `index.tsx`

- [x] 4. QA and Polish
  - Verify instant switching and persistence
  - Audit for hardcoded colors that should use variables
  - Check contrast in both themes and tweak variables if needed

- [x] 5. Implement Configurable Circuitry Animation
  - [x] 5.1. Add UI controls to `settings-menu.ts` for enabling/disabling circuitry, adjusting speed, and toggling nodes.
  - [x] 5.2. Update `index.css` to use CSS variables for circuitry display, speed, and nodes.
  - [x] 5.3. Implement logic in `settings-menu.ts` to update CSS variables and persist the settings to `localStorage`.
  - [x] 5.4. Ensure settings are restored on page load.
- [ ] 6. Future Enhancements (Optional)
  - [x] 6.1 Add more themes (e.g., Tron, Synthwave, Matrix)
  - [?] 6.2 Expose a quick theme toggle in Controls panel
  - [ ] 6.3 Animate grid overlay subtly based on audio/reactivity (post-config implementation)
  - [x] 6.4 Add prefers-color-scheme auto-selection


## 6. Fix Pulsing Nodes Animation
- [x] 6.1. Remove the separate "show pulsing nodes" checkbox from the `settings-menu.ts` component.
- [x] 6.2. In `settings-menu.ts`, remove the logic that handles the separate pulsing nodes switch from the `_applyCircuitrySettings`, `_onCircuitryNodesChange`, and `applyCircuitrySettingsOnLoad` functions.
- [x] 6.3. In `index.css`, modify the `live2d-gate::before` styles to ensure the pulsing nodes animation is visible and correctly timed when the main circuitry animation is enabled.

- [x] 7. Adjust Animation Color
  - [x] 7.1. In `index.css`, darken the circuitry animation color to better blend with the background.

- [x] 8. Deprecate Classic Theme
  - [x] 8.1. Remove all mentions of the "Classic" theme from the specification documents (`requirements.md`, `design.md`).
  - [x] 8.2. Remove the "Classic" theme option from `settings-menu.ts`.
  - [x] 8.3. Remove the `html[data-theme='classic']` styles from `index.css`.

- [x] 9. Refactor Advanced Settings into a Dropdown
  - [x] 9.1. In `settings-menu.ts`, wrap the circuitry animation controls in a `<details>` element with the summary "Advanced Settings".

- [ ] 10. Implement Noir Theme
  - [ ] 10.1. In `index.css`, add a new `html[data-theme='noir']` block with reddish color overrides.
  - [ ] 10.2. In `settings-menu.ts`, add "Noir" to the theme selection dropdown.
