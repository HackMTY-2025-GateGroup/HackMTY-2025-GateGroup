/**
 * Visual Occupancy Service
 * Estimates tray occupancy by analyzing visual fill level (0-10 scale)
 * Uses image analysis to detect the filling level of containers
 * 
 * Score interpretation:
 * - 0-1: Empty (less than 5% filled)
 * - 1-3: Sparse (5-20% filled)
 * - 3-5: Partially filled (20-45% filled)
 * - 5-7: Good fill (45-70% filled)
 * - 7-9: Nearly full (70-95% filled)
 * - 9-10: Full/Overflowing (95%+ filled)
 */

export function estimateVisualOccupancy(imagePath) {
  /**
   * Note: This is a placeholder for future implementation.
   * In production, integrate with OpenCV or TensorFlow for image analysis:
   * 
   * 1. Load image from imagePath
   * 2. Apply color segmentation to identify products
   * 3. Detect the fill line/boundary in the tray
   * 4. Calculate percentage of filled space
   * 5. Convert to 0-10 scale
   * 
   * Example Python implementation (to integrate via spawn):
   * ```python
   * import cv2
   * import numpy as np
   * 
   * def analyze_fill_level(image_path):
   *     img = cv2.imread(image_path)
   *     
   *     # Convert to HSV for better color detection
   *     hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
   *     
   *     # Create mask for products (adjust ranges for your items)
   *     lower = np.array([0, 0, 0])
   *     upper = np.array([180, 255, 200])
   *     mask = cv2.inRange(hsv, lower, upper)
   *     
   *     # Find contours
   *     contours, _ = cv2.findContours(mask, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
   *     
   *     # Calculate filled area
   *     total_area = img.shape[0] * img.shape[1]
   *     filled_area = sum(cv2.contourArea(c) for c in contours)
   *     occupancy_percent = (filled_area / total_area) * 100
   *     
   *     # Convert to 0-10 scale
   *     scale_0_10 = (occupancy_percent / 100) * 10
   *     return min(10, max(0, scale_0_10))
   * ```
   */
  
  return {
    supported: false,
    score: 0,
    percent: 0,
    reason: 'Visual occupancy detection not yet implemented',
  };
}

/**
 * Heuristic visual scoring based on detection count and confidence
 * When detections don't cover the full tray, estimate fill level
 */
export function estimateVisualFromDetections(detections, frameWidth, frameHeight) {
  if (!detections || detections.length === 0) {
    return {
      score: 0,
      percent: 0,
      category: 'empty',
    };
  }

  // Calculate bounding box coverage
  let totalBboxArea = 0;
  const frameArea = frameWidth * frameHeight;
  
  for (const det of detections) {
    if (det.bbox && Array.isArray(det.bbox)) {
      const [, , w, h] = det.bbox;
      totalBboxArea += w * h;
    }
  }

  const coveragePercent = (totalBboxArea / frameArea) * 100;
  
  // Confidence-weighted score (higher confidence = fuller tray)
  let confidenceWeight = 0;
  for (const det of detections) {
    confidenceWeight += (det.score || 0.5);
  }
  confidenceWeight = Math.min(1, confidenceWeight / detections.length);

  // Combined heuristic: coverage + confidence
  // Assumes denser detections = fuller tray
  const heuristicPercent = Math.min(100, coveragePercent * 1.2 + confidenceWeight * 15);
  
  // Convert to 0-10 scale
  const score = (heuristicPercent / 100) * 10;
  
  const category = score < 2 ? 'empty' 
    : score < 4 ? 'sparse'
    : score < 6 ? 'partial'
    : score < 8 ? 'good'
    : score < 9.5 ? 'nearly_full'
    : 'full';

  return {
    score: Number(score.toFixed(2)),
    percent: Number(heuristicPercent.toFixed(2)),
    category,
    detectionCount: detections.length,
    confidenceAvg: Number(confidenceWeight.toFixed(3)),
  };
}

/**
 * Estimate fill level by analyzing the vertical position of detected items
 * Items packed towards the top indicate full container
 */
export function estimateFillByVerticalPosition(detections, frameHeight) {
  if (!detections || detections.length === 0) {
    return 0;
  }

  // Analyze Y coordinates of detections
  let topThirdCount = 0;    // y < frameHeight * 0.33
  let middleThirdCount = 0; // frameHeight * 0.33 <= y < frameHeight * 0.66
  let bottomThirdCount = 0; // y >= frameHeight * 0.66

  for (const det of detections) {
    if (det.bbox && Array.isArray(det.bbox)) {
      const [, y, , h] = det.bbox;
      const centerY = y + h / 2;
      
      if (centerY < frameHeight * 0.33) topThirdCount++;
      else if (centerY < frameHeight * 0.66) middleThirdCount++;
      else bottomThirdCount++;
    }
  }

  // Scoring: items distributed throughout = filled
  // Items only at bottom = partially filled
  // Items only at top = full/compressed
  const total = topThirdCount + middleThirdCount + bottomThirdCount;
  
  if (topThirdCount > total * 0.4) {
    // Many items at top = likely full/compressed
    return 9;
  } else if (middleThirdCount > topThirdCount && bottomThirdCount > middleThirdCount) {
    // Distributed = good fill
    return 7;
  } else if (bottomThirdCount > middleThirdCount) {
    // Heavy bottom = sparse/partial
    return 4;
  }
  
  return 5; // neutral
}

export default {
  estimateVisualOccupancy,
  estimateVisualFromDetections,
  estimateFillByVerticalPosition,
};
