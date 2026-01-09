/**
 * Bezier curve utilities for edges
 */

/**
 * Calculate control points for a cubic Bezier curve
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {string} startPort - "left" or "right"
 * @param {string} endPort - "left" or "right"
 * @returns {{cp1x: number, cp1y: number, cp2x: number, cp2y: number}}
 */
export function calculateBezierControlPoints(x1, y1, x2, y2, startPort, endPort) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Control point offset based on distance
  const offset = Math.min(distance * 0.5, 150);

  // First control point - extends from start port
  const cp1x = x1 + (startPort === "right" ? offset : -offset);
  const cp1y = y1;

  // Second control point - approaches end port
  const cp2x = x2 + (endPort === "right" ? -offset : offset);
  const cp2y = y2;

  return { cp1x, cp1y, cp2x, cp2y };
}

/**
 * Generate SVG path for a cubic Bezier curve
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {string} startPort - "left" or "right"
 * @param {string} endPort - "left" or "right"
 * @returns {string} SVG path string
 */
export function generateBezierPath(x1, y1, x2, y2, startPort, endPort) {
  const { cp1x, cp1y, cp2x, cp2y } = calculateBezierControlPoints(
    x1, y1, x2, y2, startPort, endPort
  );

  return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
}

/**
 * Calculate a point on a cubic Bezier curve at parameter t
 * @param {number} t - Parameter (0 to 1)
 * @param {number} p0 - Start point
 * @param {number} p1 - First control point
 * @param {number} p2 - Second control point
 * @param {number} p3 - End point
 * @returns {number} Point value
 */
export function bezierPoint(t, p0, p1, p2, p3) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return uuu * p0 + 3 * uu * t * p1 + 3 * u * tt * p2 + ttt * p3;
}
