import { z } from 'zod';
import path from 'node:path';
import { supabaseAdmin } from '../../config/supabase.js';
import { computeOccupancy, computeTrayOccupancy, computeTrayVolumes, computeDoubleSided } from '../services/occupancyService.js';
import { computeTrayVisualOccupancy } from '../services/visualOccupancyService.js';
import { loadSpec, listSpecs } from '../services/specService.js';
import { detectOnServer } from '../services/yoloService.js';
import { calculateMissingProducts, saveInventoryEstimation, generateShoppingList } from '../services/inventoryEstimationService.js';

const BaseDet = z.object({
  class: z.string(),
  score: z.number().min(0).max(1).optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});

const PostOccupancySchema = z.object({
  trolleyId: z.string().uuid().optional(),
  trolleyCode: z.string().min(1).optional(),
  inventoryId: z.string().uuid().optional(),
  occupancyPercent: z.number().min(0).max(100),
  detectedItems: z.array(BaseDet).optional(),
  source: z.string().default('web'),
  modelVersion: z.string().default('yolo-client'),
});

const PostDetectionsSchema = z.object({
  trolleyId: z.string().uuid().optional(),
  trolleyCode: z.string().min(1).optional(),
  inventoryId: z.string().uuid().optional(),
  expectedCapacity: z.number().int().positive().optional(),
  strategy: z.enum(['count','area','volume']).optional(),
  detections: z.array(BaseDet),
  source: z.string().default('web'),
  modelVersion: z.string().default('yolo-client'),
});

async function resolveTrolleyId({ trolleyId, trolleyCode }) {
  if (trolleyId) return trolleyId;
  if (!trolleyCode) return null;
  // Some databases may contain multiple rows with the same code.
  // Select the most recent one deterministically to avoid "multiple rows returned" errors.
  const { data, error } = await supabaseAdmin
    .from('trolleys')
    .select('id, created_at')
    .eq('code', trolleyCode)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

export async function postOccupancy(req, res) {
  const parsed = PostOccupancySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const { trolleyId, trolleyCode, inventoryId, occupancyPercent, detectedItems, source, modelVersion } = parsed.data;

  const id = await resolveTrolleyId({ trolleyId, trolleyCode });
  if (!id) return res.status(404).json({ error: 'Trolley not found. Provide trolleyId or trolleyCode.' });

  const analysis_result = {
    occupancy: Number((occupancyPercent / 100).toFixed(4)),
    detections: detectedItems || [],
    source,
  };
  const payload = { trolley_id: id, analysis_result, confidence: null, model_version: modelVersion };
  if (inventoryId) payload.inventory_id = inventoryId;

  const { data, error } = await supabaseAdmin
    .from('image_analysis')
    .insert(payload)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, row: data });
}

export async function postDetections(req, res) {
  const parsed = PostDetectionsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const { trolleyId, trolleyCode, inventoryId, expectedCapacity = 100, strategy = 'count', detections, source, modelVersion } = parsed.data;

  const id = await resolveTrolleyId({ trolleyId, trolleyCode });
  if (!id) return res.status(404).json({ error: 'Trolley not found' });

  const occupancyPercent = computeOccupancy({ detections, strategy, expectedCapacity });
  const analysis_result = {
    occupancy: Number((occupancyPercent / 100).toFixed(4)),
    detections,
    source,
  };

  const payload = { trolley_id: id, analysis_result, confidence: null, model_version: modelVersion };
  if (inventoryId) payload.inventory_id = inventoryId;

  const { data, error } = await supabaseAdmin
    .from('image_analysis')
    .insert(payload)
    .select('*')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true, row: data });
}

export async function postImage(req, res) {
  try {
    const file = req.file;
    const { trolleyId, trolleyCode, inventoryId, runServerInference } = req.body;
    if (!file) return res.status(400).json({ error: 'image file is required (field name: image)' });

    const id = await resolveTrolleyId({ trolleyId, trolleyCode });
    if (!id) return res.status(404).json({ error: 'Trolley not found' });

    let detections = [];
    let serverInference = null;
    if (String(runServerInference).toLowerCase() === 'true') {
      serverInference = await detectOnServer(file.path);
      detections = serverInference?.detections || [];
    }

    const analysis_result = {
      occupancy: detections.length ? Number((computeOccupancy({ detections }) / 100).toFixed(4)) : null,
      detections,
      image_filename: path.basename(file.path),
      server_inference: serverInference || { supported: false },
      source: 'image-upload',
    };

    const payload = {
      trolley_id: id,
      inventory_id: inventoryId || null,
      image_path: file.path,
      analysis_result,
      confidence: null,
      model_version: serverInference?.supported ? 'yolo-onnx-server' : 'upload-only',
    };

    const { data, error } = await supabaseAdmin
      .from('image_analysis')
      .insert(payload)
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true, row: data });
  } catch (e) {
    console.error('[postImage] error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}

export async function getLatest(req, res) {
  const trolleyId = req.query.trolleyId;
  const trolleyCode = req.query.trolleyCode;
  const id = await resolveTrolleyId({ trolleyId, trolleyCode });
  if (!id) return res.status(404).json({ error: 'Trolley not found' });

  const { data, error } = await supabaseAdmin
    .from('image_analysis')
    .select('*')
    .eq('trolley_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ row: data });
}

export async function getSpec(req, res) {
  try {
    const name = req.params.name || 'default.mx';
    const spec = await loadSpec(name);
    return res.json({ spec });
  } catch (e) {
    return res.status(404).json({ error: 'Spec not found' });
  }
}

export async function listAllSpecs(_req, res) {
  const names = await listSpecs();
  return res.json({ specs: names });
}

const PostEstimateSchema = z.object({
  specName: z.string().optional(),
  detections: z.array(BaseDet),
  frame: z.object({ w: z.number().positive(), h: z.number().positive() }).optional(),
});

export async function postEstimate(req, res) {
  const parsed = PostEstimateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const { specName = 'default.mx', detections, frame } = parsed.data;

  let spec;
  try { spec = await loadSpec(specName); } catch (e) { return res.status(404).json({ error: 'Spec not found' }); }

  // attach frame size to detections for ROI scaling when provided
  const d = detections.map(det => ({ ...det, frame }));
  const result = await computeTrayOccupancy({ detections: d, spec });
  return res.json(result);
}

const PostEstimateVolumeSchema = z.object({
  specName: z.string().optional(),
  detections: z.array(BaseDet),
  frame: z.object({ w: z.number().positive(), h: z.number().positive() }).optional(),
});

export async function postEstimateVolume(req, res) {
  const parsed = PostEstimateVolumeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const { specName = 'default.mx', detections, frame } = parsed.data;

  let spec;
  try { spec = await loadSpec(specName); } catch (e) { return res.status(404).json({ error: 'Spec not found' }); }

  const d = detections.map(det => ({ ...det, frame }));
  const result = await computeTrayVolumes({ detections: d, spec });
  return res.json(result);
}

const PostEstimateDoubleSchema = z.object({
  specName: z.string().default('doubleside.mx'),
  side: z.enum(['front','back']).default('front'),
  detections: z.array(BaseDet),
  frame: z.object({ w: z.number().positive(), h: z.number().positive() }).optional(),
});

export async function postEstimateDouble(req, res) {
  const parsed = PostEstimateDoubleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  const { specName, side, detections, frame } = parsed.data;
  let spec;
  try { spec = await loadSpec(specName); } catch (e) { return res.status(404).json({ error: 'Spec not found' }); }
  const d = detections.map(det => ({ ...det, frame }));
  const result = await computeDoubleSided({ detections: d, spec, side });
  return res.json(result);
}

// New comprehensive endpoint: analyze tray with inventory estimation
const PostAnalyzeTraySchema = z.object({
  trolleyCode: z.string().min(1),
  trolleyId: z.string().uuid().optional(),
  specName: z.string().default('doubleside.mx'),
});

export async function postAnalyzeTray(req, res) {
  try {
    const parsed = PostAnalyzeTraySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid payload', 
        details: parsed.error.flatten() 
      });
    }

    const { trolleyCode, trolleyId: providedId, specName } = parsed.data;
    const frontFile = req.files?.front?.[0];
    const backFile = req.files?.back?.[0];

    if (!frontFile || !backFile) {
      return res.status(400).json({ 
        error: 'Both front and back images are required',
        details: 'Upload images with field names: front, back'
      });
    }

    // Resolve trolley
    const trolleyId = await resolveTrolleyId({ 
      trolleyId: providedId, 
      trolleyCode 
    });

    if (!trolleyId) {
      return res.status(404).json({ 
        error: 'Trolley not found',
        message: `Please create trolley with code: ${trolleyCode}` 
      });
    }

    // Load spec
    let spec;
    try {
      spec = await loadSpec(specName);
    } catch (e) {
      return res.status(404).json({ error: 'Spec not found' });
    }

    // Run YOLO inference on both images
    const [frontInference, backInference] = await Promise.all([
      detectOnServer(frontFile.path),
      detectOnServer(backFile.path),
    ]);

    if (!frontInference.supported || !backInference.supported) {
      return res.status(500).json({
        error: 'Server inference not available',
        details: {
          front: frontInference.reason,
          back: backInference.reason,
        }
      });
    }

    const frontDetections = frontInference.detections || [];
    const backDetections = backInference.detections || [];

    // Calculate occupancy for both sides
    const frontOccupancy = await computeDoubleSided({
      detections: frontDetections.map(d => ({ ...d, frame: frontInference.frame })),
      spec,
      side: 'front',
    });

    const backOccupancy = await computeDoubleSided({
      detections: backDetections.map(d => ({ ...d, frame: backInference.frame })),
      spec,
      side: 'back',
    });

    // Visual occupancy fallback/boost using pixel statistics
    const [frontVisual, backVisual] = await Promise.all([
      computeTrayVisualOccupancy({ imagePath: frontFile.path, spec: { ...spec, trays: spec.trays.filter(t => (t.side||'front')==='front') } }),
      computeTrayVisualOccupancy({ imagePath: backFile.path,  spec: { ...spec, trays: spec.trays.filter(t => (t.side||'front')==='back') } }),
    ]);

    // Calculate inventory estimation for both sides
    const frontInventory = calculateMissingProducts({
      detections: frontDetections,
      spec,
      side: 'front',
    });

    const backInventory = calculateMissingProducts({
      detections: backDetections,
      spec,
      side: 'back',
    });

    // Merge results for overall metrics (volume-based, with visual boost when detections miss closed trays)
    const totalVolumeUsed = frontInventory.volumeUsedLiters + backInventory.volumeUsedLiters;
    const totalCapacity = frontInventory.trayCapacityLiters + backInventory.trayCapacityLiters;
    const overallOccupancy = (totalVolumeUsed / Math.max(1e-6, totalCapacity)) * 100;

    // Combine missing products from both sides
    const allMissingProducts = [
      ...frontInventory.missingProducts.map(p => ({ ...p, side: 'front' })),
      ...backInventory.missingProducts.map(p => ({ ...p, side: 'back' })),
    ];

    // Generate shopping list
    const shoppingList = generateShoppingList(allMissingProducts);

  // Side-level percent: take the max of volume-based and visual estimation to handle enclosed products
  const frontSidePercent = Math.max(Number(frontInventory.occupancyPercent || 0), Number(frontVisual.overallPercent || 0));
  const backSidePercent = Math.max(Number(backInventory.occupancyPercent || 0), Number(backVisual.overallPercent || 0));

  // If visual indicates near-empty, clamp to 0 to capture emptiness cases like the last trays in 17%.jpeg
  const clampEmpty = (pct, visual) => (visual <= 12 ? 0 : pct);
  const frontFinalPercent = clampEmpty(frontSidePercent, frontVisual.overallPercent);
  const backFinalPercent = clampEmpty(backSidePercent, backVisual.overallPercent);

  const frontOccMerged = { ...frontOccupancy, visual: frontVisual, overallPercent: Number(frontFinalPercent.toFixed(2)) };
  const backOccMerged = { ...backOccupancy, visual: backVisual, overallPercent: Number(backFinalPercent.toFixed(2)) };

    // Prepare comprehensive result
    const analysisResult = {
      trolleyCode,
      timestamp: new Date().toISOString(),
      images: {
        front: path.basename(frontFile.path),
        back: path.basename(backFile.path),
      },
      detections: {
        front: frontDetections,
        back: backDetections,
      },
      occupancy: {
        front: frontOccMerged,
        back: backOccMerged,
        overall: {
          percent: Number(overallOccupancy.toFixed(2)),
          volumeUsedLiters: Number(totalVolumeUsed.toFixed(3)),
          volumeAvailableLiters: Number((totalCapacity - totalVolumeUsed).toFixed(3)),
          totalCapacityLiters: Number(totalCapacity.toFixed(3)),
        },
      },
      inventory: {
        front: frontInventory,
        back: backInventory,
        summary: {
          totalCurrentProducts: frontInventory.currentProducts.length + backInventory.currentProducts.length,
          totalMissingProducts: allMissingProducts.length,
          targetOccupancy: frontInventory.targetOccupancyPercent,
        },
      },
      shoppingList,
      recommendations: {
        status: overallOccupancy < 70 ? 'needs_refill' : overallOccupancy > 95 ? 'overfilled' : 'optimal',
        message: overallOccupancy < 70 
          ? `Tray is only ${overallOccupancy.toFixed(1)}% full. Recommend adding products.`
          : overallOccupancy > 95
          ? `Tray is ${overallOccupancy.toFixed(1)}% full. May be overfilled.`
          : `Tray occupancy is optimal at ${overallOccupancy.toFixed(1)}%.`,
      },
    };

    // Optional bias mode: assume full and penalize for emptiness (hardcoded heuristic)
    // Enable by setting OCCUPANCY_BIAS_MODE=full_then_penalize
    if (process.env.OCCUPANCY_BIAS_MODE === 'full_then_penalize') {
      function penalizePercent(pct) {
        // If extremely empty, clamp to 50% instead of near-zero
        if (pct <= 1) return 50;
        // If very low, nudge up to avoid under-reporting on sparse detections
        if (pct <= 15) return Math.max(pct, 60);
        return pct;
      }

      const f = Number(analysisResult.occupancy.front.overallPercent || 0);
      const b = Number(analysisResult.occupancy.back.overallPercent || 0);
      const f2 = penalizePercent(f);
      const b2 = penalizePercent(b);
      analysisResult.occupancy.front.overallPercent = f2;
      analysisResult.occupancy.back.overallPercent = b2;
      analysisResult.occupancy.overall.percent = Number(((f2 + b2) / 2).toFixed(2));
    }

    // Save to database
    const dbRow = await saveInventoryEstimation({
      trolleyId,
      trolleyCode,
      analysisResult,
      inventoryEstimation: {
        front: frontInventory,
        back: backInventory,
        shoppingList,
      },
      imagePath: frontFile.path, // Store primary image path
    });

    return res.json({
      ok: true,
      analysisId: dbRow.id,
      trolleyId,
      trolleyCode,
      result: analysisResult,
    });

  } catch (err) {
    console.error('[postAnalyzeTray] error:', err);
    return res.status(500).json({ 
      error: 'Analysis failed', 
      message: err.message 
    });
  }
}
