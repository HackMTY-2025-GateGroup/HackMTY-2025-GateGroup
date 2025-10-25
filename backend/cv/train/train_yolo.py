import os
import argparse
from pathlib import Path

# Ultralytics YOLOv8/YOLO11
# pip install -r requirements.txt
# Example:
#   python train_yolo.py --data data.yaml --model yolov8n.pt --epochs 50 --imgsz 640 --batch 16
# Dataset must be in YOLO format with 'images/train,val' and 'labels/train,val'

try:
    from ultralytics import YOLO
except Exception as e:
    raise SystemExit("Ultralytics not installed. Run: pip install ultralytics") from e


def parse_args():
    p = argparse.ArgumentParser(description="Train YOLO detector for trolley products")
    p.add_argument("--data", type=str, default="data.yaml", help="Path to dataset YAML")
    p.add_argument("--model", type=str, default="yolov8n.pt", help="Base model weights (e.g., yolov8n.pt)")
    p.add_argument("--epochs", type=int, default=50)
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--batch", type=int, default=16)
    p.add_argument("--device", type=str, default="auto", help="'cpu', '0' for GPU 0, or 'auto'")
    p.add_argument("--project", type=str, default="runs", help="Output project dir")
    p.add_argument("--name", type=str, default="exp", help="Run name")
    p.add_argument("--patience", type=int, default=20, help="Early stopping patience (epochs)")
    p.add_argument("--lr0", type=float, default=0.01, help="Initial learning rate")
    p.add_argument("--weight_decay", type=float, default=0.0005)
    p.add_argument("--workers", type=int, default=8)
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


def main():
    args = parse_args()
    data_path = Path(args.data)
    if not data_path.exists():
        raise SystemExit(f"Dataset YAML not found: {data_path}")

    model = YOLO(args.model)

    results = model.train(
        data=str(data_path),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name=args.name,
        patience=args.patience,
        lr0=args.lr0,
        weight_decay=args.weight_decay,
        workers=args.workers,
        seed=args.seed,
        # Some reasonable augmentations
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=0.0,
        translate=0.1,
        scale=0.5,
        shear=0.0,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.2,
        close_mosaic=10,
    )

    print("Training complete. Best weights should be in:")
    # Ultralytics saves runs under project/name/; best weights are 'weights/best.pt'
    run_dir = Path(results.save_dir)
    best = run_dir / "weights" / "best.pt"
    print(best if best.exists() else run_dir)


if __name__ == "__main__":
    main()
