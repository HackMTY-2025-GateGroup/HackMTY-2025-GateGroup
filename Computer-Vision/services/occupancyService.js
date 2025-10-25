// Simple occupancy computation helpers
// Strategy 1 (default): count-based vs expected capacity
// Strategy 2: area-based using bbox area / ROI area (not implemented: ROI)

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
