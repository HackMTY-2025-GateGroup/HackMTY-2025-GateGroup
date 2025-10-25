// Optional server-side YOLO inference using onnxruntime-node
// Kept minimal: returns { supported: boolean, detections: [] }

let ort = null;
try {
  // Defer require so project can run without native dependency
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  ort = await import('onnxruntime-node');
} catch (e) {
  // not installed; we will mark unsupported below
}

export async function detectOnServer(imagePath) {
  const modelPath = process.env.YOLO_MODEL_PATH;
  if (!ort || !modelPath) {
    return {
      supported: false,
      reason: !ort ? 'onnxruntime-node not installed' : 'YOLO_MODEL_PATH not set',
      detections: [],
    };
  }
  // TODO: Implement pre/post-processing for YOLO ONNX model
  // For now, return unsupported to avoid confusion
  return { supported: false, reason: 'Not implemented', detections: [] };
}
