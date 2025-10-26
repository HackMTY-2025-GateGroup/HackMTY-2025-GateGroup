// Visual (pixel-based) tray occupancy estimation using image statistics
// Heuristic: compute entropy and brightness inside each tray ROI and map to 0..100%
// Requires: sharp
import sharp from 'sharp';

// Normalize helper
function norm(val, min, max) {
  if (Number.isNaN(val)) return 0;
  if (max === min) return 0;
  const t = (val - min) / (max - min);
  return Math.max(0, Math.min(1, t));
}

// Convert normalized [x,y,w,h] ROI to pixel rectangle
function roiToRect(roi, width, height) {
  const [rx, ry, rw, rh] = roi;
  const left = Math.max(0, Math.floor(rx * width));
  const top = Math.max(0, Math.floor(ry * height));
  const w = Math.max(1, Math.min(width - left, Math.floor(rw * width)));
  const h = Math.max(1, Math.min(height - top, Math.floor(rh * height)));
  return { left, top, width: w, height: h };
}

/**
 * Compute a visual-only occupancy percentage per tray.
 * Mapping intuition:
 *  - Empty trays tend to be bright, low texture => low entropy and high mean
 *  - Full trays show colors/edges => higher entropy, often slightly darker
 * We map entropy in ~[3.0, 5.5] to 0..1 and nudge with brightness.
 */
export async function computeTrayVisualOccupancy({ imagePath, spec }) {
  const out = { overallPercent: 0, trays: [] };
  if (!imagePath || !spec?.trays?.length) return out;

  // Read base image and get dimensions
  const img = sharp(imagePath, { failOn: 'none' });
  const meta = await img.metadata();
  const W = meta.width || 0;
  const H = meta.height || 0;
  if (!W || !H) return out;

  let total = 0;
  for (const tray of spec.trays) {
    try {
      const rect = roiToRect(tray.roi, W, H);
      // Downscale region for speed before stats
      const region = await sharp(imagePath)
        .extract(rect)
        .resize({ width: Math.max(64, Math.floor(rect.width / 2)) })
        .greyscale()
        .toColourspace('b-w')
        .stats();

      const entropy = region.entropy ?? 0; // ~0..8
      const mean = region.channels?.[0]?.mean ?? 128; // 0..255

      // Base from entropy: empty ~3.0 -> 0%, full ~5.5 -> 100%
      let score = norm(entropy, 3.0, 5.5);
      // Brightness adjustment: very bright means emptier; darker => fuller
      const bright = norm(mean, 130, 220); // bright => 1, dark => 0
      score = score * (1 - 0.25 * bright) + (1 - bright) * 0.15; // nudge with darkness

      const percent = Math.max(0, Math.min(100, Number((score * 100).toFixed(2))));
      out.trays.push({ id: tray.id, label: tray.label, percent, entropy: Number(entropy.toFixed(3)), mean: Number(mean.toFixed(1)) });
      total += percent;
    } catch (e) {
      out.trays.push({ id: tray.id, label: tray.label, percent: 0, error: e.message });
    }
  }

  if (out.trays.length) out.overallPercent = Number((total / out.trays.length).toFixed(2));
  return out;
}

export default { computeTrayVisualOccupancy };
