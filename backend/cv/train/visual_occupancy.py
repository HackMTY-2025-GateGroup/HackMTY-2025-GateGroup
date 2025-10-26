#!/usr/bin/env python3
"""
Visual Occupancy Detection
Analyzes tray/drawer fill level using computer vision techniques.

Returns a 0-10 occupancy score based on:
1. Contour detection of filled products
2. Vertical position analysis (items packed to top = full)
3. Color histogram analysis to detect empty space
"""

import argparse
import json
import sys
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError:
    raise SystemExit("OpenCV required. Run: pip install opencv-python numpy")


def analyze_fill_level(image_path, debug=False):
    """
    Analyze the fill level of a tray/drawer from image.
    Returns a score from 0 (empty) to 10 (full).
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")
    
    height, width = img.shape[:2]
    
    # Convert to HSV for better color-based segmentation
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Detect non-white (product) areas
    # Products are generally darker; white space indicates empty drawer
    # Create mask for non-white pixels
    lower_white = np.array([0, 0, 200])  # Low saturation, high value = white
    upper_white = np.array([180, 30, 255])
    
    white_mask = cv2.inRange(hsv, lower_white, upper_white)
    
    # Invert: 1 = product, 0 = empty/white
    product_mask = cv2.bitwise_not(white_mask)
    
    # Morphological operations to clean up noise
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    product_mask = cv2.morphologyEx(product_mask, cv2.MORPH_CLOSE, kernel)
    product_mask = cv2.morphologyEx(product_mask, cv2.MORPH_OPEN, kernel)
    
    # Calculate fill percentage
    total_pixels = height * width
    filled_pixels = cv2.countNonZero(product_mask)
    fill_percent = (filled_pixels / total_pixels) * 100
    
    # Analyze vertical distribution (items at top = compressed/full)
    top_third_pixels = cv2.countNonZero(product_mask[0:height//3, :])
    middle_third_pixels = cv2.countNonZero(product_mask[height//3:2*height//3, :])
    bottom_third_pixels = cv2.countNonZero(product_mask[2*height//3:, :])
    
    # Vertical distribution score
    # If products are mostly at top, it's compressed/full (score = 9-10)
    # If distributed, it's partially full (score = 5-7)
    # If mostly at bottom, it's sparse (score = 2-4)
    total_filled = top_third_pixels + middle_third_pixels + bottom_third_pixels
    
    if total_filled == 0:
        vertical_score = 0
    elif top_third_pixels > total_filled * 0.45:
        # Many items at top = likely fully compressed
        vertical_score = 9
    elif middle_third_pixels > max(top_third_pixels, bottom_third_pixels):
        # Balanced distribution = good fill
        vertical_score = 7
    elif bottom_third_pixels > middle_third_pixels:
        # Heavy bottom = sparse/partial
        vertical_score = 4
    else:
        vertical_score = 5
    
    # Convert fill percentage to 0-10 scale
    # 0-5% = 0, 5-15% = 1, 15-25% = 2, etc.
    fill_score = min(10, (fill_percent / 100) * 10)
    
    # Combine scores: weight fill percentage more heavily
    # Fill percentage (70%) + vertical distribution (30%)
    combined_score = (fill_score * 0.7) + (vertical_score * 0.3)
    final_score = min(10, max(0, combined_score))
    
    result = {
        "fill_percent": round(fill_percent, 2),
        "fill_score": round(fill_score, 2),
        "vertical_score": vertical_score,
        "combined_score": round(combined_score, 2),
        "final_score": round(final_score, 2),
        "category": categorize_score(final_score),
        "detail": {
            "total_pixels": total_pixels,
            "filled_pixels": filled_pixels,
            "vertical_distribution": {
                "top_third_percent": round((top_third_pixels / max(1, total_filled)) * 100, 2) if total_filled > 0 else 0,
                "middle_third_percent": round((middle_third_pixels / max(1, total_filled)) * 100, 2) if total_filled > 0 else 0,
                "bottom_third_percent": round((bottom_third_pixels / max(1, total_filled)) * 100, 2) if total_filled > 0 else 0,
            }
        }
    }
    
    if debug:
        # Save debug images
        cv2.imwrite(str(Path(image_path).with_stem(Path(image_path).stem + "_product_mask")), product_mask)
    
    return result


def categorize_score(score):
    """Categorize occupancy score"""
    if score < 1:
        return "empty"
    elif score < 3:
        return "sparse"
    elif score < 5:
        return "partial"
    elif score < 7:
        return "good"
    elif score < 9.5:
        return "nearly_full"
    else:
        return "full"


def main():
    parser = argparse.ArgumentParser(
        description="Analyze tray/drawer fill level using computer vision"
    )
    parser.add_argument("--image", type=str, required=True, help="Path to image file")
    parser.add_argument("--debug", action="store_true", help="Save debug images")
    
    args = parser.parse_args()
    
    if not Path(args.image).exists():
        print(json.dumps({"error": f"Image not found: {args.image}"}), file=sys.stderr)
        sys.exit(1)
    
    try:
        result = analyze_fill_level(args.image, debug=args.debug)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
