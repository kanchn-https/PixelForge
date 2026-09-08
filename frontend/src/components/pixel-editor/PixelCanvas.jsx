import React, { useRef, useEffect, useState, useCallback } from 'react';
import { renderPixelCanvas } from '../../utils/canvasRenderer.js';
import { getCanvasRelativeCoords, canvasToMatrixCoords } from '../../utils/coordinateUtils.js';

export default function PixelCanvas({
  width,
  height,
  matrix,
  onPixelClick,
  onHoverCoords
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [displayDimensions, setDisplayDimensions] = useState({ width: 512, height: 512 });

  // calculate canvas display size to maximize available viewport space while maintaining aspect ratio
  const updateDisplaySize = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // keep a clean margin around the canvas
    const padding = 32;
    const availWidth = Math.max(containerWidth - padding, 64);
    const availHeight = Math.max(containerHeight - padding, 64);

    const aspect = width / height;

    let targetWidth;
    let targetHeight;

    // scale to fit the tightest dimension
    if (availWidth / availHeight > aspect) {
      targetHeight = availHeight;
      targetWidth = Math.floor(targetHeight * aspect);
    } else {
      targetWidth = availWidth;
      targetHeight = Math.floor(targetWidth / aspect);
    }

    setDisplayDimensions({ width: targetWidth, height: targetHeight });
  }, [width, height]);

  // handle window resizing
  useEffect(() => {
    updateDisplaySize();
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [updateDisplaySize]);

  // redraw canvas whenever matrix or dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrix) return;
    renderPixelCanvas(canvas, matrix, width, height, { showGrid: true });
  }, [matrix, width, height, displayDimensions]);

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const relCoords = getCanvasRelativeCoords(e, canvas);
    if (!relCoords) return;

    const matrixCoords = canvasToMatrixCoords(
      relCoords.x,
      relCoords.y,
      displayDimensions.width,
      displayDimensions.height,
      width,
      height
    );

    if (matrixCoords) {
      onPixelClick(matrixCoords.x, matrixCoords.y);
    }
  };

  const handlePointerMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const relCoords = getCanvasRelativeCoords(e, canvas);
    if (!relCoords) {
      onHoverCoords(null, null);
      return;
    }

    const matrixCoords = canvasToMatrixCoords(
      relCoords.x,
      relCoords.y,
      displayDimensions.width,
      displayDimensions.height,
      width,
      height
    );

    if (matrixCoords) {
      onHoverCoords(matrixCoords.x, matrixCoords.y);
    } else {
      onHoverCoords(null, null);
    }
  };

  const handlePointerLeave = () => {
    onHoverCoords(null, null);
  };

  return (
    <main
      ref={containerRef}
      className="flex-1 w-full h-full flex items-center justify-center relative overflow-hidden select-none p-4"
    >
      <div className="border-[2px] border-ink bg-[rgba(245,234,214,0.3)] backdrop-blur-sm shadow-[4px_4px_0px_rgba(44,24,16,0.1)] flex items-center justify-center relative group">
        <canvas
          ref={canvasRef}
          width={displayDimensions.width}
          height={displayDimensions.height}
          style={{
            width: `${displayDimensions.width}px`,
            height: `${displayDimensions.height}px`,
            imageRendering: 'pixelated',
            display: 'block',
            cursor: 'crosshair'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        />
        
        {/* Crosshair accents at corners */}
        <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-coral opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-coral opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-coral opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-coral opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </main>
  );
}
