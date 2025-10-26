import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { postOccupancy, postDetections, postImage, getLatest, getSpec, listAllSpecs, postEstimate, postEstimateVolume, postEstimateDouble, postAnalyzeTray } from '../controllers/occupancyController.js';

const router = Router();

// 1) Client already has occupancyPercent (from YOLO/MLX on device)
router.post('/', postOccupancy);

// 2) Client sends raw detections; server computes occupancy
router.post('/detections', postDetections);

// 3) Client uploads an image; server stores it and optionally runs server-side inference
router.post('/image', upload.single('image'), postImage);

// 4) Latest occupancy by trolley
router.get('/latest', getLatest);

// 5) Specs
router.get('/specs', listAllSpecs);
router.get('/specs/:name', getSpec);

// 6) Compute tray occupancy with a spec
router.post('/estimate', postEstimate);

// 7) Volume-based tray utilization (liters)
router.post('/estimate-volume', postEstimateVolume);

// 8) Double-sided rows (front/back)
router.post('/estimate-doubleside', postEstimateDouble);

// 9) Comprehensive tray analysis with inventory estimation (front + back images)
router.post('/analyze-tray', upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'back', maxCount: 1 }
]), postAnalyzeTray);

export default router;
