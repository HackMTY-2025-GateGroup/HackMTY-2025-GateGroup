// Inventory Estimation Service
// Calculates what products are missing to fill the tray based on YOLO detections
import { Dimensions } from '../util/Dimensions.js';
import { supabaseAdmin } from '../../config/supabase.js';

// Base mapping for direct label matches
const CLASS_TO_PRODUCT_MAP = {
  'can': { type: 'can_355ml', label: 'Can 355 ml', maxPerTray: 15 },
  'cup': { type: 'juice_946ml', label: 'Juice 946 ml', maxPerTray: 4 },
  'snack': { type: 'cookie_30g', label: 'Cookie 30g', maxPerTray: 64 },
  'juice': { type: 'juice_946ml', label: 'Juice 946 ml', maxPerTray: 4 },
  'carton': { type: 'juice_946ml', label: 'Juice 946 ml', maxPerTray: 4 },
};

function inferProductFromDetection(det) {
  // Heuristic mapping when YOLO label is too generic (e.g., 'bottle')
  const raw = String(det.class || '').toLowerCase();
  if (CLASS_TO_PRODUCT_MAP[raw]) return CLASS_TO_PRODUCT_MAP[raw];

  // Cartons often labeled as 'box', 'milk', 'carton'
  if (raw.includes('carton') || raw.includes('box') || raw.includes('milk')) {
    return { type: 'juice_946ml', label: 'Juice 946 ml', maxPerTray: 4 };
  }

  // Snacks/flowpacks sometimes detected as 'cake', 'donut', 'sandwich', brand names, etc.
  if (raw.includes('snack') || raw.includes('cake') || raw.includes('donut') || raw.includes('sandwich') || raw.includes('cookie')) {
    return { type: 'cookie_30g', label: 'Cookie 30g', maxPerTray: 64 };
  }

  // Bottle size inference by bbox geometry when frame is available
  if (raw.includes('bottle')) {
    const [ , , w = 0, h = 0 ] = Array.isArray(det.bbox) ? det.bbox : [0, 0, 0, 0];
    const frameH = det?.frame?.h || 0;
    const normH = frameH ? h / frameH : 0;
    const aspect = h > 0 ? w / h : 0;
    // Heuristics:
    // - Very tall in frame (normH >= 0.18) or slender (aspect <= 0.5) -> 1.5L
    // - Otherwise fallback to 0.5L generic bottle
    if (normH >= 0.18 || aspect <= 0.5) {
      return { type: 'water_1_5l', label: 'Water 1.5 L', maxPerTray: 3 };
    }
    return { type: 'bottle', label: 'Bottle 0.5 L', maxPerTray: 6 };
  }

  // Fallbacks
  if (raw.includes('refrigerator') || raw.includes('drawer')) {
    // Not a product
    return null;
  }

  // Default to can as conservative estimate
  return { type: 'can_355ml', label: 'Can 355 ml', maxPerTray: 15 };
}

/**
 * Calculate products needed to fill the tray
 * @param {Object} params
 * @param {Array} params.detections - YOLO detections [{class, score, bbox}]
 * @param {Object} params.spec - Tray specification
 * @param {string} params.side - 'front' or 'back'
 * @returns {Object} { currentProducts, missingProducts, occupancyPercent, volumeUsed, volumeAvailable }
 */
export function calculateMissingProducts({ detections = [], spec, side = 'front' }) {
  // Group detections by inferred product type
  const detectedCounts = {};
  const productInfoByKey = {};
  for (const det of detections) {
    const mapped = inferProductFromDetection(det);
    if (!mapped) continue;
    const key = mapped.type;
    detectedCounts[key] = (detectedCounts[key] || 0) + 1;
    productInfoByKey[key] = mapped;
  }

  // Calculate capacity based on spec trays for the given side
  const sideTrays = spec?.trays?.filter(t => (t.side || 'front') === side) || [];
  
  // Get tray dimensions from Dimensions.js and scale by number of trays on this side
  const trayCountForSide = Math.max(1, sideTrays.length || 0);
  const trayCapacity = Dimensions.tray.usableLiters * trayCountForSide;
  const trayVolumeCm3 = Dimensions.tray.usableVolumeCm3 * trayCountForSide;

  // Current products detected
  const currentProducts = [];
  let volumeUsedCm3 = 0;

  for (const [productType, count] of Object.entries(detectedCounts)) {
    const productInfo = productInfoByKey[productType] || { type: productType, label: productType };
    const itemDimensions = Dimensions.items[productInfo.type] || Dimensions.items['can'];
    const volumePerItem = itemDimensions.contentVolumeCm3 || itemDimensions.geomVolumeCm3;
    
    volumeUsedCm3 += count * volumePerItem;
    
    currentProducts.push({
      className: productType,
      productType: productInfo.type,
      label: productInfo.label,
      detected: count,
      volumePerItem: volumePerItem / 1000, // Convert to liters
      totalVolume: (count * volumePerItem) / 1000,
    });
  }

  // Calculate available volume
  const volumeUsedLiters = volumeUsedCm3 / 1000;
  const volumeAvailableLiters = trayCapacity - volumeUsedLiters;
  const occupancyPercent = (volumeUsedLiters / trayCapacity) * 100;

  // Calculate missing products to reach optimal capacity (80-90% to avoid overfilling)
  const targetOccupancy = 0.85; // 85% target
  const targetVolumeLiters = trayCapacity * targetOccupancy;
  const volumeNeededLiters = Math.max(0, targetVolumeLiters - volumeUsedLiters);
  const volumeNeededCm3 = volumeNeededLiters * 1000;

  // Suggest products to fill based on what's already there (smart suggestion)
  const missingProducts = [];
  
  // Strategy: suggest more of what's already detected
  for (const product of currentProducts) {
    const itemDimensions = Dimensions.items[product.productType] || Dimensions.items['can'];
    const volumePerItemCm3 = itemDimensions.contentVolumeCm3 || itemDimensions.geomVolumeCm3;
    const productMapping = { maxPerTray: 64, ...(productInfoByKey[product.productType] || {}) };
    
    // Calculate how many more we can fit
    const currentCount = product.detected;
    const maxAllowed = productMapping.maxPerTray;
    const canAddMore = maxAllowed - currentCount;
    
    if (canAddMore > 0 && volumeNeededCm3 > 0) {
      const howManyMoreCanFit = Math.min(
        canAddMore,
        Math.floor(volumeNeededCm3 / volumePerItemCm3)
      );
      
      if (howManyMoreCanFit > 0) {
        missingProducts.push({
          className: product.className,
          productType: product.productType,
          label: product.label,
          suggested: howManyMoreCanFit,
          volumePerItem: volumePerItemCm3 / 1000,
          totalVolume: (howManyMoreCanFit * volumePerItemCm3) / 1000,
          reason: `Add ${howManyMoreCanFit} more to optimize tray capacity`,
        });
      }
    }
  }

  // If no suggestions yet, suggest popular items
  if (missingProducts.length === 0 && volumeNeededCm3 > 0) {
    // Default: suggest cans (most common)
    const canDimensions = Dimensions.items['can_355ml'];
    const canVolume = canDimensions.contentVolumeCm3;
    const canCount = Math.min(15, Math.floor(volumeNeededCm3 / canVolume));
    
    if (canCount > 0) {
      missingProducts.push({
        className: 'can',
        productType: 'can_355ml',
        label: 'Can 355 ml',
        suggested: canCount,
        volumePerItem: canVolume / 1000,
        totalVolume: (canCount * canVolume) / 1000,
        reason: 'Suggested to fill empty tray',
      });
    }
  }

  return {
    currentProducts,
    missingProducts,
    occupancyPercent: Number(occupancyPercent.toFixed(2)),
    volumeUsedLiters: Number(volumeUsedLiters.toFixed(3)),
    volumeAvailableLiters: Number(volumeAvailableLiters.toFixed(3)),
    trayCapacityLiters: Number(trayCapacity.toFixed(3)),
    targetOccupancyPercent: Number((targetOccupancy * 100).toFixed(2)),
  };
}

/**
 * Save inventory estimation to database
 * @param {Object} params
 * @param {string} params.trolleyId - UUID of trolley
 * @param {string} params.trolleyCode - Code of trolley
 * @param {Object} params.analysisResult - Complete analysis result
 * @param {Object} params.inventoryEstimation - Inventory estimation data
 * @returns {Promise<Object>} Database row
 */
export async function saveInventoryEstimation({
  trolleyId,
  trolleyCode,
  analysisResult,
  inventoryEstimation,
  imagePath,
}) {
  // Try to find or create inventory for this trolley FIRST
  let inventoryId = null;
  
  try {
    const { data: existingInventory, error: findError } = await supabaseAdmin
      .from('inventories')
      .select('id, updated_at, created_at')
      .eq('location_type', 'trolley')
      .eq('location_id', trolleyId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.warn('Error finding inventory:', findError);
    }

    if (existingInventory) {
      inventoryId = existingInventory.id;
    } else {
      // Create inventory for trolley
      const { data: newInventory, error: invError } = await supabaseAdmin
        .from('inventories')
        .insert({
          location_type: 'trolley',
          location_id: trolleyId,
          name: `Inventory for ${trolleyCode}`,
          notes: 'Auto-created from CV analysis',
        })
        .select('id')
        .maybeSingle();

      if (!invError && newInventory) {
        inventoryId = newInventory.id;
      } else if (invError) {
        console.warn('Error creating inventory:', invError);
      }
    }
  } catch (e) {
    console.warn('Inventory creation/find failed (continuing):', e);
  }

  // Build analysis payload
  const analysisPayload = {
    trolley_id: trolleyId,
    inventory_id: inventoryId,
    image_path: imagePath,
    analysis_result: {
      ...analysisResult,
      inventory_estimation: inventoryEstimation,
    },
    confidence: null,
    model_version: 'yolo-server-v1',
  };

  // Check if there's an existing analysis for this trolley
  let analysisRow = null;
  try {
    const { data: existingAnalysis, error: findError } = await supabaseAdmin
      .from('image_analysis')
      .select('id')
      .eq('trolley_id', trolleyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!findError && existingAnalysis) {
      // Update existing record
      console.log('[saveInventoryEstimation] Updating existing analysis:', existingAnalysis.id);
      const { data: updatedRow, error: updateError } = await supabaseAdmin
        .from('image_analysis')
        .update(analysisPayload)
        .eq('id', existingAnalysis.id)
        .select('*')
        .maybeSingle();

      if (updateError) {
        console.error('Error updating analysis:', updateError);
        throw updateError;
      }
      analysisRow = updatedRow;
    } else {
      // Insert new record
      console.log('[saveInventoryEstimation] Creating new analysis');
      const { data: insertedRow, error: insertError } = await supabaseAdmin
        .from('image_analysis')
        .insert(analysisPayload)
        .select('*')
        .maybeSingle();

      if (insertError) {
        console.error('Error saving analysis:', insertError);
        throw insertError;
      }
      analysisRow = insertedRow;
    }
  } catch (e) {
    console.error('[saveInventoryEstimation] Error in transaction:', e);
    throw e;
  }

  return {
    ...analysisRow,
    inventory_id: inventoryId,
  };
}

/**
 * Generate shopping list from missing products
 * @param {Array} missingProducts - Array of missing product objects
 * @returns {Array} Shopping list with product details
 */
export function generateShoppingList(missingProducts) {
  return missingProducts.map(product => ({
    productType: product.productType,
    label: product.label,
    quantity: product.suggested,
    volumeLiters: product.totalVolume,
    priority: product.suggested > 5 ? 'high' : 'normal',
    notes: product.reason,
  }));
}

export default {
  calculateMissingProducts,
  saveInventoryEstimation,
  generateShoppingList,
};

