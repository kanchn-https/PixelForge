import React from 'react';
import ColorPicker from './ColorPicker.jsx';

const DEFAULT_PALETTE = [
  '#000000', '#1D2B53', '#7E2553', '#008751', '#AB5236', '#5F574F',
  '#C2C3C7', '#FFF1E8', '#FF004D', '#FFA300', '#FFEC27', '#00E436',
  '#29ADFF', '#83769C', '#FF77A8', '#FFCCAA'
];

export default function ColorPalette({
  selectedColor,
  onSelectColor,
  palette = DEFAULT_PALETTE
}) {
  return (
    <div className="border-[1.5px] border-ink bg-[rgba(245,234,214,0.5)] backdrop-blur-sm flex-1 overflow-y-auto flex flex-col">
      <div className="px-3 py-2 text-[0.75rem] font-black uppercase tracking-[0.2em] text-ink border-b-2 border-ink bg-ink/5">
        Material Palette
      </div>

      <div className="p-3 flex-1 flex flex-col gap-4">
        {/* Section Divider */}
        <div className="section-divider">Standard</div>

        <div className="grid grid-cols-4 gap-2">
          {palette.map((color, index) => {
            const isSelected = selectedColor.toUpperCase() === color.toUpperCase();
            return (
              <button
                key={`${color}-${index}`}
                type="button"
                onClick={() => onSelectColor(color)}
                title={color}
                className={`w-full aspect-square border-[1.5px] transition-transform flex items-center justify-center ${
                  isSelected
                    ? 'border-ink scale-110 shadow-[2px_2px_0px_rgba(44,24,16,1)] z-10'
                    : 'border-ink-light/50 hover:border-ink hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>

        <div className="section-divider">Custom</div>
        <ColorPicker selectedColor={selectedColor} onChangeColor={onSelectColor} />
      </div>

      {/* Selected Color Status */}
      <div className="border-t border-grid-line-major px-3 py-2 flex items-center justify-between text-[0.6rem] uppercase tracking-widest bg-[rgba(44,24,16,0.02)]">
        <span className="text-ink-light font-bold">Active Mat:</span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-ink">{selectedColor}</span>
          <div
            className="w-4 h-4 border border-ink shadow-[1px_1px_0px_rgba(44,24,16,1)]"
            style={{ backgroundColor: selectedColor }}
            title={selectedColor}
          />
        </div>
      </div>
    </div>
  );
}
