// Optional server-side YOLO inference using onnxruntime-node
// Note: Client-side inference (Web with onnxruntime-web or iOS with MLX) is preferred.
// This service is a stub that checks for a model and returns 501 if not configured.

let ort = null;
try {
  // Optional dependency
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  ort = await import('onnxruntime-node');
} catch (e) {
  // onnxruntime-node not installed; keep null
}

export async function detectOnServer(_imagePath) {
  const modelPath = process.env.YOLO_MODEL_PATH;
  if (!ort || !modelPath) {
    return {
      supported: false,
      reason: !ort ? 'onnxruntime-node not installed' : 'YOLO_MODEL_PATH not set',
      detections: [],
    };
  }

  // TODO: Implement pre/post-processing for YOLO ONNX model
  // For now, indicate not implemented.
  return {
    supported: true,
    reason: 'Model configured but inference not implemented in this starter',
    detections: [],
  };
}
