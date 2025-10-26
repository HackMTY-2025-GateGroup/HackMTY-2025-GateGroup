#!/usr/bin/env python3
"""
Quick manual labeling tool for cookies/galletas
Run this to manually add cookie labels to the training set
"""
import cv2
import sys
from pathlib import Path

def label_image(img_path, label_path):
    """
    Interactive labeling: click top-left then bottom-right of each cookie drawer
    """
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"Could not load {img_path}")
        return
    
    h, w = img.shape[:2]
    display = img.copy()
    
    print(f"\n{'='*60}")
    print(f"Labeling: {img_path.name}")
    print(f"{'='*60}")
    print("Instructions:")
    print("  - Click TOP-LEFT corner of a cookie drawer")
    print("  - Click BOTTOM-RIGHT corner of the same drawer")
    print("  - Press 's' to SAVE all boxes")
    print("  - Press 'q' to QUIT without saving")
    print("  - Press 'r' to RESET (clear all boxes)")
    print(f"{'='*60}\n")
    
    boxes = []
    current_box = []
    
    def mouse_callback(event, x, y, flags, param):
        nonlocal current_box, display
        
        if event == cv2.EVENT_LBUTTONDOWN:
            current_box.append((x, y))
            
            if len(current_box) == 1:
                # First point
                cv2.circle(display, (x, y), 5, (0, 255, 0), -1)
                print(f"  Point 1: ({x}, {y})")
            elif len(current_box) == 2:
                # Second point - complete the box
                x1, y1 = current_box[0]
                x2, y2 = current_box[1]
                
                # Ensure correct order
                x1, x2 = min(x1, x2), max(x1, x2)
                y1, y2 = min(y1, y2), max(y1, y2)
                
                # Draw rectangle
                cv2.rectangle(display, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                # Calculate YOLO format (normalized)
                cx = ((x1 + x2) / 2) / w
                cy = ((y1 + y2) / 2) / h
                bw = (x2 - x1) / w
                bh = (y2 - y1) / h
                
                boxes.append((cx, cy, bw, bh))
                print(f"  Point 2: ({x}, {y})")
                print(f"  ✓ Box #{len(boxes)} added (cx={cx:.3f}, cy={cy:.3f}, w={bw:.3f}, h={bh:.3f})")
                current_box = []
            
            cv2.imshow('Label Cookies (class=1)', display)
    
    cv2.namedWindow('Label Cookies (class=1)')
    cv2.setMouseCallback('Label Cookies (class=1)', mouse_callback)
    cv2.imshow('Label Cookies (class=1)', display)
    
    while True:
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            print("\n[QUIT] Exiting without saving")
            cv2.destroyAllWindows()
            return False
        
        elif key == ord('r'):
            print("\n[RESET] Clearing all boxes")
            display = img.copy()
            boxes = []
            current_box = []
            cv2.imshow('Label Cookies (class=1)', display)
        
        elif key == ord('s'):
            if len(boxes) == 0:
                print("\n[WARN] No boxes to save!")
                continue
            
            print(f"\n[SAVE] Writing {len(boxes)} cookie boxes to {label_path.name}")
            
            # Read existing labels (bottles)
            existing_lines = []
            if label_path.exists():
                with open(label_path, 'r') as f:
                    existing_lines = [line.strip() for line in f if line.strip()]
            
            # Add cookie boxes (class 1)
            with open(label_path, 'w') as f:
                # Write existing (bottles, class 0)
                for line in existing_lines:
                    f.write(line + '\n')
                
                # Write new (cookies, class 1)
                for cx, cy, bw, bh in boxes:
                    f.write(f"1 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}\n")
            
            print(f"✓ Saved {len(existing_lines)} bottle boxes + {len(boxes)} cookie boxes")
            cv2.destroyAllWindows()
            return True


def main():
    root = Path(__file__).parent
    img_dir = root / 'dataset' / 'images' / 'train_boot'
    lbl_dir = root / 'dataset' / 'labels' / 'train_boot'
    
    images = sorted([p for p in img_dir.glob('*.*') if p.suffix.lower() in {'.jpg', '.jpeg', '.png'}])
    
    if len(sys.argv) > 1:
        # Label specific image
        img_name = sys.argv[1]
        img_path = img_dir / img_name
        if not img_path.exists():
            print(f"Image not found: {img_path}")
            return
        images = [img_path]
    
    print(f"\n{'='*60}")
    print(f"COOKIE LABELING TOOL")
    print(f"{'='*60}")
    print(f"Images to label: {len(images)}")
    for img in images:
        print(f"  - {img.name}")
    print(f"{'='*60}\n")
    
    for img_path in images:
        lbl_path = lbl_dir / f"{img_path.stem}.txt"
        saved = label_image(img_path, lbl_path)
        
        if not saved:
            print("\nLabeling cancelled by user")
            break
    
    print("\n✓ Labeling complete!")
    print("\nNext steps:")
    print("  1. Run: python aggressive_retrain.py --epochs 50 --name trolley_with_cookies")
    print("  2. Update .env: YOLO_WEIGHTS=./cv/train/runs/trolley_with_cookies/weights/best.pt")


if __name__ == '__main__':
    main()

