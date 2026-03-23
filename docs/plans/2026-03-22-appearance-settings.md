# Appearance Settings System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user-customizable appearance settings with 4 color controls and 2 preset themes (Catppuccin Latte/Mocha).

**Architecture:** CSS variables (`--theme-bg-1`, `--theme-bg-2`, `--theme-text`, `--theme-accent`) managed by React context. Tailwind classes reference variables via bracket notation. Settings modal with react-color pickers. Persistence via localStorage.

**Tech Stack:** React Context, react-color (SketchPicker), Tailwind CSS, localStorage

---

### Task 1: Install react-color dependency

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install the package**

Run: `cd frontend && npm install react-color`
Expected: Package added to dependencies

**Step 2: Verify installation**

Run: `cd frontend && npm ls react-color`
Expected: Shows installed version

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add react-color dependency for color picker"
```

---

### Task 2: Create theme presets

**Files:**
- Create: `frontend/src/themes/presets.js`

**Step 1: Create presets file**

```javascript
export const CATPPUCCIN_LATTE = {
  name: 'Catppuccin Latte',
  bg1: '#eff1f5',
  bg2: '#ffffff',
  text: '#4c4f69',
  accent: '#8839ef',
};

export const CATPPUCCIN_MOCHA = {
  name: 'Catppuccin Mocha',
  bg1: '#1e1e2e',
  bg2: '#313244',
  text: '#cdd6f4',
  accent: '#cba6f7',
};

export const DEFAULT_THEME = CATPPUCCIN_LATTE;

export const PRESETS = [CATPPUCCIN_LATTE, CATPPUCCIN_MOCHA];
```

**Step 2: Commit**

```bash
git add frontend/src/themes/presets.js
git commit -m "feat: add Catppuccin theme presets"
```

---

### Task 3: Create ThemeContext

**Files:**
- Create: `frontend/src/contexts/ThemeContext.jsx`

**Step 1: Create ThemeContext with localStorage persistence**

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_THEME, CATPPUCCIN_LATTE } from '../themes/presets';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'vector-search-theme';

function applyThemeToDom(theme) {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg-1', theme.bg1);
  root.style.setProperty('--theme-bg-2', theme.bg2);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-accent', theme.accent);
}

function loadThemeFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.bg1 && parsed.bg2 && parsed.text && parsed.accent) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load theme from storage:', e);
  }
  return DEFAULT_THEME;
}

function saveThemeToStorage(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch (e) {
    console.warn('Failed to save theme to storage:', e);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(loadThemeFromStorage);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    saveThemeToStorage(newTheme);
    applyThemeToDom(newTheme);
  };

  useEffect(() => {
    applyThemeToDom(theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

**Step 2: Commit**

```bash
git add frontend/src/contexts/ThemeContext.jsx
git commit -m "feat: add ThemeContext with localStorage persistence"
```

---

### Task 4: Add CSS variable defaults to index.css

**Files:**
- Modify: `frontend/src/index.css`

**Step 1: Add CSS variables**

Add after the `@tailwind` directives:

```css
:root {
  --theme-bg-1: #eff1f5;
  --theme-bg-2: #ffffff;
  --theme-text: #4c4f69;
  --theme-accent: #8839ef;
}
```

**Step 2: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat: add theme CSS variable defaults"
```

---

### Task 5: Add inline theme script to index.html

**Files:**
- Modify: `frontend/index.html`

**Step 1: Add script before closing head tag**

Add this script in `<head>` after other scripts:

```html
<script>
  (function() {
    try {
      var stored = localStorage.getItem('vector-search-theme');
      if (stored) {
        var theme = JSON.parse(stored);
        if (theme.bg1 && theme.bg2 && theme.text && theme.accent) {
          var root = document.documentElement;
          root.style.setProperty('--theme-bg-1', theme.bg1);
          root.style.setProperty('--theme-bg-2', theme.bg2);
          root.style.setProperty('--theme-text', theme.text);
          root.style.setProperty('--theme-accent', theme.accent);
        }
      }
    } catch (e) {}
  })();
</script>
```

**Step 2: Commit**

```bash
git add frontend/index.html
git commit -m "feat: add inline theme script to prevent flash"
```

---

### Task 6: Wrap App with ThemeProvider

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Import and wrap with ThemeProvider**

Add import:
```javascript
import { ThemeProvider } from './contexts/ThemeContext';
```

Modify `AppWithProvider`:
```javascript
export default function AppWithProvider() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: wrap app with ThemeProvider"
```

---

### Task 7: Create ColorPicker component

**Files:**
- Create: `frontend/src/components/settings/ColorPicker.jsx`

**Step 1: Create ColorPicker component**

```javascript
import { useState } from 'react';
import { SketchPicker } from 'react-color';

export default function ColorPicker({ label, color, onChange }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-text)' }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full h-10 rounded-md border border-gray-300 cursor-pointer"
        style={{ backgroundColor: color }}
        aria-label={`Pick ${label}`}
      />
      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute z-50 mt-2">
            <SketchPicker
              color={color}
              onChange={(c) => onChange(c.hex)}
              disableAlpha
            />
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/settings/ColorPicker.jsx
git commit -m "feat: add ColorPicker component with SketchPicker"
```

---

### Task 8: Create SettingsModal component

**Files:**
- Create: `frontend/src/components/settings/SettingsModal.jsx`
- Create: `frontend/src/components/settings/index.js`

**Step 1: Create SettingsModal**

```javascript
import { useTheme } from '../../contexts/ThemeContext';
import { PRESETS } from '../../themes/presets';
import ColorPicker from './ColorPicker';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function SettingsModal({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const handlePresetClick = (preset) => {
    setTheme(preset);
  };

  const handleColorChange = (key, value) => {
    setTheme({ ...theme, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg mx-4 rounded-lg shadow-xl p-6"
        style={{ backgroundColor: 'var(--theme-bg-2)' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--theme-text)' }}
          >
            Appearance Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-black/10"
            style={{ color: 'var(--theme-text)' }}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <h3
            className="text-sm font-medium mb-3"
            style={{ color: 'var(--theme-text)' }}
          >
            Preset Themes
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetClick(preset)}
                className="p-3 rounded-lg border-2 transition-all hover:scale-[1.02]"
                style={{
                  backgroundColor: preset.bg1,
                  borderColor: theme.bg1 === preset.bg1 && theme.bg2 === preset.bg2
                    ? 'var(--theme-accent)'
                    : 'transparent',
                }}
              >
                <div className="flex gap-1 mb-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: preset.bg2 }}
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: preset.accent }}
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: preset.text }}
                  />
                </div>
                <span
                  className="text-sm font-medium"
                  style={{ color: preset.text }}
                >
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3
            className="text-sm font-medium mb-3"
            style={{ color: 'var(--theme-text)' }}
          >
            Custom Colors
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <ColorPicker
              label="Background 1"
              color={theme.bg1}
              onChange={(c) => handleColorChange('bg1', c)}
            />
            <ColorPicker
              label="Background 2"
              color={theme.bg2}
              onChange={(c) => handleColorChange('bg2', c)}
            />
            <ColorPicker
              label="Text Color"
              color={theme.text}
              onChange={(c) => handleColorChange('text', c)}
            />
            <ColorPicker
              label="Theme Color"
              color={theme.accent}
              onChange={(c) => handleColorChange('accent', c)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create index.js**

```javascript
export { default as SettingsModal } from './SettingsModal';
```

**Step 3: Commit**

```bash
git add frontend/src/components/settings/
git commit -m "feat: add SettingsModal with presets and color pickers"
```

---

### Task 9: Add settings button to Sidebar

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.jsx`

**Step 1: Read current Sidebar content**

First, read the file to understand its structure.

**Step 2: Add settings button and modal state**

Add imports:
```javascript
import { useState } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { SettingsModal } from '../settings';
```

Add state and button at bottom of sidebar (before closing div):
```javascript
const [settingsOpen, setSettingsOpen] = useState(false);

// At bottom of sidebar, before closing </div>:
<button
  onClick={() => setSettingsOpen(true)}
  className="p-2 rounded-lg hover:bg-black/5 transition-colors"
  style={{ color: 'var(--theme-text)' }}
  aria-label="Open settings"
>
  <Cog6ToothIcon className="w-5 h-5" />
</button>
<SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

**Step 3: Commit**

```bash
git add frontend/src/components/layout/Sidebar.jsx
git commit -m "feat: add settings button to Sidebar"
```

---

### Task 10: Update Layout.jsx to use theme variables

**Files:**
- Modify: `frontend/src/components/layout/Layout.jsx`

**Step 1: Replace hardcoded colors with CSS variables**

Change:
```javascript
<div className="flex h-screen bg-gray-50">
```
To:
```javascript
<div className="flex h-screen" style={{ backgroundColor: 'var(--theme-bg-1)' }}>
```

**Step 2: Commit**

```bash
git add frontend/src/components/layout/Layout.jsx
git commit -m "feat: use theme CSS variables in Layout"
```

---

### Task 11: Update Sidebar.jsx to use theme variables

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.jsx`

**Step 1: Replace hardcoded colors**

Replace `bg-white` with `style={{ backgroundColor: 'var(--theme-bg-2)' }}`
Replace `text-gray-*` with `style={{ color: 'var(--theme-text)' }}`
Replace `text-blue-600` with `style={{ color: 'var(--theme-accent)' }}`

Apply to all text and background elements in the Sidebar.

**Step 2: Commit**

```bash
git add frontend/src/components/layout/Sidebar.jsx
git commit -m "feat: use theme CSS variables in Sidebar"
```

---

### Task 12: Update TopBar.jsx to use theme variables

**Files:**
- Modify: `frontend/src/components/layout/TopBar.jsx`

**Step 1: Read file and replace hardcoded colors**

Replace `bg-white`, `bg-gray-50`, `text-gray-*` with appropriate CSS variables.
Replace accent colors (`text-blue-600`, `bg-blue-600`) with `var(--theme-accent)`.

**Step 2: Commit**

```bash
git add frontend/src/components/layout/TopBar.jsx
git commit -m "feat: use theme CSS variables in TopBar"
```

---

### Task 13: Update remaining components to use theme variables

**Files:**
- Modify: `frontend/src/components/search/ResultCard.jsx`
- Modify: `frontend/src/components/search/ResultModal.jsx`
- Modify: `frontend/src/components/indexing/*.jsx`
- Modify: `frontend/src/components/common/*.jsx`

**Step 1: Update ResultCard.jsx**

Replace hardcoded colors with CSS variables.

**Step 2: Update ResultModal.jsx**

Replace hardcoded colors with CSS variables.

**Step 3: Update IndexProgress.jsx and OnboardingPrompt.jsx**

Replace hardcoded colors with CSS variables.

**Step 4: Update common components (Spinner, Skeleton, Badge)**

Replace hardcoded colors with CSS variables.

**Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: apply theme CSS variables to all components"
```

---

### Task 14: Update Login.jsx to use theme variables

**Files:**
- Modify: `frontend/src/components/Login.jsx`

**Step 1: Replace hardcoded colors**

Replace `bg-gray-50`, `text-gray-*`, `bg-blue-600` with CSS variables.

**Step 2: Commit**

```bash
git add frontend/src/components/Login.jsx
git commit -m "feat: use theme CSS variables in Login"
```

---

### Task 15: Run lint and verify

**Files:**
- None (verification only)

**Step 1: Run linter**

Run: `cd frontend && npm run lint`
Expected: No errors

**Step 2: Manual testing**

Run: `cd frontend && npm run dev`
Expected: 
- App loads with default Catppuccin Latte theme
- Settings modal opens from Sidebar gear icon
- Clicking Catppuccin Mocha changes all colors
- Custom color pickers work
- Theme persists on page reload
- No flash of wrong theme on load

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: resolve lint errors in appearance settings"
```

---

## Summary

15 tasks implementing:
1. react-color dependency
2. Theme presets (Catppuccin Latte/Mocha)
3. ThemeContext with localStorage
4. CSS variable defaults
5. Inline theme script (prevent flash)
6. ThemeProvider wrapper
7. ColorPicker component
8. SettingsModal component
9. Sidebar settings button
10-14. Apply theme variables to all components
15. Lint and verify
