// handles drawing the logical pixel matrix and grid overlay
// onto the actual HTML5 canvas element

export function renderPixelCanvas(
  canvas,
  matrix,
  matrixWidth,
  matrixHeight,
  options = {}
) {
  if (!canvas || !matrix) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { showGrid = true, gridColor = 'rgba(44, 24, 16, 0.15)' } = options;
  const displayWidth = canvas.width;
  const displayHeight = canvas.height;

  ctx.imageSmoothingEnabled = false;

  const cellWidth = displayWidth / matrixWidth;
  const cellHeight = displayHeight / matrixHeight;

  // 1. Clear the canvas (letting the background show through)
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  // 2. Render logical pixels
  for (let y = 0; y < matrixHeight; y++) {
    const row = matrix[y];
    if (!row) continue;
    for (let x = 0; x < matrixWidth; x++) {
      const color = row[x];
      if (color !== null && color !== undefined) {
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.floor(x * cellWidth),
          Math.floor(y * cellHeight),
          Math.ceil(cellWidth),
          Math.ceil(cellHeight)
        );
      }
    }
  }

  // 3. Grid overlay outlining square blocks
  if (showGrid && cellWidth >= 4 && cellHeight >= 4) {
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Vertical grid lines
    for (let x = 0; x <= matrixWidth; x++) {
      const posX = Math.round(x * cellWidth) - 0.5;
      ctx.moveTo(posX, 0);
      ctx.lineTo(posX, displayHeight);
    }

    // Horizontal grid lines
    for (let y = 0; y <= matrixHeight; y++) {
      const posY = Math.round(y * cellHeight) - 0.5;
      ctx.moveTo(0, posY);
      ctx.lineTo(displayWidth, posY);
    }

    ctx.stroke();
  }
}
