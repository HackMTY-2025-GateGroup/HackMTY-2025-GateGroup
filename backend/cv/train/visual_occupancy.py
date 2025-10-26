#!/usr/bin/env python3
"""
Enhanced Visual Occupancy Detection
Detects fill level using multiple methods:
1. Product pixel detection (non-white areas)
2. Edge/boundary detection to find fill lines
3. Vertical distribution analysis
4. Color-based snack/cookie detection
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
    
    Methods used:
    1. Color-based product detection (darker areas = products)
    2. Edge detection to find boundaries
    3. Vertical distribution analysis
    4. Cookie/snack color patterns
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image: {image_path}")
    
    height, width = img.shape[:2]
    original_img = img.copy()
    
    # === Method 1: Non-white pixel detection ===
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    
    # Detect white (empty space)
    lower_white = np.array([0, 0, 200])
    upper_white = np.array([180, 30, 255])
    white_mask = cv2.inRange(hsv, lower_white, upper_white)
    
    # Invert: product areas
    product_mask = cv2.bitwise_not(white_mask)
    
    # Morphological operations
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    product_mask = cv2.morphologyEx(product_mask, cv2.MORPH_CLOSE, kernel)
    product_mask = cv2.morphologyEx(product_mask, cv2.MORPH_OPEN, kernel)
    
    # === Method 2: Edge detection for fill line ===
    gray = cv2.cvtColor(original_img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    
    # Find horizontal lines (fill boundaries)
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=50, maxLineGap=10)
    fill_line_y = None
    if lines is not None:
        # Find the most prominent horizontal line (usually the fill boundary)
        horizontal_lines = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            # Check if it's roughly horizontal
            if abs(y2 - y1) < 20:
                horizontal_lines.append((y1 + y2) // 2)
        
        if horizontal_lines:
            # Use median to find most common fill level
            fill_line_y = int(np.median(horizontal_lines))
    
    # === Method 3: Color-based snack/cookie detection ===
    # Snacks/cookies often have reddish, brownish, or colorful packaging
    # We'll detect areas with high color saturation (not grayscale)
    lower_color = np.array([0, 50, 50])
    upper_color = np.array([180, 255, 255])
    color_mask = cv2.inRange(hsv, lower_color, upper_color)
    
    # Snack regions = colored + dark
    snack_mask = cv2.bitwise_and(product_mask, color_mask)
    
    # === Calculate fill percentages ===
    total_pixels = height * width
    filled_pixels = cv2.countNonZero(product_mask)
    snack_pixels = cv2.countNonZero(snack_mask)
    
    fill_percent = (filled_pixels / total_pixels) * 100
    snack_percent = (snack_pixels / total_pixels) * 100
    
    # === Vertical distribution ===
    top_third_pixels = cv2.countNonZero(product_mask[0:height//3, :])
    middle_third_pixels = cv2.countNonZero(product_mask[height//3:2*height//3, :])
    bottom_third_pixels = cv2.countNonZero(product_mask[2*height//3:, :])
    
    total_filled = top_third_pixels + middle_third_pixels + bottom_third_pixels
    
    if total_filled == 0:
        vertical_score = 0
    elif top_third_pixels > total_filled * 0.45:
        vertical_score = 9
    elif middle_third_pixels > max(top_third_pixels, bottom_third_pixels):
        vertical_score = 7
    elif bottom_third_pixels > middle_third_pixels:
        vertical_score = 4
    else:
        vertical_score = 5
    
    # === Fill line based scoring ===
    fill_line_score = 5  # default
    if fill_line_y is not None:
        # How far down is the fill line? (0 = empty, 1 = full)
        fill_ratio = 1 - (fill_line_y / height)  # Inverted because y=0 is top
        fill_line_score = min(10, fill_ratio * 10)
    
    # === Snack-specific bonus ===
    snack_bonus = min(1.5, snack_percent / 20)  # Boost score if snacks detected
    
    # === Combine scores ===
    # Primary: fill percentage (50%)
    fill_score = min(10, (fill_percent / 100) * 10)
    
    # Secondary: vertical distribution (20%)
    vert_weighted = (vertical_score / 10) * 10
    
    # Tertiary: fill line analysis (15%)
    line_weighted = (fill_line_score / 10) * 10
    
    # Bonus: snack detection (15%)
    snack_weighted = snack_bonus * 10
    
    # Final combined score - FIXED WEIGHTS
    combined_score = (
        fill_score * 0.50 +     # 50% - primary indicator
        vert_weighted * 0.20 +  # 20% - secondary
        line_weighted * 0.15 +  # 15% - tertiary
        snack_weighted * 0.15   # 15% - bonus
    )
    
    final_score = min(10, max(0, combined_score))
    
    result = {
        "fill_percent": round(fill_percent, 2),
        "snack_percent": round(snack_percent, 2),
        "fill_score": round(fill_score, 2),
        "vertical_score": vertical_score,
        "fill_line_score": round(fill_line_score, 2) if fill_line_y else 0,
        "combined_score": round(combined_score, 2),
        "final_score": round(final_score, 2),
        "category": categorize_score(final_score),
        "has_fill_line": fill_line_y is not None,
        "fill_line_position": fill_line_y if fill_line_y else None,
        "detail": {
            "total_pixels": total_pixels,
            "filled_pixels": filled_pixels,
            "snack_pixels": snack_pixels,
            "vertical_distribution": {
                "top_third_percent": round((top_third_pixels / max(1, total_filled)) * 100, 2) if total_filled > 0 else 0,
                "middle_third_percent": round((middle_third_pixels / max(1, total_filled)) * 100, 2) if total_filled > 0 else 0,
                "bottom_third_percent": round((bottom_third_pixels / max(1, total_filled)) * 100, 2) if total_filled > 0 else 0,
            },
            "scoring_breakdown": {
                "fill_score_weight": "50%",
                "vertical_score_weight": "20%",
                "fill_line_weight": "15%",
                "snack_detection_weight": "15%"
            }
        }
    }
    
    if debug:
        # Save debug images
        cv2.imwrite(str(Path(image_path).with_stem(Path(image_path).stem + "_product_mask")), product_mask)
        cv2.imwrite(str(Path(image_path).with_stem(Path(image_path).stem + "_edges")), edges)
        cv2.imwrite(str(Path(image_path).with_stem(Path(image_path).stem + "_snack_mask")), snack_mask)
    
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
        description="Analyze tray/drawer fill level using computer vision with snack detection"
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
