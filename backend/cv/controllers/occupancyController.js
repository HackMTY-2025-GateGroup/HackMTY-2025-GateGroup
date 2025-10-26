import { z } from 'zod';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { supabaseAdmin } from '../../config/supabase.js';
import { computeOccupancy, computeTrayOccupancy, computeTrayVolumes, computeDoubleSided } from '../services/occupancyService.js';
//import { computeTrayVisualOccupancy } from '../services/visualOccupancyService.js';
import { loadSpec, listSpecs } from '../services/specService.js';
import { detectOnServer, detectVisualOccupancy, estimateVisualOccupancyHeuristic, generateDetectionVisualization, enhanceDetectionsWithSmartCookieDetection } from '../services/yoloService.js';
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

    console.log('[postAnalyzeTray] Processing:', trolleyCode);

    // Resolve or create trolley
    let trolleyId = providedId;
    if (!trolleyId && trolleyCode) {
      const resolved = await resolveTrolleyId({ trolleyCode });
      trolleyId = resolved;
    }

    // If trolley doesn't exist, create it
    if (!trolleyId) {
      console.log('[postAnalyzeTray] Creating new trolley:', trolleyCode);
      const { data: newTrolley, error: trolleyError } = await supabaseAdmin
        .from('trolleys')
        .insert({ code: trolleyCode })
        .select('id')
        .maybeSingle();

      if (trolleyError || !newTrolley) {
        console.error('[postAnalyzeTray] Error creating trolley:', trolleyError);
        return res.status(500).json({ 
          error: 'Failed to create trolley',
          message: trolleyError?.message || 'Unknown error'
        });
      }
      trolleyId = newTrolley.id;
    }

    // Load spec
    let spec;
    try {
      spec = await loadSpec(specName);
    } catch (e) {
      console.error('[postAnalyzeTray] Spec not found:', specName);
      return res.status(404).json({ error: 'Spec not found' });
    }

    // Run YOLO inference on both images IN PARALLEL
    console.log('[postAnalyzeTray] Running YOLO inference...');
    const [frontInference, backInference] = await Promise.all([
      detectOnServer(frontFile.path),
      detectOnServer(backFile.path),
    ]);

    if (!frontInference.supported || !backInference.supported) {
      console.warn('[postAnalyzeTray] YOLO not supported', {
        front: frontInference.reason,
        back: backInference.reason
      });
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

    console.log('[postAnalyzeTray] Detections - Front:', frontDetections.length, 'Back:', backDetections.length);

    // ENHANCEMENT: Use smart cookie detection to enhance YOLO results
    console.log('[postAnalyzeTray] Enhancing detections with smart cookie detection...');
    const [frontEnhanced, backEnhanced] = await Promise.allSettled([
      enhanceDetectionsWithSmartCookieDetection(frontFile.path, frontDetections),
      enhanceDetectionsWithSmartCookieDetection(backFile.path, backDetections)
    ]);

    // Use enhanced detections if successful, otherwise fallback to original
    const finalFrontDetections = frontEnhanced.status === 'fulfilled' && frontEnhanced.value.success 
      ? frontEnhanced.value.detections 
      : frontDetections;
    
    const finalBackDetections = backEnhanced.status === 'fulfilled' && backEnhanced.value.success 
      ? backEnhanced.value.detections 
      : backDetections;

    console.log('[postAnalyzeTray] Enhanced Detections - Front:', finalFrontDetections.length, 'Back:', finalBackDetections.length);

    // ENHANCEMENT: Calculate visual occupancy for enhanced accuracy
    console.log('[postAnalyzeTray] Computing visual occupancy (fill level analysis)...');
    const frontVisualResult = estimateVisualOccupancyHeuristic(
      finalFrontDetections,
      frontInference.frame?.w || 640,
      frontInference.frame?.h || 480
    );
    const backVisualResult = estimateVisualOccupancyHeuristic(
      finalBackDetections,
      backInference.frame?.w || 640,
      backInference.frame?.h || 480
    );

    console.log('[postAnalyzeTray] Front Visual Score:', frontVisualResult.visual.final_score, 'Category:', frontVisualResult.visual.category);
    console.log('[postAnalyzeTray] Back Visual Score:', backVisualResult.visual.final_score, 'Category:', backVisualResult.visual.category);

    // Calculate occupancy for both sides using YOLO detections
    console.log('[postAnalyzeTray] Computing occupancy...');
    const frontOccupancy = await computeDoubleSided({
      detections: finalFrontDetections.map(d => ({ ...d, frame: frontInference.frame })),
      spec,
      side: 'front',
    });

    const backOccupancy = await computeDoubleSided({
      detections: finalBackDetections.map(d => ({ ...d, frame: backInference.frame })),
      spec,
      side: 'back',
    });

    // Visual occupancy fallback/boost using pixel statistics
    const [frontVisual, backVisual] = await Promise.all([
      computeTrayVisualOccupancy({ imagePath: frontFile.path, spec: { ...spec, trays: spec.trays.filter(t => (t.side||'front')==='front') } }),
      computeTrayVisualOccupancy({ imagePath: backFile.path,  spec: { ...spec, trays: spec.trays.filter(t => (t.side||'front')==='back') } }),
    ]);

    // Calculate inventory estimation for both sides
    console.log('[postAnalyzeTray] Computing inventory...');
    const frontInventory = calculateMissingProducts({
      detections: finalFrontDetections,
      spec,
      side: 'front',
    });

    const backInventory = calculateMissingProducts({
      detections: finalBackDetections,
      spec,
      side: 'back',
    });

    // Merge results for overall metrics
    const frontOccupancyPercent = Number(frontOccupancy.overallPercent || 0);
    const backOccupancyPercent = Number(backOccupancy.overallPercent || 0);
    const overallOccupancy = (frontOccupancyPercent + backOccupancyPercent) / 2;

    // Combine missing products from both sides
    const allMissingProducts = [
      ...frontInventory.missingProducts.map(p => ({ ...p, side: 'front' })),
      ...backInventory.missingProducts.map(p => ({ ...p, side: 'back' })),
    ];

    // Generate shopping list
    const shoppingList = generateShoppingList(allMissingProducts);

    // Build clean result object
    const analysisResult = {
      trolleyCode,
      trolleyId,
      timestamp: new Date().toISOString(),
      occupancy: {
        front: { 
          overallPercent: Number(frontOccupancyPercent.toFixed(2)),
          visualScore: frontVisualResult.visual.final_score,
          visualCategory: frontVisualResult.visual.category,
          fillPercent: frontVisualResult.visual.fill_percent,
          snackPercent: frontVisualResult.visual.snack_percent,
        },
        back: { 
          overallPercent: Number(backOccupancyPercent.toFixed(2)),
          visualScore: backVisualResult.visual.final_score,
          visualCategory: backVisualResult.visual.category,
          fillPercent: backVisualResult.visual.fill_percent,
          snackPercent: backVisualResult.visual.snack_percent,
        },
        overall: {
          percent: Number(overallOccupancy.toFixed(2)),
          visualScore: Number(((frontVisualResult.visual.final_score + backVisualResult.visual.final_score) / 2).toFixed(2)),
          volumeUsedLiters: Number((frontInventory.volumeUsedLiters + backInventory.volumeUsedLiters).toFixed(3)),
          volumeAvailableLiters: Number((frontInventory.volumeAvailableLiters + backInventory.volumeAvailableLiters).toFixed(3)),
          totalCapacityLiters: Number((frontInventory.trayCapacityLiters + backInventory.trayCapacityLiters).toFixed(3)),
        },
      },
      inventory: {
        front: { 
          currentProducts: (frontInventory.currentProducts || []).slice(0, 100),
          count: frontInventory.currentProducts?.length || 0,
        },
        back: { 
          currentProducts: (backInventory.currentProducts || []).slice(0, 100),
          count: backInventory.currentProducts?.length || 0,
        },
      },
      shoppingList: shoppingList.slice(0, 50),
      recommendations: {
        status: overallOccupancy < 70 ? 'needs_refill' : overallOccupancy > 95 ? 'overfilled' : 'optimal',
        message: overallOccupancy < 70 
          ? `Tray is only ${overallOccupancy.toFixed(1)}% full. Recommend adding products.`
          : overallOccupancy > 95
          ? `Tray is ${overallOccupancy.toFixed(1)}% full. May be overfilled.`
          : `Tray occupancy is optimal at ${overallOccupancy.toFixed(1)}%.`,
      },
    };

    // Save to database with complete analysis
    console.log('[postAnalyzeTray] Saving to database...');
    const dbRow = await saveInventoryEstimation({
      trolleyId,
      trolleyCode,
      analysisResult,
      inventoryEstimation: {
        front: frontInventory,
        back: backInventory,
        shoppingList,
      },
      imagePath: frontFile.path,
    });

    console.log('[postAnalyzeTray] ✓ Saved with ID:', dbRow.id);

    // Generate detection visualization images
    console.log('[postAnalyzeTray] Generating detection visualizations...');
    const [frontViz, backViz] = await Promise.allSettled([
      generateDetectionVisualization(
        frontFile.path,
        finalFrontDetections,
        dbRow.id,
        frontInference.frame
      ),
      generateDetectionVisualization(
        backFile.path,
        finalBackDetections,
        dbRow.id,
        backInference.frame
      )
    ]);

    // Add visualization paths to result
    if (frontViz.status === 'fulfilled' && frontViz.value.success) {
      analysisResult.images = analysisResult.images || {};
      analysisResult.images.front = frontViz.value.imagePath;
      console.log('[postAnalyzeTray] ✓ Front visualization:', frontViz.value.imagePath);
    }
    if (backViz.status === 'fulfilled' && backViz.value.success) {
      analysisResult.images = analysisResult.images || {};
      analysisResult.images.back = backViz.value.imagePath;
      console.log('[postAnalyzeTray] ✓ Back visualization:', backViz.value.imagePath);
    }

    return res.json({
      ok: true,
      analysisId: dbRow.id,
      trolleyId,
      trolleyCode,
      result: analysisResult,
    });

  } catch (err) {
    console.error('[postAnalyzeTray] ✗ Error:', err.message);
    console.error('[postAnalyzeTray] Stack:', err.stack);
    return res.status(500).json({ 
      error: 'Analysis failed', 
      message: err.message,
    });
  }
}