import React from 'react';

export default function FrameLayout({ frames = [1], currentFrame = 0, onSelectFrame, onAddFrame }) {
  return (
    <div className="border-[1.5px] border-ink bg-[rgba(245,234,214,0.5)] backdrop-blur-sm">
      <div className="px-3 py-2 text-[0.75rem] font-black uppercase tracking-[0.2em] text-ink border-b-2 border-ink bg-ink/5">
        Sheet Layout
      </div>
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {frames.map((_, index) => {
            const isSelected = currentFrame === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectFrame && onSelectFrame(index)}
                className={`h-10 text-[0.8rem] font-bold border-[1.5px] transition-colors flex flex-col items-center justify-center relative ${
                  isSelected
                    ? 'border-ink bg-ink/10 text-ink shadow-[inset_0_0_0_1px_rgba(44,24,16,1)]'
                    : 'border-ink-light/50 text-ink-light hover:bg-[rgba(212,168,83,0.1)] hover:border-ink'
                }`}
              >
                <span className="tracking-widest">S-{index + 1}</span>
                {isSelected && (
                  <span className="absolute -bottom-2 bg-parchment text-[0.45rem] tracking-[0.2em] px-1 border border-ink-light">ACTV</span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onAddFrame}
            className="h-10 text-[0.8rem] font-bold border-[1.5px] border-dashed border-ink-light/70 text-ink-light hover:bg-[rgba(212,168,83,0.1)] hover:border-ink hover:text-ink flex flex-col items-center justify-center transition-colors"
            title="Add Sheet"
          >
            <span>[ + ]</span>
          </button>
        </div>
      </div>
      <div className="border-t border-grid-line-major px-3 py-1 flex items-center justify-between text-[0.6rem] uppercase tracking-widest text-ink-light bg-[rgba(44,24,16,0.02)]">
        <span>Total Sheets: {frames.length}</span>
        <span>Sec. A</span>
      </div>
    </div>
  );
}
