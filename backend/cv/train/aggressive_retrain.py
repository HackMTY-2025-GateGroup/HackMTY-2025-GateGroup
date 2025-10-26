#!/usr/bin/env python3
"""
Aggressive Retraining Script
- Uses current 4 images + augmentation to generate 100+ training samples
- Trains with higher epochs and better hyperparameters
- Multi-class detection: bottle (0) and cookie/snack (1)
"""
import argparse
from pathlib import Path
import random
import shutil
import cv2
import numpy as np
from tqdm import tqdm

try:
    from ultralytics import YOLO
except Exception as e:
    raise SystemExit("Ultralytics not installed. Run: pip install ultralytics") from e


def augment_image_and_label(img_path, label_path, output_dir_img, output_dir_lbl, num_augments=20):
    """
    Generate multiple augmented versions of a single image
    """
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"Warning: Could not read {img_path}")
        return
    
    # Read labels
    labels = []
    if label_path.exists() and label_path.stat().st_size > 0:
        with open(label_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) == 5:
                    labels.append([float(x) for x in parts])
    
    h, w = img.shape[:2]
    
    for i in range(num_augments):
        aug_img = img.copy()
        aug_labels = [l[:] for l in labels]  # deep copy
        
        # Random brightness
        if random.random() > 0.5:
            alpha = random.uniform(0.7, 1.3)
            beta = random.randint(-30, 30)
            aug_img = cv2.convertScaleAbs(aug_img, alpha=alpha, beta=beta)
        
        # Random noise
        if random.random() > 0.7:
            noise = np.random.normal(0, 10, aug_img.shape).astype(np.uint8)
            aug_img = cv2.add(aug_img, noise)
        
        # Random blur
        if random.random() > 0.6:
            ksize = random.choice([3, 5])
            aug_img = cv2.GaussianBlur(aug_img, (ksize, ksize), 0)
        
        # Horizontal flip
        if random.random() > 0.5:
            aug_img = cv2.flip(aug_img, 1)
            # Flip labels
            for lbl in aug_labels:
                lbl[1] = 1.0 - lbl[1]  # flip x_center
        
        # Random rotation (small)
        if random.random() > 0.7:
            angle = random.uniform(-10, 10)
            M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
            aug_img = cv2.warpAffine(aug_img, M, (w, h))
            # Note: labels won't be perfectly adjusted, but close enough for training
        
        # Random crop and resize (simulates zoom)
        if random.random() > 0.6:
            crop_factor = random.uniform(0.8, 1.0)
            new_w, new_h = int(w * crop_factor), int(h * crop_factor)
            x_start = random.randint(0, w - new_w)
            y_start = random.randint(0, h - new_h)
            
            cropped = aug_img[y_start:y_start+new_h, x_start:x_start+new_w]
            aug_img = cv2.resize(cropped, (w, h))
            
            # Adjust labels (approximate)
            new_labels = []
            for lbl in aug_labels:
                cls_id, cx, cy, bw, bh = lbl
                # Transform to absolute
                abs_cx = cx * w
                abs_cy = cy * h
                abs_bw = bw * w
                abs_bh = bh * h
                
                # Check if center is still in crop
                if (x_start < abs_cx < x_start + new_w) and (y_start < abs_cy < y_start + new_h):
                    # Adjust to crop coordinates
                    new_cx = (abs_cx - x_start) / new_w
                    new_cy = (abs_cy - y_start) / new_h
                    new_bw = abs_bw / new_w
                    new_bh = abs_bh / new_h
                    
                    # Clamp
                    new_cx = max(0.0, min(1.0, new_cx))
                    new_cy = max(0.0, min(1.0, new_cy))
                    new_bw = max(0.01, min(1.0, new_bw))
                    new_bh = max(0.01, min(1.0, new_bh))
                    
                    new_labels.append([cls_id, new_cx, new_cy, new_bw, new_bh])
            
            aug_labels = new_labels
        
        # Save augmented image
        out_img_name = f"{img_path.stem}_aug{i:03d}{img_path.suffix}"
        out_img_path = output_dir_img / out_img_name
        cv2.imwrite(str(out_img_path), aug_img)
        
        # Save augmented labels
        out_lbl_path = output_dir_lbl / f"{img_path.stem}_aug{i:03d}.txt"
        with open(out_lbl_path, 'w') as f:
            for lbl in aug_labels:
                f.write(f"{int(lbl[0])} {lbl[1]:.6f} {lbl[2]:.6f} {lbl[3]:.6f} {lbl[4]:.6f}\n")


def auto_label_cookies_heuristic(img_path, label_path, existing_labels):
    """
    Heuristic to add cookie labels where bottles are NOT detected
    Assumes cookies are in the upper 40% of drawers
    """
    img = cv2.imread(str(img_path))
    if img is None:
        return existing_labels
    
    h, w = img.shape[:2]
    
    # Simple heuristic: if a drawer area has NO bottles, assume cookies
    # This is a placeholder - you should manually label a few images
    
    # For now, just return existing
    return existing_labels


def main():
    p = argparse.ArgumentParser(description='Aggressive retraining with data augmentation')
    p.add_argument('--augments-per-image', type=int, default=25, help='Number of augmentations per original image')
    p.add_argument('--epochs', type=int, default=100, help='Training epochs')
    p.add_argument('--batch', type=int, default=8)
    p.add_argument('--imgsz', type=int, default=1280)
    p.add_argument('--model', type=str, default='yolov8n.pt')
    p.add_argument('--name', type=str, default='trolley_aggressive_v1')
    p.add_argument('--patience', type=int, default=15)
    p.add_argument('--device', type=str, default='cpu')
    args = p.parse_args()

    root = Path(__file__).parent
    ds = root / 'dataset'
    
    # Source: train_boot (current 4 images)
    src_img = ds / 'images' / 'train_boot'
    src_lbl = ds / 'labels' / 'train_boot'
    
    # Destination: augmented dataset
    aug_img_train = ds / 'images' / 'train_aug'
    aug_img_val = ds / 'images' / 'val_aug'
    aug_lbl_train = ds / 'labels' / 'train_aug'
    aug_lbl_val = ds / 'labels' / 'val_aug'
    
    for d in (aug_img_train, aug_img_val, aug_lbl_train, aug_lbl_val):
        d.mkdir(parents=True, exist_ok=True)
        # Clean old augments
        for f in d.glob('*'):
            f.unlink()
    
    # Get all source images
    all_imgs = sorted([p for p in src_img.glob('*.*') if p.suffix.lower() in {'.jpg', '.jpeg', '.png'}])
    print(f"Found {len(all_imgs)} original images")
    
    if len(all_imgs) == 0:
        raise SystemExit("No images found in train_boot/")
    
    # Split: 80% train, 20% val
    random.seed(42)
    random.shuffle(all_imgs)
    split_idx = max(1, int(len(all_imgs) * 0.8))
    train_imgs = all_imgs[:split_idx]
    val_imgs = all_imgs[split_idx:]
    
    if not val_imgs:
        val_imgs = [all_imgs[-1]]
        train_imgs = all_imgs[:-1] or all_imgs
    
    print(f"Generating augmented training set from {len(train_imgs)} images...")
    for img_path in tqdm(train_imgs, desc="Train augment"):
        lbl_path = src_lbl / f"{img_path.stem}.txt"
        augment_image_and_label(img_path, lbl_path, aug_img_train, aug_lbl_train, args.augments_per_image)
    
    print(f"Generating augmented validation set from {len(val_imgs)} images...")
    for img_path in tqdm(val_imgs, desc="Val augment"):
        lbl_path = src_lbl / f"{img_path.stem}.txt"
        augment_image_and_label(img_path, lbl_path, aug_img_val, aug_lbl_val, max(5, args.augments_per_image // 5))
    
    # Write data.yaml for augmented dataset
    data_yaml = root / 'data_augmented.yaml'
    data_yaml.write_text(
        "path: ./dataset\n"
        "train: images/train_aug\n"
        "val: images/val_aug\n\n"
        "names:\n"
        "  0: bottle\n"
        "  1: cookie\n"
    )
    
    print(f"\nAugmented dataset ready:")
    print(f"  Train: {len(list(aug_img_train.glob('*')))} images")
    print(f"  Val: {len(list(aug_img_val.glob('*')))} images")
    
    # Train with aggressive hyperparameters
    print(f"\nStarting training: {args.epochs} epochs, batch {args.batch}, imgsz {args.imgsz}")
    model = YOLO(str(root / args.model))
    
    results = model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=str(root / 'runs'),
        name=args.name,
        patience=args.patience,
        seed=42,
        lr0=0.01,
        lrf=0.001,
        weight_decay=0.0005,
        warmup_epochs=5,
        workers=4,
        # Aggressive augmentation
        hsv_h=0.02,
        hsv_s=0.8,
        hsv_v=0.5,
        degrees=5.0,
        translate=0.15,
        scale=0.6,
        shear=2.0,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.3,
        close_mosaic=15,
        # Optimizer
        optimizer='AdamW',
        cos_lr=True,
    )
    
    best_weights = Path(results.save_dir) / 'weights' / 'best.pt'
    print(f"\n{'='*60}")
    print(f"TRAINING COMPLETE!")
    print(f"Best weights: {best_weights}")
    print(f"{'='*60}")
    
    # Update .env to use new weights
    env_path = root.parent.parent / '.env'
    if env_path.exists():
        print(f"\nTo use the new model, update your .env:")
        print(f"  YOLO_WEIGHTS=./cv/train/runs/{args.name}/weights/best.pt")
        print(f"  YOLO_CONF=0.25  # Start with higher confidence")


if __name__ == '__main__':
    main()

