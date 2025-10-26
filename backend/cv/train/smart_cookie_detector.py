#!/usr/bin/env python3
"""
Smart Cookie Detection with Fill Lines
- Detects bottles with YOLO
- Identifies empty drawers vs cookie-filled drawers
- Draws fill level lines for each drawer
- Calculates percentage based on line position
"""
import cv2
import numpy as np
import json
from pathlib import Path

def detect_drawer_regions(img):
    """
    Detect drawer regions in the image
    Returns list of drawer bounding boxes
    """
    h, w = img.shape[:2]
    
    # Define drawer regions based on typical trolley layout
    # These are approximate regions - adjust based on your specific trolley
    drawers = []
    
    # Top drawer (usually metallic container - ignore)
    # Middle drawers (main product area)
    drawer_height = h // 4  # Each drawer is about 1/4 of image height
    
    for i in range(3):  # 3 main drawers
        y_start = int(h * 0.2) + (i * drawer_height)  # Start below metallic area
        y_end = y_start + drawer_height
        
        # Left side drawer
        drawers.append({
            'id': f'drawer_{i}_left',
            'bbox': [0, y_start, w//2, y_end],
            'side': 'left'
        })
        
        # Right side drawer  
        drawers.append({
            'id': f'drawer_{i}_right',
            'bbox': [w//2, y_start, w//2, y_end],
            'side': 'right'
        })
    
    return drawers

def detect_bottles_in_drawer(detections, drawer_bbox):
    """
    Check if there are bottles in a specific drawer
    """
    drawer_x1, drawer_y1, drawer_w, drawer_h = drawer_bbox
    drawer_x2 = drawer_x1 + drawer_w
    drawer_y2 = drawer_y1 + drawer_h
    
    bottles_in_drawer = []
    
    for det in detections:
        if det['class'] == 'bottle':
            det_x1, det_y1, det_w, det_h = det['bbox']
            det_x2 = det_x1 + det_w
            det_y2 = det_y1 + det_h
            
            # Check if detection overlaps with drawer
            if (det_x1 < drawer_x2 and det_x2 > drawer_x1 and 
                det_y1 < drawer_y2 and det_y2 > drawer_y1):
                bottles_in_drawer.append(det)
    
    return bottles_in_drawer

def calculate_fill_percentage(drawer_bbox, img_height):
    """
    Calculate fill percentage based on drawer position
    Higher drawers = higher fill percentage
    """
    drawer_y1 = drawer_bbox[1]
    
    # Calculate percentage based on position
    # Top drawer = 100%, middle = 75%, bottom = 50%
    if drawer_y1 < img_height * 0.3:
        return 100
    elif drawer_y1 < img_height * 0.6:
        return 75
    else:
        return 50

def detect_cookies_by_fill_lines(img_path, yolo_detections):
    """
    Detect cookies by analyzing drawer fill levels
    """
    img = cv2.imread(str(img_path))
    if img is None:
        return []
    
    h, w = img.shape[:2]
    
    # Detect drawer regions
    drawers = detect_drawer_regions(img)
    
    cookie_detections = []
    
    for drawer in drawers:
        drawer_bbox = drawer['bbox']
        
        # Check if there are bottles in this drawer
        bottles_in_drawer = detect_bottles_in_drawer(yolo_detections, drawer_bbox)
        
        # If no bottles but drawer appears to have content, it's cookies
        if len(bottles_in_drawer) == 0:
            # Check if drawer has visual content (not empty)
            drawer_x1, drawer_y1, drawer_w, drawer_h = drawer_bbox
            
            # Extract drawer region
            drawer_roi = img[drawer_y1:drawer_y1+drawer_h, drawer_x1:drawer_x1+drawer_w]
            
            # Check if drawer has content (not just background)
            gray_roi = cv2.cvtColor(drawer_roi, cv2.COLOR_BGR2GRAY)
            
            # Calculate variance to detect if there's content
            variance = np.var(gray_roi)
            
            # If variance is high enough, there's content (cookies)
            if variance > 500:  # Adjust threshold as needed
                fill_percentage = calculate_fill_percentage(drawer_bbox, h)
                
                cookie_detections.append({
                    'class': 'cookie',
                    'score': 0.8,  # High confidence for fill-based detection
                    'bbox': drawer_bbox,
                    'frame': {'w': w, 'h': h},
                    'method': 'fill_line_detection',
                    'drawer_id': drawer['id'],
                    'fill_percentage': fill_percentage
                })
    
    return cookie_detections

def draw_fill_lines(img_path, detections, output_path, analysis_id):
    """
    Draw fill level lines on the image
    """
    img = cv2.imread(str(img_path))
    if img is None:
        return False
    
    h, w = img.shape[:2]
    
    # Detect drawer regions
    drawers = detect_drawer_regions(img)
    
    # Draw fill lines for each drawer
    for drawer in drawers:
        drawer_bbox = drawer['bbox']
        drawer_x1, drawer_y1, drawer_w, drawer_h = drawer_bbox
        
        # Calculate fill percentage for this drawer
        fill_percentage = calculate_fill_percentage(drawer_bbox, h)
        
        # Draw fill line at appropriate height
        line_y = drawer_y1 + int(drawer_h * (fill_percentage / 100))
        
        # Draw line across the drawer
        cv2.line(img, (drawer_x1, line_y), (drawer_x1 + drawer_w, line_y), (0, 255, 0), 3)
        
        # Add percentage label
        label = f"{fill_percentage}%"
        cv2.putText(img, label, (drawer_x1 + 10, line_y - 10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
    
    # Draw detection boxes
    for det in detections:
        if det['class'] == 'bottle':
            x1, y1, w_rect, h_rect = det['bbox']
            cv2.rectangle(img, (int(x1), int(y1)), (int(x1 + w_rect), int(y1 + h_rect)), (255, 0, 0), 2)
            cv2.putText(img, 'Bottle', (int(x1), int(y1) - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
        elif det['class'] == 'cookie':
            x1, y1, w_rect, h_rect = det['bbox']
            cv2.rectangle(img, (int(x1), int(y1)), (int(x1 + w_rect), int(y1 + h_rect)), (0, 0, 255), 2)
            cv2.putText(img, f'Cookie {det.get("fill_percentage", 0)}%', (int(x1), int(y1) - 10), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    
    # Save image
    cv2.imwrite(str(output_path), img)
    print(f"[OK] Saved visualization: {output_path}")
    
    return True

def enhance_detections_with_fill_lines(img_path, yolo_detections):
    """
    Enhance YOLO detections with cookie detection based on fill lines
    """
    # Detect cookies using fill line analysis
    cookie_detections = detect_cookies_by_fill_lines(img_path, yolo_detections)
    
    # Combine all detections
    all_detections = yolo_detections + cookie_detections
    
    return all_detections

def main():
    """
    Smart cookie detector with fill lines
    Usage: python smart_cookie_detector.py <image_path> <detections_json_path>
    """
    import sys
    import json
    
    if len(sys.argv) < 3:
        print("Usage: python smart_cookie_detector.py <image_path> <detections_json_path>")
        return
    
    img_path = Path(sys.argv[1])
    detections_path = Path(sys.argv[2])
    
    # Load YOLO detections from JSON file
    try:
        with open(detections_path, 'r') as f:
            yolo_detections = json.load(f)
    except Exception as e:
        print(f"Error loading detections: {e}")
        return
    
    # Enhance detections with fill line analysis
    enhanced = enhance_detections_with_fill_lines(img_path, yolo_detections)
    
    # Output enhanced detections as JSON
    print(json.dumps(enhanced, indent=2))

if __name__ == '__main__':
    main()