#!/usr/bin/env python3
"""
Draw Detection Boxes on Images
Generates output images with bounding boxes and labels
Filters detections to only show products INSIDE drawers (red zones)
Ignores yellow zones (outside drawers)
"""

import cv2
import json
import sys
import os
from pathlib import Path

# ROI Zones - Only detect INSIDE drawers (red zones from your image)
# Format: (y_start, y_end) for each drawer in the trolley
DRAWER_ZONES = [
    # Drawer 1 (top) - Yellow spiral area
    {'y_start': 0, 'y_end': 150, 'name': 'Top (Yellow - SKIP)', 'skip': True},
    
    # Drawer 2 - First products drawer
    {'y_start': 150, 'y_end': 280, 'name': 'Drawer 1', 'skip': False},
    
    # Drawer 3 - Second products drawer (Coca-Cola area)
    {'y_start': 280, 'y_end': 410, 'name': 'Drawer 2', 'skip': False},
    
    # Drawer 4 - Third products drawer (Valle area)
    {'y_start': 410, 'y_end': 540, 'name': 'Drawer 3', 'skip': False},
    
    # Drawer 5 - Bottom drawer
    {'y_start': 540, 'y_end': 670, 'name': 'Drawer 4', 'skip': False},
]

# Fill level lines - Percentage thresholds
# Lines divide each drawer into fill levels
FILL_LINES = [
    {'threshold': 0.10, 'score': 10.0, 'label': '100% FULL'},   # Top 10% = full
    {'threshold': 0.25, 'score': 8.5, 'label': '85% FULL'},    # Top 25% = nearly full
    {'threshold': 0.40, 'score': 7.5, 'label': '75% FULL'},    # Top 40% = good
    {'threshold': 0.60, 'score': 5.0, 'label': '50% FULL'},    # Middle = partial
    {'threshold': 0.80, 'score': 2.5, 'label': '25% FULL'},    # Bottom = sparse
]

def is_inside_drawer(bbox, image_height):
    """Check if detection is inside a valid drawer zone (red zones)"""
    x, y, w, h = bbox
    center_y = y + h / 2
    
    for zone in DRAWER_ZONES:
        if zone['skip']:
            continue
        if zone['y_start'] <= center_y <= zone['y_end']:
            return True, zone['name']
    
    return False, None

def calculate_fill_score(bbox, drawer_zone, image_height):
    """Calculate fill score based on vertical position within drawer"""
    if not drawer_zone:
        return 5.0, "UNKNOWN"
    
    # Find the drawer
    drawer = None
    for zone in DRAWER_ZONES:
        if zone['name'] == drawer_zone:
            drawer = zone
            break
    
    if not drawer or drawer['skip']:
        return 5.0, "SKIP"
    
    # Calculate relative position within drawer
    x, y, w, h = bbox
    center_y = y + h / 2
    drawer_height = drawer['y_end'] - drawer['y_start']
    relative_pos = (center_y - drawer['y_start']) / drawer_height
    
    # Find which fill line it crosses
    for line in FILL_LINES:
        if relative_pos <= line['threshold']:
            return line['score'], line['label']
    
    return 1.0, "EMPTY"

def draw_detection_boxes(image_path, detections, output_path, analysis_id):
    """
    Draw bounding boxes on image
    - Red boxes: Valid detections inside drawers
    - Yellow boxes: Ignored detections (outside drawers)
    - Blue lines: Fill level thresholds
    """
    # Read image
    img = cv2.imread(str(image_path))
    if img is None:
        print(f"Error: Could not read image {image_path}")
        return False
    
    height, width = img.shape[:2]
    
    # Draw drawer zones (background rectangles)
    overlay = img.copy()
    for zone in DRAWER_ZONES:
        y_start = zone['y_start']
        y_end = zone['y_end']
        color = (0, 255, 255) if zone['skip'] else (0, 100, 0)  # Yellow for skip, dark green for valid
        alpha = 0.1
        cv2.rectangle(overlay, (0, y_start), (width, y_end), color, -1)
    
    # Blend overlay with original
    cv2.addWeighted(overlay, 0.15, img, 0.85, 0, img)
    
    # Draw fill level lines ONLY in white spaces between drawers
    for zone in DRAWER_ZONES:
        if zone['skip']:
            continue
        
        drawer_height = zone['y_end'] - zone['y_start']
        
        # Only draw lines in the TOP 40% of each drawer (white space area)
        white_space_height = int(drawer_height * 0.4)
        white_space_start = zone['y_start']
        white_space_end = white_space_start + white_space_height
        
        for line in FILL_LINES:
            # Map line threshold to white space only
            line_y = int(white_space_start + white_space_height * line['threshold'])
            
            # Only draw if line is within white space
            if white_space_start <= line_y <= white_space_end:
                # Blue dashed line - only in white space area
                for x in range(0, width, 20):
                    cv2.line(img, (x, line_y), (x + 10, line_y), (255, 0, 0), 2)
                
                # Label on the right
                cv2.putText(img, line['label'], (width - 150, line_y - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 0, 0), 1)
    
    # Draw detections
    valid_count = 0
    ignored_count = 0
    
    for det in detections:
        if 'bbox' not in det:
            continue
        
        x, y, w, h = det['bbox']
        x, y, w, h = int(x), int(y), int(w), int(h)
        
        # Check if inside valid drawer
        inside, drawer_name = is_inside_drawer((x, y, w, h), height)
        
        if inside:
            # Valid detection - RED box
            color = (0, 0, 255)  # Red in BGR
            valid_count += 1
            
            # Calculate fill score
            score, fill_level = calculate_fill_score((x, y, w, h), drawer_name, height)
            
            # Draw bounding box
            cv2.rectangle(img, (x, y), (x + w, y + h), color, 3)
            
            # Label with class and fill level
            label = f"{det.get('class', 'unknown')} - {fill_level}"
            label_bg_color = color
            
            # Draw label background
            (text_w, text_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(img, (x, y - text_h - 10), (x + text_w + 10, y), label_bg_color, -1)
            cv2.putText(img, label, (x + 5, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
        else:
            # Ignored detection - YELLOW box with X
            color = (0, 255, 255)  # Yellow in BGR
            ignored_count += 1
            
            # Draw thin yellow box
            cv2.rectangle(img, (x, y), (x + w, y + h), color, 1)
            
            # Draw X over it
            cv2.line(img, (x, y), (x + w, y + h), color, 1)
            cv2.line(img, (x + w, y), (x, y + h), color, 1)
            
            # Label as IGNORED
            cv2.putText(img, "IGNORED", (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
    
    # Draw header with analysis ID and stats
    header_height = 80
    header = 255 * np.ones((header_height, width, 3), dtype=np.uint8)
    
    # Title
    cv2.putText(header, f"Analysis ID: {analysis_id[:8]}...", (10, 25),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    
    # Stats
    cv2.putText(header, f"Valid Detections: {valid_count}", (10, 50),
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 128, 0), 1)
    cv2.putText(header, f"Ignored (Yellow): {ignored_count}", (10, 70),
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 128, 128), 1)
    
    # Legend
    legend_x = width - 300
    cv2.putText(header, "Legend:", (legend_x, 25),
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2)
    cv2.rectangle(header, (legend_x, 30), (legend_x + 20, 45), (0, 0, 255), -1)
    cv2.putText(header, "= Inside Drawer", (legend_x + 25, 43),
               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    cv2.rectangle(header, (legend_x, 50), (legend_x + 20, 65), (0, 255, 255), -1)
    cv2.putText(header, "= Outside (Ignored)", (legend_x + 25, 63),
               cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    
    # Combine header with image
    result = np.vstack([header, img])
    
    # Save output
    cv2.imwrite(str(output_path), result)
    print(f"[OK] Saved visualization: {output_path}")
    print(f"  Valid detections: {valid_count}")
    print(f"  Ignored detections: {ignored_count}")
    
    return True

def main():
    if len(sys.argv) < 4:
        print("Usage: python draw_detections.py <image_path> <detections_json> <output_path> [analysis_id]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    detections_json = sys.argv[2]
    output_path = sys.argv[3]
    analysis_id = sys.argv[4] if len(sys.argv) > 4 else "unknown"
    
    # Load detections
    with open(detections_json, 'r') as f:
        data = json.load(f)
        detections = data.get('detections', [])
    
    # Draw boxes
    success = draw_detection_boxes(image_path, detections, output_path, analysis_id)
    
    if success:
        print(f"\n[SUCCESS] Detection visualization saved to {output_path}")
    else:
        print(f"\n[FAILED] Could not generate visualization")
        sys.exit(1)

if __name__ == '__main__':
    import numpy as np
    main()

