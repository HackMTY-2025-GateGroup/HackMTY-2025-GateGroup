// Server-side YOLO inference by invoking the provided Python script (quick_infer.py)
// Returns: { supported: boolean, detections: [], frame?:{w,h}, reason?:string }
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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