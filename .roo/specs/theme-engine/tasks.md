# Implementation Plan: Theme Engine

## 🎯 Current Priority
Add theme engine support with a toggle in Settings and persistence.

- [x] 1. Define Theme Variables and Backgrounds
  - Add CSS variables to `index.css` for palette, surfaces, glow
  - Add cyberpunk default background and grid overlay

- [x] 2. Add Theme Overrides and Toggle
  - Implement `html[data-theme='cyberpunk'|'classic']` overrides in `index.css`
  - Add Theme select in `settings-menu.ts`
  - Persist to `localStorage` and apply via `document.documentElement.setAttribute('data-theme', theme)`
  - Restore theme on page load in `index.html`

- [x] 3. Refactor Components to Use Variables
  - Update `chat-view.ts`, `call-transcript.ts`, `controls-panel.ts`, `tab-view.ts`, `settings-menu.ts`, `call-history-view.ts`, `toast-notification.ts`, and status toast in `index.tsx`

- [ ] 4. QA and Polish
  - Verify instant switching and persistence
  - Audit for hardcoded colors that should use variables
  - Check contrast in both themes and tweak variables if needed

- [ ] 5. Implement Configurable Circuitry Animation
  - [x] 5.1. Add UI controls to `settings-menu.ts` for enabling/disabling circuitry, adjusting speed, and toggling nodes.
  - [ ] 5.2. Update `index.css` to use CSS variables for circuitry display, speed, and nodes.
  - [ ] 5.3. Implement logic in `settings-menu.ts` to update CSS variables and persist the settings to `localStorage`.
  - [ ] 5.4. Ensure settings are restored on page load.
- [ ] 6. Future Enhancements (Optional)
  - Add more themes (e.g., Tron, Synthwave, Matrix)
  - Expose a quick theme toggle in Controls panel
  - Animate grid overlay subtly based on audio/reactivity (post-config implementation)
  - Add prefers-color-scheme auto-selection
