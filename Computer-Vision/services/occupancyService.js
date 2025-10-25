// Simple occupancy computation helpers + tray-based estimation using specs
// Strategy 1 (default): count-based vs expected capacity
// Strategy 2: area-based using bbox area / ROI area (not implemented: ROI)
import { getClassAlias } from './specService.js';

const DEFAULT_RELEVANT_CLASSES = new Set([
  'bottle','cup','can','snack','bowl','wine glass','banana','apple','sandwich','orange','broccoli','carrot','cake','donut'
]);

export function computeOccupancy({
  detections = [],
  strategy = 'count',
  expectedCapacity = 100,
  relevantClasses = DEFAULT_RELEVANT_CLASSES,
}) {
  if (!detections.length) return 0;

  const relevant = detections.filter(d => relevantClasses.has(d.class));
  if (strategy === 'count') {
    if (!expectedCapacity || expectedCapacity <= 0) return Math.min(100, relevant.length * 100);
    return Math.max(0, Math.min(100, (relevant.length / expectedCapacity) * 100));
  }
  // area strategy placeholder
  let areaSum = 0;
  for (const d of relevant) {
    if (Array.isArray(d.bbox) && d.bbox.length === 4) {
      const [x, y, w, h] = d.bbox;
      areaSum += Math.max(0, w) * Math.max(0, h);
    }
  }
  // Without ROI, we normalize by a rough frame size if provided via detection meta
  const frameArea = detections[0]?.frameArea || 1;
  if (frameArea <= 0) return 0;
  const ratio = areaSum / frameArea;
  return Math.max(0, Math.min(100, ratio * 100));
}

// Tray-based occupancy from normalized ROIs in a spec
export async function computeTrayOccupancy({ detections = [], spec }) {
  if (!spec?.trays?.length || !detections?.length) {
    return { overallPercent: 0, trays: [] };
  }

  const classAlias = await getClassAlias(spec);

  function inRoi(det, roi, frameW, frameH) {
    const [x, y, w, h] = det.bbox || [0, 0, 0, 0];
    const cx = x + w / 2; const cy = y + h / 2;
    const [rx, ry, rw, rh] = roi;
    const X0 = rx * frameW; const Y0 = ry * frameH;
    const X1 = (rx + rw) * frameW; const Y1 = (ry + rh) * frameH;
    return cx >= X0 && cx <= X1 && cy >= Y0 && cy <= Y1;
  }

  const frameW = detections[0]?.frame?.w || 1280;
  const frameH = detections[0]?.frame?.h || 720;
  const trayResults = spec.trays.map(t => ({ id: t.id, label: t.label, capacity: t.capacity, percent: 0, count: 0 }));

  for (const det of detections) {
    const cls = String(det.class).toLowerCase();
    for (let i = 0; i < spec.trays.length; i++) {
      const tray = spec.trays[i];
      const accepted = tray.classes?.some(canon => {
        const set = classAlias.get(canon) || new Set([canon]);
        return set.has(cls);
      });
      if (!accepted) continue;
      if (inRoi(det, tray.roi, frameW, frameH)) trayResults[i].count += 1;
    }
  }

  let total = 0; let n = 0;
  for (const t of trayResults) {
    const cap = Math.max(1, Number(t.capacity) || 1);
    const pct = Math.min(100, (t.count / cap) * 100);
    t.percent = Number(pct.toFixed(2));
    total += t.percent; n += 1;
  }
  const overallPercent = n ? Number((total / n).toFixed(2)) : 0;
  return { overallPercent, trays: trayResults };
}
