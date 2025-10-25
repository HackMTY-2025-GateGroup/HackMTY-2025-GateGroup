// Domain dimensions for trolley, drawers, and products
// Adjust these with real measurements to improve precision
// Units: centimeters (cm) for lengths, cm^3 for volumes

export const Dimensions = {
  trolley: {
    // Overall internal usable dimensions (estimate)
    w: 40, // width cm
    h: 100, // height cm
    d: 30, // depth cm
    drawers: 12, // number of standard drawers
    usableVolumeCm3: 40 * 100 * 30 * 0.85, // 85% packing efficiency
    expectedItemCapacity: 220, // baseline count capacity (adjust)
  },
  drawer: {
    w: 38,
    h: 7.5,
    d: 28,
    volumeCm3: 38 * 7.5 * 28,
  },
  // Per-item nominal sizes (approx)
  items: {
    bottle: { h: 21, d: 6.5, w: 6.5, volumeCm3: Math.PI * (6.5/2) ** 2 * 21 },
    can: { h: 12, d: 6.6, w: 6.6, volumeCm3: Math.PI * (6.6/2) ** 2 * 12 },
    cup: { h: 10, d: 8, w: 8, volumeCm3: Math.PI * (8/2) ** 2 * 10 * 0.5 },
    snack: { w: 12, h: 3, d: 8, volumeCm3: 12 * 3 * 8 },
    bowl: { w: 14, h: 6, d: 14, volumeCm3: 14 * 6 * 14 * 0.6 },
    'wine glass': { h: 18, d: 7, w: 7, volumeCm3: Math.PI * (7/2) ** 2 * 12 * 0.6 },
    juice: { w: 7, h: 17, d: 7, volumeCm3: 7 * 17 * 7 },
    water: { w: 6.5, h: 21, d: 6.5, volumeCm3: Math.PI * (6.5/2) ** 2 * 21 },
    // Map alternate class names
  },
  camera: {
    defaultFrameAreaPx: 1280 * 720,
    // Optionally, define ROI of trolley within image to scale area-based occupancy
    roi: null,
  }
};

export default Dimensions;
