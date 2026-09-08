import React from 'react';

export default function Toolbar({ currentTool, onSelectTool }) {
  const tools = [
    { id: 'pencil', label: 'Pencil', desc: 'DRAW' },
    { id: 'eraser', label: 'Eraser', desc: 'CLEAR' }
  ];

  return (
    <div className="border-[1.5px] border-ink bg-[rgba(245,234,214,0.5)] backdrop-blur-sm h-full flex flex-col">
      <div className="px-3 py-2 text-[0.75rem] font-black uppercase tracking-[0.2em] text-ink border-b-2 border-ink bg-ink/5">
        Tool Spec
      </div>
      <div className="flex flex-col">
        {tools.map((tool, index) => {
          const isSelected = currentTool === tool.id;
          const bgClass = index % 2 === 0 ? 'bg-[rgba(44,24,16,0.02)]' : 'bg-transparent';
          const activeClass = isSelected ? 'bg-[rgba(212,168,83,0.2)] border-l-[3px] border-l-ink' : 'border-l-[3px] border-l-transparent';
          
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              className={`text-left px-3 py-3 border-b border-grid-line-major flex items-center justify-between transition-colors hover:bg-[rgba(212,168,83,0.1)] ${bgClass} ${activeClass}`}
            >
              <div className="flex flex-col gap-1">
                <span className="font-bold text-[0.8rem] text-ink uppercase tracking-wider">{tool.label}</span>
                <span className="italic text-[0.65rem] text-ink-light">{tool.desc}</span>
              </div>
              {isSelected && (
                <span className="text-[0.55rem] uppercase border border-ink-light px-1.5 py-0.5 text-ink-light rounded-sm tracking-widest font-bold bg-parchment">
                  ACTIVE
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
