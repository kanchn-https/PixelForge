// keeps track of the logical sprite canvas
// transparent pixels are just null

export function createMatrix(width, height, fill = null) {
  const matrix = [];
  for (let y = 0; y < height; y++) {
    matrix.push(new Array(width).fill(fill));
  }
  return matrix;
}

// deep copy so we don't mutate state directly
export function cloneMatrix(matrix) {
  return matrix.map(row => [...row]);
}

// returns a fresh matrix with the new pixel set
export function setPixel(matrix, x, y, color) {
  // basic bounds check
  if (y < 0 || y >= matrix.length || x < 0 || x >= matrix[0].length) {
    return matrix;
  }
  
  // bail early if nothing changed
  if (matrix[y][x] === color) {
    return matrix;
  }

  const newMatrix = cloneMatrix(matrix);
  newMatrix[y][x] = color;
  return newMatrix;
}

// resets the canvas to completely transparent
export function clearMatrix(width, height) {
  return createMatrix(width, height, null);
}
