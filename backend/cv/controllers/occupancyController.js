import { z } from 'zod';
import path from 'node:path';
import { supabaseAdmin } from '../../config/supabase.js';
import { computeOccupancy } from '../services/occupancyService.js';
import { detectOnServer } from '../services/yoloService.js';

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
  const { data, error } = await supabaseAdmin
    .from('trolleys')
    .select('id')
    .eq('code', trolleyCode)
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
