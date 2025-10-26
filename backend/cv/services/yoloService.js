// Server-side YOLO inference by invoking the provided Python script (quick_infer.py)
// Returns: { supported: boolean, detections: [], frame?:{w,h}, reason?:string }
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveWeightsPath() {
  // Prefer env, fallback to bundled yolov8n.pt in cv/train
  const envPath = process.env.YOLO_WEIGHTS || process.env.YOLO_MODEL_PATH; // support either var name
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return path.resolve(__dirname, '..', 'train', 'yolov8n.pt');
}

function runPythonWithBin(pyBin, args, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(pyBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const to = setTimeout(() => {
      if (!finished) {
        finished = true;
        try { proc.kill('SIGKILL'); } catch {}
        reject(new Error('YOLO inference timed out'));
      }
    }, timeoutMs);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (e) => {
      if (finished) return;
      finished = true;
      clearTimeout(to);
      reject(e);
    });
    proc.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(to);
      if (code !== 0) {
        const err = new Error(`YOLO script exited with code ${code}: ${stderr || stdout}`);
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function detectOnServer(imagePath) {
  try {
    const weights = resolveWeightsPath();
    const script = path.resolve(__dirname, '..', 'train', 'quick_infer.py');
    const imgsz = String(process.env.YOLO_IMGSZ || '960');
    const conf = String(process.env.YOLO_CONF || '0.15');
    const iou = String(process.env.YOLO_IOU || '0.6');
    const baseArgs = [script, '--weights', weights, '--image', imagePath, '--imgsz', imgsz, '--conf', conf, '--iou', iou];

    // Try multiple Python executables for cross-platform support
    const candidates = [];
    if (process.env.PYTHON_BIN) candidates.push({ bin: process.env.PYTHON_BIN, args: baseArgs });
    if (process.platform === 'win32') {
      candidates.push({ bin: 'python', args: baseArgs });
      candidates.push({ bin: 'py', args: baseArgs });
      candidates.push({ bin: 'py', args: ['-3', ...baseArgs] });
    } else {
      candidates.push({ bin: 'python3', args: baseArgs });
      candidates.push({ bin: 'python', args: baseArgs });
    }

    let stdout = null;
    let lastError = null;
    for (const cand of candidates) {
      try {
        const out = await runPythonWithBin(cand.bin, cand.args, { timeoutMs: 120000 });
        stdout = out.stdout;
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    if (!stdout) {
      const reason = lastError?.message || 'Python not available or YOLO error';
      return { supported: false, reason, detections: [] };
    }

    // quick_infer.py prints a JSON object: { frame:{w,h}, detections:[{class,score,bbox,frame}] }
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch (e) {
      // Attempt to extract JSON block if logs slipped in
      const start = stdout.indexOf('{');
      const end = stdout.lastIndexOf('}');
      if (start >= 0 && end > start) parsed = JSON.parse(stdout.slice(start, end + 1));
      else throw e;
    }

    return {
      supported: true,
      detections: Array.isArray(parsed?.detections) ? parsed.detections : [],
      frame: parsed?.frame || null,
    };
  } catch (e) {
    return { supported: false, reason: e.message || 'YOLO error', detections: [] };
  }
}

/**
 * Detect occupancy using visual fill level analysis
 * Runs the visual_occupancy.py Python script
 * Returns: { supported: boolean, visual: {score, percent, category, ...}, reason?: string }
 */
export async function detectVisualOccupancy(imagePath) {
  try {
    const script = path.resolve(__dirname, '..', 'train', 'visual_occupancy.py');
    const baseArgs = [script, '--image', imagePath];

    const candidates = [];
    if (process.env.PYTHON_BIN) candidates.push({ bin: process.env.PYTHON_BIN, args: baseArgs });
    if (process.platform === 'win32') {
      candidates.push({ bin: 'python', args: baseArgs });
      candidates.push({ bin: 'py', args: baseArgs });
      candidates.push({ bin: 'py', args: ['-3', ...baseArgs] });
    } else {
      candidates.push({ bin: 'python3', args: baseArgs });
      candidates.push({ bin: 'python', args: baseArgs });
    }

    let stdout = null;
    let lastError = null;

    for (const cand of candidates) {
      try {
        const out = await runPythonWithBin(cand.bin, cand.args, { timeoutMs: 60000 });
        stdout = out.stdout;
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    if (!stdout) {
      const reason = lastError?.message || 'Python not available';
      return { supported: false, reason, visual: null };
    }

    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch (e) {
      const start = stdout.indexOf('{');
      const end = stdout.lastIndexOf('}');
      if (start >= 0 && end > start) parsed = JSON.parse(stdout.slice(start, end + 1));
      else throw e;
    }

    // Check for errors in the response
    if (parsed?.error) {
      return { supported: false, reason: parsed.error, visual: null };
    }

    return {
      supported: true,
      visual: parsed,
    };
  } catch (e) {
    return { supported: false, reason: e.message || 'Visual occupancy error', visual: null };
  }
}

/**
 * Generate visualization image with bounding boxes
 * Calls Python script to draw detections on image
 * Only shows detections INSIDE drawers (red zones)
 * Ignores yellow zones (outside drawers)
 */
export async function generateDetectionVisualization(imagePath, detections, analysisId, frameInfo) {
  try {
    // Create output directory
    const outputDir = path.resolve(process.cwd(), 'analysis_output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate output paths
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(imagePath, path.extname(imagePath));
    const outputImagePath = path.join(outputDir, `${analysisId}_${baseName}_detections.jpg`);
    const detectionsJsonPath = path.join(outputDir, `${analysisId}_${baseName}_detections.json`);
    
    // Save detections to JSON
    const detectionData = {
      analysisId,
      timestamp,
      detections,
      frame: frameInfo || { w: 640, h: 480 }
    };
    fs.writeFileSync(detectionsJsonPath, JSON.stringify(detectionData, null, 2));
    
    // Call Python script to draw boxes
    const drawScript = path.resolve(__dirname, '..', 'train', 'draw_detections.py');
    const pyBin = process.env.PYTHON_BIN || 'python';
    
    await runPythonWithBin(pyBin, [
      drawScript,
      imagePath,
      detectionsJsonPath,
      outputImagePath,
      analysisId
    ], { timeoutMs: 10000 });
    
    console.log(`[generateDetectionVisualization] ✓ Saved: ${outputImagePath}`);
    
    // Return relative path for API response
    return {
      success: true,
      imagePath: `/analysis/${path.basename(outputImagePath)}`,
      fullPath: outputImagePath
    };
    
  } catch (error) {
    console.error('[generateDetectionVisualization] Error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Lightweight visual occupancy estimation using detection heuristics
 * No external dependencies required - works with YOLO detection results
 * Estimates fill level 0-10 based on detection patterns and spatial distribution
 * 
 * KEY INSIGHT: A FULL tray has:
 * 1. Items packed at the TOP (vertical score ~9)
 * 2. Multiple snacks/products detected (snack_percent high)
 * 3. Dense distribution across the frame
 */
export function estimateVisualOccupancyHeuristic(detections, frameWidth, frameHeight) {
  if (!detections || detections.length === 0) {
    return {
      supported: true,
      visual: {
        final_score: 0,
        category: 'empty',
        fill_percent: 0,
        snack_percent: 0,
        detail: 'No detections - empty tray'
      }
    };
  }

  // Analyze detection distribution
  let topThird = 0;
  let middleThird = 0;
  let bottomThird = 0;
  let totalArea = 0;
  let snackArea = 0;  // Items we identify as snacks/products
  let colorfulItems = 0;  // Bottles, cans

  for (const det of detections) {
    if (!det.bbox) continue;
    
    const [x, y, w, h] = det.bbox;
    const area = w * h;
    totalArea += area;
    
    // Vertical distribution
    const centerY = y + h / 2;
    if (centerY < frameHeight * 0.33) {
      topThird += area;
    } else if (centerY < frameHeight * 0.66) {
      middleThird += area;
    } else {
      bottomThird += area;
    }

    // Snack detection heuristic (Coca, colorful items, galletas)
    const isSnack = det.class && (
      det.class.toLowerCase().includes('coke') || 
      det.class.toLowerCase().includes('coca') ||
      det.class.toLowerCase().includes('galleta') ||
      det.class.toLowerCase().includes('snack') ||
      det.class.toLowerCase().includes('cookie')
    );
    
    const isBottleOrCan = det.class && (
      det.class.toLowerCase().includes('bottle') ||
      det.class.toLowerCase().includes('can')
    );

    if (isSnack) snackArea += area;
    if (isBottleOrCan) colorfulItems += area;
  }

  // Calculate percentages with better scaling
  const frameArea = frameWidth * frameHeight;
  
  // Fill percent: how much area is occupied (boosted)
  const fillPercent = Math.min(100, (totalArea / frameArea) * 100 * 1.8);
  
  // Snack percent: focused on identified snacks
  const snackPercent = snackArea > 0 ? Math.min(100, (snackArea / frameArea) * 100 * 2.5) : 0;
  
  // Product detection bonus: more items = fuller
  const detectionBonus = Math.min(10, detections.length);

  // Vertical score: CRITICAL - where are items packed?
  let verticalScore = 5;
  let topRatio = 0;
  
  if (topThird + middleThird + bottomThird > 0) {
    topRatio = topThird / (topThird + middleThird + bottomThird);
  }
  
  if (topRatio > 0.5) {
    // Items packed at top = FULL
    verticalScore = 9.5;
  } else if (topRatio > 0.35) {
    // Mostly top with some middle
    verticalScore = 8;
  } else if (bottomThird > topThird * 2) {
    // Gravity settled = sparse
    verticalScore = 2;
  } else if (middleThird > topThird && middleThird > bottomThird) {
    // Balanced
    verticalScore = 6.5;
  } else {
    verticalScore = 5;
  }

  // Line detection heuristic: estimate fill line position
  const avgDetectionY = (topThird > 0 || middleThird > 0 || bottomThird > 0) 
    ? (topThird * 0.17 + middleThird * 0.5 + bottomThird * 0.83) / (topThird + middleThird + bottomThird)
    : 0.5;
  
  const fillLineScore = Math.min(10, ((1 - avgDetectionY) * 10));

  // Scoring components
  const fill_score = Math.min(10, (fillPercent / 100) * 10);
  const vert_weighted = (verticalScore / 10) * 10;
  const line_weighted = (fillLineScore / 10) * 10;
  const snack_bonus = Math.min(1.8, snackPercent / 15) * 10;
  const detection_bonus = (detectionBonus / 10) * 10;

  // IMPROVED FORMULA: Prioritize vertical distribution (fullness indicator)
  const combined_score = (
    vert_weighted * 0.35 +    // 35% - CRITICAL: items at top = full
    fill_score * 0.30 +       // 30% - area coverage
    snack_bonus * 0.20 +      // 20% - snack/galleta detection
    line_weighted * 0.10 +    // 10% - line position
    detection_bonus * 0.05    // 5% - bonus for multiple items
  );

  const final_score = Math.min(10, Math.max(0, combined_score));

  // Categorize
  let category = 'empty';
  if (final_score < 1) category = 'empty';
  else if (final_score < 3) category = 'sparse';
  else if (final_score < 5) category = 'partial';
  else if (final_score < 7) category = 'good';
  else if (final_score < 9) category = 'nearly_full';
  else category = 'full';

  return {
    supported: true,
    visual: {
      final_score: Math.round(final_score * 100) / 100,
      category,
      fill_percent: Math.round(fillPercent * 100) / 100,
      snack_percent: Math.round(snackPercent * 100) / 100,
      vertical_score: Math.round(verticalScore * 100) / 100,
      fill_line_score: Math.round(fillLineScore * 100) / 100,
      detection_count: detections.length,
      topRatio: Math.round(topRatio * 100) / 100,
      detail: `${detections.length} items detected, ${snackPercent.toFixed(0)}% appear to be snacks/galletas. Items packed at top: ${Math.round(topRatio * 100)}%`
    }
  };
}