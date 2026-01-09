/**
 * Coordinate transformation utilities for canvas zoom and pan
 */

/**
 * Convert screen coordinates to canvas coordinates
 * @param {number} screenX - X coordinate on screen
 * @param {number} screenY - Y coordinate on screen
 * @param {number} scale - Current zoom scale
 * @param {number} offsetX - Canvas pan offset X
 * @param {number} offsetY - Canvas pan offset Y
 * @returns {{x: number, y: number}} Canvas coordinates
 */
export function screenToCanvas(screenX, screenY, scale, offsetX, offsetY) {
  return {
    x: (screenX - offsetX) / scale,
    y: (screenY - offsetY) / scale,
  };
}

/**
 * Convert canvas coordinates to screen coordinates
 * @param {number} canvasX - X coordinate on canvas
 * @param {number} canvasY - Y coordinate on canvas
 * @param {number} scale - Current zoom scale
 * @param {number} offsetX - Canvas pan offset X
 * @param {number} offsetY - Canvas pan offset Y
 * @returns {{x: number, y: number}} Screen coordinates
 */
export function canvasToScreen(canvasX, canvasY, scale, offsetX, offsetY) {
  return {
    x: canvasX * scale + offsetX,
    y: canvasY * scale + offsetY,
  };
}

/**
 * Check if a point is inside a rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} rx - Rectangle X
 * @param {number} ry - Rectangle Y
 * @param {number} rw - Rectangle width
 * @param {number} rh - Rectangle height
 * @returns {boolean} True if point is inside rectangle
 */
export function isPointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Calculate distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance
 */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
