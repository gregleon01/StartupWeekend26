/* ================================================================== */
/*  Flood-Fill Field Detection v2                                      */
/*                                                                     */
/*  Improvements over v1:                                              */
/*    - Average seed color from 5×5 area (not single pixel)           */
/*    - Morphological close: dilate then erode to fill small gaps     */
/*    - Convex hull instead of nearest-neighbor contour ordering       */
/*    - Higher simplification epsilon for smoother polygons            */
/*    - March along boundary in angular order for clean contour        */
/* ================================================================== */

type Pt = [number, number]; // [x, y]

function colorDist(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number,
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Average RGB in a radius around a point */
function sampleAvgColor(
  data: Uint8ClampedArray, w: number, h: number,
  cx: number, cy: number, radius: number = 3,
): [number, number, number] {
  let r = 0, g = 0, b = 0, count = 0;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || x >= w || y < 0 || y >= h) continue;
      const i = (y * w + x) * 4;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
    }
  }
  return [r / count, g / count, b / count];
}

/** BFS flood fill with averaged seed color */
function floodFill(
  data: Uint8ClampedArray, w: number, h: number,
  sx: number, sy: number, tolerance: number, maxPx: number = 60000,
): Set<number> {
  const [sr, sg, sb] = sampleAvgColor(data, w, h, sx, sy, 4);
  const filled = new Set<number>();
  const queue: number[] = [sy * w + sx];
  filled.add(queue[0]);

  while (queue.length > 0 && filled.size < maxPx) {
    const pi = queue.shift()!;
    const px = pi % w, py = (pi - px) / w;

    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = px + dx, ny = py + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const ni = ny * w + nx;
      if (filled.has(ni)) continue;
      const ci = ni * 4;
      if (colorDist(sr, sg, sb, data[ci], data[ci+1], data[ci+2]) < tolerance) {
        filled.add(ni);
        queue.push(ni);
      }
    }
  }
  return filled;
}

/** Morphological dilate — expand the filled set by 1px */
function dilate(filled: Set<number>, w: number, h: number): Set<number> {
  const out = new Set(filled);
  for (const pi of filled) {
    const px = pi % w, py = (pi - px) / w;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
      const nx = px+dx, ny = py+dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h) out.add(ny*w+nx);
    }
  }
  return out;
}

/** Morphological erode — shrink by 1px */
function erode(filled: Set<number>, w: number, h: number): Set<number> {
  const out = new Set<number>();
  for (const pi of filled) {
    const px = pi % w, py = (pi - px) / w;
    let allIn = true;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (!filled.has((py+dy)*w+(px+dx))) { allIn = false; break; }
    }
    if (allIn) out.add(pi);
  }
  return out;
}

/** Extract boundary pixels */
function extractBoundary(filled: Set<number>, w: number): Pt[] {
  const pts: Pt[] = [];
  for (const pi of filled) {
    const px = pi % w, py = (pi - px) / w;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      if (!filled.has((py+dy)*w+(px+dx))) {
        pts.push([px, py]);
        break;
      }
    }
  }
  return pts;
}

/** Convex hull (Graham scan) */
function convexHull(points: Pt[]): Pt[] {
  if (points.length < 3) return points;

  // Find bottom-most (then leftmost) point
  let pivot = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i][1] > points[pivot][1] ||
       (points[i][1] === points[pivot][1] && points[i][0] < points[pivot][0])) {
      pivot = i;
    }
  }
  [points[0], points[pivot]] = [points[pivot], points[0]];
  const p0 = points[0];

  // Sort by polar angle
  const sorted = points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a[1] - p0[1], a[0] - p0[0]);
    const angleB = Math.atan2(b[1] - p0[1], b[0] - p0[0]);
    if (angleA !== angleB) return angleA - angleB;
    const distA = (a[0]-p0[0])**2 + (a[1]-p0[1])**2;
    const distB = (b[0]-p0[0])**2 + (b[1]-p0[1])**2;
    return distA - distB;
  });

  const hull: Pt[] = [p0];
  for (const p of sorted) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2];
      const b = hull[hull.length - 1];
      const cross = (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0]);
      if (cross <= 0) hull.pop(); else break;
    }
    hull.push(p);
  }
  return hull;
}

/** Concave hull: subsample boundary into angular sectors from centroid */
function concaveHull(boundary: Pt[], sectors: number = 72): Pt[] {
  if (boundary.length < 3) return boundary;

  // Compute centroid
  let cx = 0, cy = 0;
  for (const [x, y] of boundary) { cx += x; cy += y; }
  cx /= boundary.length; cy /= boundary.length;

  // For each angular sector, find the farthest point
  const sectorSize = (2 * Math.PI) / sectors;
  const farthest: (Pt | null)[] = new Array(sectors).fill(null);
  const farthestDist: number[] = new Array(sectors).fill(0);

  for (const [x, y] of boundary) {
    let angle = Math.atan2(y - cy, x - cx);
    if (angle < 0) angle += 2 * Math.PI;
    const sector = Math.floor(angle / sectorSize) % sectors;
    const dist = (x - cx) ** 2 + (y - cy) ** 2;
    if (dist > farthestDist[sector]) {
      farthestDist[sector] = dist;
      farthest[sector] = [x, y];
    }
  }

  return farthest.filter((p): p is Pt => p !== null);
}

/** Douglas-Peucker simplification */
function simplify(pts: Pt[], eps: number): Pt[] {
  if (pts.length <= 2) return pts;
  let maxD = 0, maxI = 0;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = ptLineDist(pts[i], a, b);
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD > eps) {
    const l = simplify(pts.slice(0, maxI + 1), eps);
    const r = simplify(pts.slice(maxI), eps);
    return [...l.slice(0, -1), ...r];
  }
  return [a, b];
}

function ptLineDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0]-a[0], dy = b[1]-a[1];
  const lenSq = dx*dx + dy*dy;
  if (lenSq === 0) return Math.sqrt((p[0]-a[0])**2 + (p[1]-a[1])**2);
  const t = Math.max(0, Math.min(1, ((p[0]-a[0])*dx + (p[1]-a[1])*dy) / lenSq));
  return Math.sqrt((p[0] - a[0]-t*dx)**2 + (p[1] - a[1]-t*dy)**2);
}

/** Read pixels from WebGL canvas */
function readWebGL(canvas: HTMLCanvasElement): Uint8ClampedArray | null {
  const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
  if (!gl) return null;
  const { width: w, height: h } = canvas;
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  // Flip vertically (WebGL is bottom-up)
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * w * 4;
    out.set(buf.subarray(src, src + w * 4), y * w * 4);
  }
  return out;
}

/**
 * Detect a field polygon from satellite imagery.
 *
 * @returns Array of [lng, lat] or null if region too small
 */
export function detectFieldPolygon(
  canvas: HTMLCanvasElement,
  clickX: number,
  clickY: number,
  unproject: (pt: [number, number]) => { lng: number; lat: number },
  tolerance: number = 32,
): [number, number][] | null {
  const { width: w, height: h } = canvas;
  const data = readWebGL(canvas);
  if (!data) return null;

  const sx = Math.max(0, Math.min(w - 1, Math.round(clickX)));
  const sy = Math.max(0, Math.min(h - 1, Math.round(clickY)));

  // 1. Flood fill
  let filled = floodFill(data, w, h, sx, sy, tolerance);
  if (filled.size < 100) return null;

  // 2. Morphological close (dilate then erode) — fills small gaps
  filled = dilate(filled, w, h);
  filled = erode(filled, w, h);

  // 3. Extract boundary
  const boundary = extractBoundary(filled, w);
  if (boundary.length < 10) return null;

  // 4. Concave hull — pick farthest point per angular sector
  const hull = concaveHull(boundary, 64);
  if (hull.length < 3) return null;

  // 5. Simplify
  const simplified = simplify(hull, 5);
  if (simplified.length < 3) return null;

  // 6. Convert to lat/lng
  const ratio = window.devicePixelRatio || 1;
  return simplified.map(([x, y]) => {
    const { lng, lat } = unproject([x / ratio, y / ratio]);
    return [lng, lat] as [number, number];
  });
}
