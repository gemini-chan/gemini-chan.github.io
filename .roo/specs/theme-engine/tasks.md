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

- [x] 9. Refactor UI into a Dropdown
  - [x] 9.1. In `settings-menu.ts`, wrap the circuitry animation controls in a `<details>` element with the summary "UI".

- [x] 10. Implement Noir Theme
  - [x] 10.1. In `index.css`, add a new `html[data-theme='noir']` block with reddish color overrides.
  - [x] 10.2. In `settings-menu.ts`, add "Noir" to the theme selection dropdown.
  - [x] 10.3. **REVISION:** Update the Noir theme to have a darker, almost black background with neon red accents.
- [x] 11. Fix Cyberpunk Theme Regression
  - [x] 11.1. In `index.css`, correct the `l:root` selector to `:root`.
- [x] 12. Fix Cyberpunk Theme Regression Part 2
    - [x] 12.1. In `index.css`, merge the duplicate `:root` declarations to fix the theme.

  - [x] 14. Fix theme selector styling
    - [x] 14.1. **REVISION:** Replace the theme dropdown with a set of buttons, one for each theme.
    - [x] 14.2. Ensure the active theme button is visually highlighted.
    - [x] 14.3. Ensure the buttons are styled consistently with the application's themes and have proper contrast.
  
  - [x] 15. Implement Themed Scrollbars
    - [x] 15.1. Add global styles for `::-webkit-scrollbar` in `index.css`.
    - [x] 15.2. Use theme variables (`--cp-surface`, `--cp-surface-strong`, etc.) to color the scrollbar track and thumb.
    - [x] 15.3. Ensure the scrollbar styling is applied across all themes.
    - [x] 15.4. **REVISION:** The scrollbar styles are not being applied. The selectors need to be more specific. Update the CSS to target `html` to ensure the styles are applied globally.
    
    - [ ] 16. Refactor Auto Theme Selection
      - [ ] 16.1. Remove the "Auto" theme button from `settings-menu.ts`.
      - [ ] 16.2. In `index.html`, update the theme initialization script to:
        - Check for a theme in `localStorage`.
        - If no theme is found, check the system's `prefers-color-scheme`.
        - If the system theme is dark, randomly select one of the available dark themes.
        - If the system theme is light, randomly select one of the available light themes.
- [ ] 18. Add save/cancel button block to theme settings
  - [ ] 18.1. **REVISION:** The previous implementation was incorrect.
    - The `_handleThemeFormInput` function is unused and should be removed.
    - The save/cancel logic needs to be simplified to correctly save the selected theme to localStorage or revert to the previous theme.
