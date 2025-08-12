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

- [ ] 5. Future Enhancements (Optional)
  - Add more themes (e.g., Tron, Synthwave, Matrix)
  - Expose a quick theme toggle in Controls panel
  - Animate grid overlay subtly based on audio/reactivity
  - Add prefers-color-scheme auto-selection
