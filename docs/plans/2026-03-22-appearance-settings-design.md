# Appearance Settings System Design

## Overview

Allow users to customize the app's visual appearance through a settings modal. Users can choose from preset themes (Catppuccin Latte/Mocha) or define custom colors for background, text, and accent elements.

## Requirements

- 4 customizable colors: Background 1, Background 2, Text Color, Theme/Accent Color
- 2 preset themes: Catppuccin Latte (light), Catppuccin Mocha (dark)
- Settings persist in localStorage (browser-only, not per-user)
- Settings accessible via dedicated modal from Sidebar
- Advanced color picker with saturation/brightness controls

## Architecture

### Approach: CSS Variables + React Context

Store colors as CSS custom properties updated via React context. Tailwind classes reference these via bracket notation (`bg-[var(--theme-bg-1)]`).

**Benefits:**
- Clean separation of theme logic and UI
- Works seamlessly with existing Tailwind setup
- No build configuration changes required
- Live preview without page reload

### CSS Variables

```
--theme-bg-1      → Main background (page-level)
--theme-bg-2      → Surface/card background (elevated elements)
--theme-text      → Primary text color
--theme-accent    → Accent/brand color (buttons, links, icons, headers)
```

### Data Flow

```
localStorage → ThemeContext (initial load)
User picks color → ThemeContext.setTheme() → localStorage + CSS vars
CSS vars → Tailwind classes via bg-[var(--theme-bg-1)]
```

## Components

### ThemeContext (`src/contexts/ThemeContext.jsx`)

- `ThemeProvider` wraps app inside existing providers
- Exports `useTheme()` hook returning `{ theme, setTheme, presets }`
- On mount: loads from localStorage, falls back to Catppuccin Latte
- Applies CSS variables to `document.documentElement` on theme change

### Preset Themes (`src/themes/presets.js`)

Two theme objects with Catppuccin palette colors:

**Catppuccin Latte (Light)**
- bg1: `#eff1f5` (base)
- bg2: `#ffffff` (mantle/crust approximation)
- text: `#4c4f69` (text)
- accent: `#8839ef` (mauve)

**Catppuccin Mocha (Dark)**
- bg1: `#1e1e2e` (base)
- bg2: `#313244` (surface0)
- text: `#cdd6f4` (text)
- accent: `#cba6f7` (mauve)

### SettingsModal (`src/components/settings/SettingsModal.jsx`)

- Modal overlay with close button
- Opened via gear icon in Sidebar
- Two sections:
  1. **Preset Themes**: Two clickable cards with color swatch previews
  2. **Custom Colors**: Four color pickers with labels

### ColorPicker Integration

- Uses `react-color` library's `SketchPicker` component
- Each picker shows current color swatch, expands to full picker on click
- Changes apply immediately (live preview, no save button)

### Sidebar Update

- Add gear icon (Cog6Tooth from heroicons) at bottom of Sidebar
- Opens SettingsModal on click

## Color Usage Mapping

| Variable | Applied To |
|----------|------------|
| `--theme-bg-1` | Page background, main content area |
| `--theme-bg-2` | Cards, Sidebar, modals, elevated surfaces |
| `--theme-text` | All text, labels, descriptions |
| `--theme-accent` | Primary buttons, links, icons, focus rings, active states, section headers, progress indicators |

## Error Handling

### localStorage Failures
- Wrap read/write in try/catch
- Read failure: fall back to Catppuccin Latte
- Write failure: log warning, continue in-memory

### Invalid Data
- Validate theme object has all 4 required keys
- If malformed: reset to default preset

### Color Validation
- Accept hex, rgb/rgba, hsl formats
- Invalid input: ignore, keep previous value

### Prevent Flash of Wrong Theme
- Inline script in `index.html` reads localStorage and applies CSS vars before React loads
- Prevents white flash when dark theme is set

## Files to Create/Modify

### New Files
- `src/contexts/ThemeContext.jsx` - Theme provider and hook
- `src/themes/presets.js` - Catppuccin theme definitions
- `src/components/settings/SettingsModal.jsx` - Settings modal
- `src/components/settings/ColorPicker.jsx` - Wrapper for react-color picker
- `src/components/settings/index.js` - Exports

### Modified Files
- `src/App.jsx` - Wrap with ThemeProvider
- `src/components/layout/Sidebar.jsx` - Add settings gear icon
- `src/index.css` - Add CSS variable declarations with defaults
- `index.html` - Add inline theme script
- All components using hardcoded colors - Replace with CSS variable classes

## Dependencies

- `react-color` - Advanced color picker component

## Testing Considerations

- Theme persists across page reloads
- Switching between presets updates all UI elements
- Custom colors apply immediately
- No flash of wrong theme on load
- Modal opens/closes correctly
- Works on both light and dark system preferences
