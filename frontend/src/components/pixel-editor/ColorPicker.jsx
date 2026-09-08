import React from 'react';

export default function ColorPicker({ selectedColor, onChangeColor }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="dim-callout text-[0.6rem] font-bold text-ink-light tracking-widest uppercase">
        HEX Val
      </div>
      <div className="flex items-center gap-2 border-[1.5px] border-ink bg-parchment p-1">
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => onChangeColor(e.target.value)}
          className="w-12 h-8 p-0 border-[1px] border-ink bg-transparent cursor-crosshair outline-none"
        />
        <input
          type="text"
          value={selectedColor.toUpperCase()}
          onChange={(e) => onChangeColor(e.target.value)}
          className="bg-transparent border-none outline-none font-mono font-bold text-xs text-ink w-full uppercase tracking-wider"
        />
      </div>
    </div>
  );
}
