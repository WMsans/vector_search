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
