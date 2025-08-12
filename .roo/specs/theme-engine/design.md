# Technical Design: Theme Engine

## 1. Overview
Add a simple, extensible theme engine to support multiple visual styles for the UI. The initial release provides three themes:
 - Cyberpunk (default): neon gradients, glass surfaces, glows
 - Dystopia: a darker variant of Cyberpunk
 - Noir: a dark theme with a reddish hue
 
 Themes are applied via a data attribute on the root HTML element (`html[data-theme='<name>']`) and implemented through CSS custom properties (variables). Components consume variables only and avoid hardcoded colors, enabling runtime theme switching.

## 2. Architecture
- Theme Scope: Global
  - Root CSS variables defined in `index.css` under `:root`
  - Theme overrides via `html[data-theme='<name>']`
- Consumption: Local component styles
  - Components reference variables (e.g., `var(--cp-text)`, `var(--cp-surface)`, `--cp-glow-*`) exclusively
  - Avoid hard-coded color literals in components
- Persistence:
  - Selected theme stored in `localStorage` under key `theme`
  - Restored at startup by inline `onload` script in `index.html`
- Switching:
  - Settings menu exposes a Theme select
  - On change, update `document.documentElement.dataset.theme` (data-theme attr) and persist to `localStorage`

## 3. Styling Model
- Palette Variables
  - --cp-bg-1, --cp-bg-2, --cp-bg-3 (background gradients)
  - --cp-text, --cp-muted (text)
  - --cp-cyan, --cp-magenta, --cp-purple, --cp-green, --cp-red, --cp-amber (accents)
- Surface Variables
  - --cp-surface, --cp-surface-strong, --cp-surface-border, --cp-surface-border-2
- Glow Variables
  - --cp-glow-cyan, --cp-glow-magenta, --cp-glow-purple (box-shadow snippets)

Cyberpunk defines all variables with neon-focused values. Other themes override them to create different aesthetics.

## 4. Runtime Behavior
- Default theme is Cyberpunk if no value is stored.
- The theme is applied before custom elements render using body `onload` initialization.
- Changing the theme is instant and requires no reload; components restyle based on CSS variables.

## 5. Accessibility & Performance
- Ensure contrast ratios are adequate in both themes (primary text vs backgrounds/surfaces).
- Keep animations/glows modest for performance; cyberpunk glows implemented with lightweight box-shadows.

## 6. Extensibility
- To add a new theme:
  1. Define overrides using `html[data-theme='<name>'] { /* variables */ }` and `html[data-theme='<name>'] body { /* background */ }`. For the "Noir" theme, this will involve using reddish colors for accents and glows.
  2. Add the option to the Settings menu `<select>`.
  3. Persist and apply in the same way as existing themes.

## 7. Components Affected
- Global `index.css` (variables and backgrounds)
- `chat-view.ts`, `call-transcript.ts`, `controls-panel.ts`, `tab-view.ts`, `settings-menu.ts` (new controls), `call-history-view.ts`, `toast-notification.ts`, `index.tsx` status toast

## 8. Risks
- Legacy hardcoded colors may remain in less-used components.
- Some canvases (visualizers) may not yet consume variables; can be themed later.

## 9. Circuitry Animation
The animated circuitry effect is controlled by several CSS variables that can be manipulated via a collapsible "Advanced Settings" dropdown in the settings menu. A `<details>` element will be used to create the dropdown, containing the controls.

- `--circuit-display`: Controls visibility (`block` or `none`) of both the grid and the pulsing nodes.
- `--circuit-speed`: Controls animation duration (e.g., `15s`).

These variables are updated dynamically from `settings-menu.ts` based on user input and persisted in `localStorage`.

