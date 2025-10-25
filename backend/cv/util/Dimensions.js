// Domain dimensions for trolley, trays, and products
// Units: centimeters (cm) for lengths, cm^3 for volumes, liters for convenience where noted

const cm3ToLiters = (v) => v / 1000;

export const Dimensions = {
  // Single removable tray (box) — from tray.txt
  tray: {
    l: 37, // largo (length)
    w: 26, // ancho (width)
    h: 10, // depth/height
    volumeCm3: 37 * 26 * 10, // 9620 cm^3
    usableVolumeCm3: Math.round(37 * 26 * 10 * 0.85), // ~15% lost to walls/dividers
    get volumeLiters() { return cm3ToLiters(this.volumeCm3); }, // ~9.62 L
    get usableLiters() { return cm3ToLiters(this.usableVolumeCm3); }, // ~8.18 L
    // Based on "5 de largo" and "3.5 de ancho" for 355ml cans (effective pitch ~7.4 cm)
    canPitchCm: 7.4,
    inferredCanGrid: { cols: 5, rows: 3 }, // 15 cans per tray (conservador)
  },

  // Entire trolley assumptions (adjust if needed)
  trolley: {
    // Number of tray slots per column and rows facing both sides
    traysPerRow: 2, // frente + atrás
    rows: 6,        // ejemplo: 6 filas => 12 bandejas
    get totalTrays() { return this.traysPerRow * this.rows; },
    // Derived usable volume assuming all trays
    get usableVolumeCm3() { return Dimensions.tray.usableVolumeCm3 * this.totalTrays; },
    expectedItemCapacity: 220, // fallback para estrategia "count"
  },

  // Legacy drawer dimension kept for compatibility with any code using "drawer"
  drawer: {
    w: 37,
    h: 10,
    d: 26,
    get volumeCm3() { return 37 * 10 * 26; },
  },

  // Product catalog — sizes and nominal volume
  // Prefer real content volume (ml -> cm^3) for occupancy-by-volume,
  // but keep geometric estimates for fallbacks.
  items: {
    // 1) 355 ml can (Coca Cola estándar)
    'can_355ml': {
      label: 'Can 355 ml',
      h: 12.25,
      d: 6.5,
      w: 6.5,
      // content volume used for volume occupancy
      contentVolumeCm3: 355,
      geomVolumeCm3: Math.PI * (6.5/2) ** 2 * 12.25,
    },

    // 2) Big water 1.5 L (acostada)
    'water_1_5l': {
      label: 'Water 1.5 L',
      // lying down approx bounding box inside a tray
      l: 33, w: 9, h: 9,
      contentVolumeCm3: 1500,
      geomVolumeCm3: 33 * 9 * 9,
    },

    // 3) Juice box 946 ml (Del Valle)
    'juice_946ml': {
      label: 'Juice 946 ml',
      w: 7.5, h: 20, d: 7.5,
      contentVolumeCm3: 946,
      geomVolumeCm3: 7.5 * 20 * 7.5,
    },

    // 4) Cookie package 30 g (flowpack)
    'cookie_30g': {
      label: 'Cookie 30 g',
      w: 12, h: 3, d: 8,
      // food mass doesn't map to volume; keep geom box
      contentVolumeCm3: 0,
      geomVolumeCm3: 12 * 3 * 8,
      typicalPerTray: 64,
    },

    // 5) Big Coca-Cola 1.5 L (share)
    'coke_1_5l': {
      label: 'Coca-Cola 1.5 L',
      h: 32, d: 9, w: 9,
      contentVolumeCm3: 1500,
      geomVolumeCm3: Math.PI * (9/2) ** 2 * 32,
    },

    // Generic fallback mappings used by detector labels
    bottle: { h: 21, d: 6.5, w: 6.5, contentVolumeCm3: 500, geomVolumeCm3: Math.PI * (6.5/2) ** 2 * 21 },
    can: { h: 12.25, d: 6.5, w: 6.5, contentVolumeCm3: 355, geomVolumeCm3: Math.PI * (6.5/2) ** 2 * 12.25 },
    cup: { h: 10, d: 8, w: 8, contentVolumeCm3: 250, geomVolumeCm3: Math.PI * (8/2) ** 2 * 10 * 0.5 },
    snack: { w: 12, h: 3, d: 8, contentVolumeCm3: 0, geomVolumeCm3: 12 * 3 * 8 },
  },

  camera: {
    defaultFrameAreaPx: 1280 * 720,
    // Optionally, define ROI of trolley within image to scale area-based occupancy
    roi: null,
  }
};

export default Dimensions;
