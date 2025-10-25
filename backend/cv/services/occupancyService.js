// Occupancy computation that can use either count, area, or volume heuristics
// Leverages Dimensions config when available
import { Dimensions } from '../util/Dimensions.js';
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
    // If we have Dimensions for expected capacity per trolley, use it
    const cap = Dimensions?.trolley?.expectedItemCapacity ?? expectedCapacity;
    if (!cap || cap <= 0) return Math.min(100, relevant.length * 100);
    return Math.max(0, Math.min(100, (relevant.length / cap) * 100));
  }

  if (strategy === 'volume') {
    // Sum up per-item nominal volume vs trolley usable volume
    const trolleyVol = Dimensions?.trolley?.usableVolumeCm3;
    if (!trolleyVol || trolleyVol <= 0) return 0;
    let sum = 0;
    for (const d of relevant) {
      const cls = String(d.class).toLowerCase();
      const spec = Dimensions.items[cls];
      if (spec?.volumeCm3) sum += spec.volumeCm3;
      else if (spec?.w && spec?.h && spec?.d) sum += spec.w * spec.h * spec.d;
    }
    const pct = (sum / trolleyVol) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  // area heuristic fallback
  let areaSum = 0;
  for (const d of relevant) {
    if (Array.isArray(d.bbox) && d.bbox.length === 4) {
      const [x, y, w, h] = d.bbox;
      areaSum += Math.max(0, w) * Math.max(0, h);
    }
  }
  const frameArea = detections[0]?.frameArea || Dimensions?.camera?.defaultFrameAreaPx || 1;
  if (frameArea <= 0) return 0;
  const ratio = areaSum / frameArea;
  return Math.max(0, Math.min(100, ratio * 100));
}

// Compute per-tray occupancy using a spec with normalized ROIs
// spec.trays[]: { id, roi:[x,y,w,h] in 0..1, capacity, classes[] canonical }
// detections[]: { class, bbox:[x,y,w,h], frame:{w,h} optional }
export async function computeTrayOccupancy({ detections = [], spec }) {
  if (!spec?.trays?.length || !detections?.length) {
    return { overallPercent: 0, trays: [] };
  }

  const classAlias = await getClassAlias(spec);

  // helper to check if a detection belongs to a tray ROI
  function inRoi(det, roi, frameW, frameH) {
    const [x, y, w, h] = det.bbox || [0, 0, 0, 0];
    const cx = x + w / 2;
    const cy = y + h / 2;
    const [rx, ry, rw, rh] = roi; // normalized
    const X0 = rx * frameW;
    const Y0 = ry * frameH;
    const X1 = (rx + rw) * frameW;
    const Y1 = (ry + rh) * frameH;
    return cx >= X0 && cx <= X1 && cy >= Y0 && cy <= Y1;
  }

  // Derive frame size
  const frameW = detections[0]?.frame?.w || Dimensions?.camera?.defaultFrameAreaPx ? Math.sqrt(Dimensions.camera.defaultFrameAreaPx) : 1280;
  const frameH = detections[0]?.frame?.h || frameW * 0.5625;

  const trayResults = spec.trays.map(tray => ({ id: tray.id, label: tray.label, capacity: tray.capacity, percent: 0, count: 0 }));

  for (const det of detections) {
    const cls = String(det.class).toLowerCase();
    for (let i = 0; i < spec.trays.length; i++) {
      const tray = spec.trays[i];
      // class filter
      const accepted = tray.classes?.some(canon => {
        const set = classAlias.get(canon) || new Set([canon]);
        return set.has(cls);
      });
      if (!accepted) continue;

      if (inRoi(det, tray.roi, frameW, frameH)) {
        trayResults[i].count += 1;
      }
    }
  }

  let totalPct = 0;
  let n = 0;
  for (const t of trayResults) {
    const cap = Math.max(1, Number(t.capacity) || 1);
    const pct = Math.min(100, (t.count / cap) * 100);
    t.percent = Number(pct.toFixed(2));
    totalPct += t.percent;
    n += 1;
  }

  const overallPercent = n ? Number((totalPct / n).toFixed(2)) : 0;
  return { overallPercent, trays: trayResults };
}
