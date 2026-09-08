import React, { useEffect, useState } from 'react';

// cute little compass rose that reacts to mouse movement
const CompassRose = () => {
  const [rotation, setRotation] = useState(0);

  // bind compass needle to mouse X position for a playful effect
  useEffect(() => {
    let timeout;
    const handleMouseMove = (e) => {
      // tilt up to 45 deg based on distance from center
      const centerX = window.innerWidth / 2;
      const deg = ((e.clientX - centerX) / centerX) * 45;
      setRotation(deg);

      // snap back to 0 if they stop moving
      clearTimeout(timeout);
      timeout = setTimeout(() => setRotation(0), 150);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="absolute bottom-10 right-10 w-[70px] h-[70px] pointer-events-none z-50 flex items-center justify-center opacity-80 mix-blend-multiply">
      <svg width="70" height="70" viewBox="0 0 100 100" className="overflow-visible">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--ink)" strokeWidth="1" strokeDasharray="2 4" />
        <circle cx="50" cy="50" r="30" fill="none" stroke="var(--ink)" strokeWidth="2" />
        
        {/* Cardinal Directions */}
        <text x="50" y="12" textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="bold" fontFamily="monospace">N</text>
        <text x="50" y="98" textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="bold" fontFamily="monospace">S</text>
        <text x="92" y="54" textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="bold" fontFamily="monospace">E</text>
        <text x="8" y="54" textAnchor="middle" fill="var(--ink)" fontSize="12" fontWeight="bold" fontFamily="monospace">W</text>

        {/* Dynamic Needle */}
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50px 50px', transition: 'transform 0.1s ease-out' }}>
          <polygon points="50,15 55,50 45,50" fill="var(--coral)" />
          <polygon points="50,85 55,50 45,50" fill="var(--ink)" />
          <circle cx="50" cy="50" r="4" fill="var(--parchment)" stroke="var(--ink)" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};

export default function StatusBar({
  width = 128,
  height = 64,
  zoom = 100,
  cursorX = null,
  cursorY = null,
  currentTool = 'pencil'
}) {
  return (
    <>
      <footer className="h-8 border-t-[2px] border-ink bg-parchment-dark/60 flex items-center justify-between text-[0.65rem] font-bold text-ink uppercase tracking-widest px-4 select-none backdrop-blur-sm z-20">
        <div className="flex items-center gap-6 h-full">
          <div className="h-full flex items-center border-r-[1.5px] border-grid-line-major pr-6">
            <span className="text-ink-light mr-2">Dim:</span> {width} × {height}
          </div>
          <div className="h-full flex items-center border-r-[1.5px] border-grid-line-major pr-6">
            <span className="text-ink-light mr-2">Zoom:</span> {zoom}%
          </div>
          <div className="h-full flex items-center border-r-[1.5px] border-grid-line-major pr-6">
            <span className="text-ink-light mr-2">X:</span> {cursorX !== null ? String(cursorX).padStart(3, '0') : '---'}
          </div>
          <div className="h-full flex items-center">
            <span className="text-ink-light mr-2">Y:</span> {cursorY !== null ? String(cursorY).padStart(3, '0') : '---'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-light">Tool:</span> 
          <span className="bg-ink text-parchment px-2 py-0.5">{currentTool}</span>
        </div>
      </footer>
      <CompassRose />
    </>
  );
}
