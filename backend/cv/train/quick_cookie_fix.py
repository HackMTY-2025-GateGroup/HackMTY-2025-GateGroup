#!/usr/bin/env python3
"""
Quick Cookie Detection Fix
- Creates synthetic cookie data from existing images
- Trains a focused model for cookie detection
- Uses data augmentation to generate more cookie samples
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

def create_synthetic_cookies(img_path, label_path, output_dir_img, output_dir_lbl, num_augments=50):
    """
    Create synthetic cookie data by copying and modifying existing cookie labels
    """
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"Warning: Could not read {img_path}")
        return
    
    # Read existing labels
    labels = []
    if label_path.exists():
        with open(label_path, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if len(parts) >= 5:
                    labels.append([int(parts[0])] + [float(x) for x in parts[1:]])
    
    # Filter only cookie labels (class 1)
    cookie_labels = [label for label in labels if label[0] == 1]
    
    if not cookie_labels:
        print(f"No cookie labels found in {label_path}")
        return
    
    print(f"Found {len(cookie_labels)} cookie labels, creating {num_augments} synthetic samples")
    
    for i in range(num_augments):
        # Create augmented image
        aug_img = img.copy()
        
        # Apply random transformations
        if random.random() < 0.3:
            # Brightness adjustment
            brightness = random.uniform(0.8, 1.2)
            aug_img = cv2.convertScaleAbs(aug_img, alpha=brightness, beta=0)
        
        if random.random() < 0.3:
            # Contrast adjustment
            contrast = random.uniform(0.8, 1.2)
            aug_img = cv2.convertScaleAbs(aug_img, alpha=contrast, beta=0)
        
        if random.random() < 0.2:
            # Gaussian blur
            kernel_size = random.choice([3, 5])
            aug_img = cv2.GaussianBlur(aug_img, (kernel_size, kernel_size), 0)
        
        # Create synthetic cookie labels with slight variations
        synthetic_labels = []
        for label in cookie_labels:
            # Add small random variations to cookie positions
            new_label = label.copy()
            new_label[1] += random.uniform(-0.02, 0.02)  # x center
            new_label[2] += random.uniform(-0.02, 0.02)  # y center
            new_label[3] += random.uniform(-0.01, 0.01)  # width
            new_label[4] += random.uniform(-0.01, 0.01)  # height
            
            # Ensure values stay within bounds
            new_label[1] = max(0, min(1, new_label[1]))
            new_label[2] = max(0, min(1, new_label[2]))
            new_label[3] = max(0.01, min(0.5, new_label[3]))
            new_label[4] = max(0.01, min(0.5, new_label[4]))
            
            synthetic_labels.append(new_label)
        
        # Save augmented image
        aug_img_path = output_dir_img / f"{img_path.stem}_cookie_aug_{i:03d}.jpg"
        cv2.imwrite(str(aug_img_path), aug_img)
        
        # Save synthetic labels
        aug_label_path = output_dir_lbl / f"{img_path.stem}_cookie_aug_{i:03d}.txt"
        with open(aug_label_path, 'w') as f:
            for label in synthetic_labels:
                f.write(f"{label[0]} {label[1]:.6f} {label[2]:.6f} {label[3]:.6f} {label[4]:.6f}\n")

def main():
    parser = argparse.ArgumentParser(description='Quick Cookie Detection Fix')
    parser.add_argument('--epochs', type=int, default=50, help='Number of training epochs')
    parser.add_argument('--batch', type=int, default=8, help='Batch size')
    parser.add_argument('--imgsz', type=int, default=1280, help='Image size')
    parser.add_argument('--name', type=str, default='trolley_cookies_fixed', help='Model name')
    parser.add_argument('--device', type=str, default='cpu', help='Device to use')
    parser.add_argument('--augments-per-image', type=int, default=50, help='Augmentations per image')
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("QUICK COOKIE DETECTION FIX")
    print("=" * 60)
    
    # Setup directories
    dataset_dir = Path('dataset')
    train_img_dir = dataset_dir / 'images' / 'train_boot'
    train_lbl_dir = dataset_dir / 'labels' / 'train_boot'
    val_img_dir = dataset_dir / 'images' / 'val_boot'
    val_lbl_dir = dataset_dir / 'labels' / 'val_boot'
    
    # Create augmented dataset directories
    aug_train_img_dir = dataset_dir / 'images' / 'train_cookie_aug'
    aug_train_lbl_dir = dataset_dir / 'labels' / 'train_cookie_aug'
    aug_val_img_dir = dataset_dir / 'images' / 'val_cookie_aug'
    aug_val_lbl_dir = dataset_dir / 'labels' / 'val_cookie_aug'
    
    for dir_path in [aug_train_img_dir, aug_train_lbl_dir, aug_val_img_dir, aug_val_lbl_dir]:
        dir_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Creating synthetic cookie data...")
    
    # Process training images
    train_images = list(train_img_dir.glob('*.jpeg')) + list(train_img_dir.glob('*.jpg'))
    for img_path in train_images:
        label_path = train_lbl_dir / f"{img_path.stem}.txt"
        create_synthetic_cookies(img_path, label_path, aug_train_img_dir, aug_train_lbl_dir, args.augments_per_image)
    
    # Copy original validation images (no augmentation needed)
    val_images = list(val_img_dir.glob('*.jpeg')) + list(val_img_dir.glob('*.jpg'))
    for img_path in val_images:
        # Copy original image
        shutil.copy2(img_path, aug_val_img_dir / img_path.name)
        
        # Copy original labels
        label_path = val_lbl_dir / f"{img_path.stem}.txt"
        if label_path.exists():
            shutil.copy2(label_path, aug_val_lbl_dir / f"{img_path.stem}.txt")
        else:
            # Create empty label file
            (aug_val_lbl_dir / f"{img_path.stem}.txt").touch()
    
    print(f"Created synthetic dataset:")
    print(f"  Training images: {len(list(aug_train_img_dir.glob('*.jpg')))}")
    print(f"  Validation images: {len(list(aug_val_img_dir.glob('*.jpg')))}")
    
    # Create data.yaml for augmented dataset
    data_yaml_content = f"""path: {dataset_dir.absolute()}
train: images/train_cookie_aug
val: images/val_cookie_aug

nc: 2
names: ['bottle', 'cookie']
"""
    
    data_yaml_path = Path('data_cookie_aug.yaml')
    with open(data_yaml_path, 'w') as f:
        f.write(data_yaml_content)
    
    print(f"Created data config: {data_yaml_path}")
    
    # Train the model
    print(f"\nTraining cookie-focused model...")
    model = YOLO('yolov8n.pt')
    
    results = model.train(
        data=str(data_yaml_path),
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        name=args.name,
        device=args.device,
        patience=10,
        save_period=10,
        verbose=True
    )
    
    print(f"\nTraining completed!")
    print(f"Best weights: {results.save_dir}/weights/best.pt")
    print(f"\nTo use the new model, update your .env:")
    print(f"YOLO_WEIGHTS=./cv/train/runs/{args.name}/weights/best.pt")
    print(f"YOLO_CONF=0.01")

if __name__ == '__main__':
    main()
