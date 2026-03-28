/* ================================================================== */
/*  Flood-Fill Field Detection                                         */
/*                                                                     */
/*  Detects field boundaries from satellite imagery by flood-filling   */
/*  from a click point while pixel colors remain similar. Extracts     */
/*  the contour, simplifies it, and converts to lat/lng coordinates.   */
/*                                                                     */
/*  Algorithm:                                                         */
/*    1. Read pixel color at click point from Mapbox canvas            */
/*    2. BFS flood fill — expand while color distance < threshold     */
/*    3. Extract boundary pixels (edge of filled region)              */
/*    4. Order boundary into a contour path                           */
/*    5. Douglas-Peucker simplification to reduce vertices            */
/*    6. Convert pixel coords → lat/lng via map.unproject()           */
/* ================================================================== */

type Point = { x: number; y: number };

/** Euclidean color distance in RGB space */
function colorDist(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * BFS flood fill from a starting pixel. Expands to neighbors
 * while the color stays within `tolerance` of the start color.
 * Returns a Set of pixel indices and the bounding box.
 */
function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance: number,
  maxPixels: number = 80000,
): { filled: Set<number>; minX: number; minY: number; maxX: number; maxY: number } {
  const idx = (startY * width + startX) * 4;
  const sr = data[idx], sg = data[idx + 1], sb = data[idx + 2];

  const filled = new Set<number>();
  const queue: number[] = [startY * width + startX];
  filled.add(queue[0]);

  let minX = startX, maxX = startX, minY = startY, maxY = startY;

  while (queue.length > 0 && filled.size < maxPixels) {
    const pi = queue.shift()!;
    const px = pi % width;
    const py = Math.floor(pi / width);

    // 4-connected neighbors
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = px + dx;
      const ny = py + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const ni = ny * width + nx;
      if (filled.has(ni)) continue;

      const ci = ni * 4;
      const dist = colorDist(sr, sg, sb, data[ci], data[ci + 1], data[ci + 2]);
      if (dist < tolerance) {
        filled.add(ni);
        queue.push(ni);
        if (nx < minX) minX = nx;
        if (nx > maxX) maxX = nx;
        if (ny < minY) minY = ny;
        if (ny > maxY) maxY = ny;
      }
    }
  }

  return { filled, minX, minY, maxX, maxY };
}

/**
 * Extract boundary pixels — pixels in the filled set that have
 * at least one unfilled 4-connected neighbor.
 */
function extractBoundary(
  filled: Set<number>,
  width: number,
  height: number,
): Point[] {
  const boundary: Point[] = [];

  for (const pi of filled) {
    const px = pi % width;
    const py = Math.floor(pi / width);

    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = (py + dy) * width + (px + dx);
      if (!filled.has(ni)) {
        boundary.push({ x: px, y: py });
        break;
      }
    }
  }

  return boundary;
}

/**
 * Order boundary points into a contour by following neighbors.
 * Uses a greedy nearest-neighbor walk.
 */
function orderContour(points: Point[]): Point[] {
  if (points.length < 3) return points;

  const remaining = new Set(points.map((_, i) => i));
  const ordered: Point[] = [];

  // Start from the topmost-leftmost point
  let currentIdx = 0;
  let minVal = Infinity;
  for (let i = 0; i < points.length; i++) {
    const v = points[i].y * 100000 + points[i].x;
    if (v < minVal) { minVal = v; currentIdx = i; }
  }

  remaining.delete(currentIdx);
  ordered.push(points[currentIdx]);

  while (remaining.size > 0) {
    let bestIdx = -1;
    let bestDist = Infinity;
    const cur = ordered[ordered.length - 1];

    for (const idx of remaining) {
      const p = points[idx];
      const d = (p.x - cur.x) ** 2 + (p.y - cur.y) ** 2;
      if (d < bestDist) { bestDist = d; bestIdx = idx; }
    }

    if (bestIdx === -1 || bestDist > 100) break; // Too far = disconnected
    remaining.delete(bestIdx);
    ordered.push(points[bestIdx]);
  }

  return ordered;
}

/**
 * Douglas-Peucker line simplification.
 * Reduces a polyline to fewer points within `epsilon` tolerance.
 */
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance from the line (first→last)
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = pointToLineDist(points[i], first, last);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }

  if (maxDist > epsilon) {
    const left = simplify(points.slice(0, maxIdx + 1), epsilon);
    const right = simplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function pointToLineDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

/**
 * Main entry point: detect field polygon from satellite canvas.
 *
 * @param canvas - The Mapbox GL canvas element
 * @param clickX - Click x in canvas pixels
 * @param clickY - Click y in canvas pixels
 * @param unproject - Function to convert [x,y] → [lng,lat]
 * @param tolerance - Color similarity threshold (0-255 scale, default 35)
 * @returns Array of [lng, lat] coordinates, or null if region too small
 */
/**
 * Read pixels from a WebGL canvas (Mapbox uses WebGL, not 2D context).
 */
function readWebGLPixels(canvas: HTMLCanvasElement): Uint8ClampedArray | null {
  const gl = canvas.getContext("webgl") || canvas.getContext("webgl2");
  if (!gl) return null;
  const { width, height } = canvas;
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  // WebGL reads bottom-up, flip vertically
  const flipped = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 4;
    const dstRow = y * width * 4;
    flipped.set(pixels.subarray(srcRow, srcRow + width * 4), dstRow);
  }
  return flipped;
}

export function detectFieldPolygon(
  canvas: HTMLCanvasElement,
  clickX: number,
  clickY: number,
  unproject: (point: [number, number]) => { lng: number; lat: number },
  tolerance: number = 35,
): [number, number][] | null {
  const { width, height } = canvas;

  // Read from WebGL context (Mapbox)
  const pixelData = readWebGLPixels(canvas);
  if (!pixelData) return null;

  const imageData = { data: pixelData };

  // Clamp click to canvas bounds
  const sx = Math.max(0, Math.min(width - 1, Math.round(clickX)));
  const sy = Math.max(0, Math.min(height - 1, Math.round(clickY)));

  // 1. Flood fill
  const { filled, minX, minY, maxX, maxY } = floodFill(
    imageData.data, width, height, sx, sy, tolerance,
  );

  // Too small = probably clicked on a road or single pixel
  if (filled.size < 200) return null;

  // 2. Extract boundary
  const boundary = extractBoundary(filled, width, height);
  if (boundary.length < 10) return null;

  // 3. Order into contour
  const contour = orderContour(boundary);

  // 4. Simplify (epsilon ~3px for clean output)
  const simplified = simplify(contour, 3);
  if (simplified.length < 3) return null;

  // 5. Sample evenly if too many points (max 50 for performance)
  let finalPoints = simplified;
  if (finalPoints.length > 50) {
    const step = finalPoints.length / 50;
    finalPoints = Array.from({ length: 50 }, (_, i) =>
      finalPoints[Math.floor(i * step)],
    );
  }

  // 6. Convert to lat/lng
  const coords: [number, number][] = finalPoints.map((p) => {
    const { lng, lat } = unproject([p.x, p.y]);
    return [lng, lat];
  });

  return coords;
}
