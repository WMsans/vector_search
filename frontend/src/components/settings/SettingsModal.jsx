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
