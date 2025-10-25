// Occupancy computation that can use either count, area, or volume heuristics
// Leverages Dimensions config when available
import { Dimensions } from '../util/Dimensions.js';

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
