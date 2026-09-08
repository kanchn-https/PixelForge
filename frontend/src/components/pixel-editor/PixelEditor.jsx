import React, { useState } from 'react';
import Toolbar from './Toolbar.jsx';
import PixelCanvas from './PixelCanvas.jsx';
import FrameLayout from './FrameLayout.jsx';
import ColorPalette from './ColorPalette.jsx';
import StatusBar from './StatusBar.jsx';
import { createMatrix, setPixel } from '../../utils/pixelMatrix.js';

const PRESET_SIZES = [
  { label: '16 × 16', w: 16, h: 16 },
  { label: '32 × 32', w: 32, h: 32 },
  { label: '64 × 64', w: 64, h: 64 }
];

export default function PixelEditor() {
  const [width, setWidth] = useState(32);
  const [height, setHeight] = useState(32);
  const [currentTool, setCurrentTool] = useState('pencil');
  const [selectedColor, setSelectedColor] = useState('#2c1810'); // Default to ink
  const [frames, setFrames] = useState([1]);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [cursorPos, setCursorPos] = useState({ x: null, y: null });

  // Main matrix state
  const [matrix, setMatrix] = useState(() => createMatrix(32, 32));

  // Reset matrix when dimensions change
  const handleDimensionChange = (newWidth, newHeight) => {
    setWidth(newWidth);
    setHeight(newHeight);
    setMatrix(createMatrix(newWidth, newHeight));
  };

  const handlePixelClick = (x, y) => {
    const targetColor = currentTool === 'pencil' ? selectedColor : null;
    setMatrix((prevMatrix) => setPixel(prevMatrix, x, y, targetColor));
  };

  const handleHoverCoords = (x, y) => {
    setCursorPos({ x, y });
  };

  const handleAddFrame = () => {
    setFrames((prev) => [...prev, prev.length + 1]);
    setCurrentFrame(frames.length);
  };

  return (
    <div className="relative z-10 flex flex-col h-screen w-screen overflow-hidden text-ink">
      
      {/* Title Block Wrapper (Double Border) */}
      <div className="m-4 border-2 border-ink p-[1px]">
        <div className="border border-ink-light bg-parchment/80 backdrop-blur-sm relative">
          
          {/* Approval Stamp */}
          <div className="absolute top-2 right-48 transform rotate-12 border-[3px] border-coral text-coral font-black text-xl px-2 py-1 uppercase tracking-widest opacity-80 z-20 shadow-sm mix-blend-multiply">
            APPROVED ✓
          </div>

          <header className="flex border-b-2 border-ink">
            {/* Left Region: Title */}
            <div className="flex-1 p-4 border-r-2 border-ink flex flex-col justify-center">
              <h1 className="font-black text-3xl uppercase tracking-widest text-ink leading-none">
                PixelForge
              </h1>
              <div className="text-[0.65rem] uppercase tracking-[0.3em] text-ink-light mt-1">
                Architectural Matrix Editor
              </div>
            </div>

            {/* Right Meta-box */}
            <div className="w-64 flex flex-col text-[0.7rem] uppercase tracking-[0.15em] font-bold">
              <div className="flex-1 border-b border-grid-line-major px-3 py-1 flex justify-between items-center bg-ink/5">
                <span className="text-ink-light">Drawing No.</span>
                <span>PF-001</span>
              </div>
              <div className="flex-1 border-b border-grid-line-major px-3 py-1 flex justify-between items-center">
                <span className="text-ink-light">Scale</span>
                <span>
                  <select
                    value={`${width}x${height}`}
                    onChange={(e) => {
                      const [w, h] = e.target.value.split('x').map(Number);
                      handleDimensionChange(w, h);
                    }}
                    className="bg-transparent text-ink border-b border-ink-light outline-none cursor-pointer text-right ml-2"
                  >
                    {PRESET_SIZES.map((preset) => (
                      <option key={`${preset.w}x${preset.h}`} value={`${preset.w}x${preset.h}`}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
              <div className="flex-1 border-b border-grid-line-major px-3 py-1 flex justify-between items-center bg-ink/5">
                <span className="text-ink-light">Sheet</span>
                <span>{currentFrame + 1} OF {frames.length}</span>
              </div>
              <div className="flex-1 px-3 py-1 flex justify-between items-center">
                <span className="text-ink-light">Rev.</span>
                <span>A</span>
              </div>
            </div>
          </header>

          {/* Footer Strip */}
          <div className="flex text-[0.6rem] uppercase tracking-[0.2em] font-bold text-ink-light bg-parchment-dark/30">
            <div className="flex-1 px-3 py-1 border-r-2 border-ink flex justify-between">
              <span>Material</span>
              <span className="text-ink">Digital</span>
            </div>
            <div className="flex-1 px-3 py-1 border-r-2 border-ink flex justify-between">
              <span>Tolerance</span>
              <span className="text-ink">± 0.0px</span>
            </div>
            <div className="flex-1 px-3 py-1 flex justify-between">
              <span>Finish</span>
              <span className="text-ink">Pixel-Perfect</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex min-h-0 px-4 pb-4 gap-4">
        {/* Left: Tools */}
        <div className="w-48">
          <Toolbar
            currentTool={currentTool}
            onSelectTool={setCurrentTool}
          />
        </div>

        {/* Center: Canvas Area */}
        <div className="flex-1 border-2 border-ink bg-parchment-dark/20 relative">
          <PixelCanvas
            width={width}
            height={height}
            matrix={matrix}
            onPixelClick={handlePixelClick}
            onHoverCoords={handleHoverCoords}
          />
        </div>

        {/* Right: Frame Layout & Colors */}
        <div className="w-72 flex flex-col gap-4">
          <FrameLayout
            frames={frames}
            currentFrame={currentFrame}
            onSelectFrame={setCurrentFrame}
            onAddFrame={handleAddFrame}
          />
          <ColorPalette
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
          />
        </div>
      </div>

      {/* Bottom: Status Bar */}
      <StatusBar
        width={width}
        height={height}
        zoom={zoom}
        cursorX={cursorPos.x}
        cursorY={cursorPos.y}
        currentTool={currentTool}
      />
    </div>
  );
}
