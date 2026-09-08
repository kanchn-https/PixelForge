// converts mouse event to canvas-relative coordinates
export function getCanvasRelativeCoords(event, canvas) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  // if mouse is outside the canvas bounds, ignore
  if (x < 0 || x >= rect.width || y < 0 || y >= rect.height) {
    return null;
  }
  return { x, y };
}

// maps raw canvas pixels to logical matrix grid coordinates
export function canvasToMatrixCoords(
  canvasX,
  canvasY,
  displayWidth,
  displayHeight,
  matrixWidth,
  matrixHeight
) {
  if (displayWidth <= 0 || displayHeight <= 0 || matrixWidth <= 0 || matrixHeight <= 0) {
    return null;
  }

  // figure out how big each logical pixel is rendered
  const cellWidth = displayWidth / matrixWidth;
  const cellHeight = displayHeight / matrixHeight;

  // find which cell was clicked
  const matrixX = Math.floor(canvasX / cellWidth);
  const matrixY = Math.floor(canvasY / cellHeight);

  // extra bounds check just in case
  if (matrixX < 0 || matrixX >= matrixWidth || matrixY < 0 || matrixY >= matrixHeight) {
    return null;
  }

  return { x: matrixX, y: matrixY };
}
