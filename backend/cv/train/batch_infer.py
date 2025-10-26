import argparse
import json
from pathlib import Path
from datetime import datetime

try:
    from ultralytics import YOLO
except Exception as e:
    raise SystemExit("Ultralytics not installed. Run: pip install ultralytics") from e


def run_batch(weights: Path, images_dir: Path, out_dir: Path, imgsz: int, conf: float, iou: float):
    out_dir.mkdir(parents=True, exist_ok=True)
    ann_dir = out_dir / "annotated"
    ann_dir.mkdir(parents=True, exist_ok=True)

    model = YOLO(str(weights))
    results_path = out_dir / "results.jsonl"
    if results_path.exists():
        results_path.unlink()

    class_totals = {}
    num_images = 0

    image_paths = [p for p in images_dir.glob("**/*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}]
    if not image_paths:
        raise SystemExit(f"No images found under {images_dir}")

    for img in image_paths:
        num_images += 1
        results = model.predict(source=str(img), imgsz=imgsz, conf=conf, iou=iou, verbose=False, save=False)
        if not results:
            continue
        r0 = results[0]

        # Save annotated
        save_path = ann_dir / f"{img.stem}.annotated.jpg"
        plotted = r0.plot()
        try:
            from PIL import Image
            Image.fromarray(plotted).save(save_path)
        except Exception:
            pass

        # Build JSON line
        frame_w = getattr(r0.orig_img, 'shape', [None, None])[1]
        frame_h = getattr(r0.orig_img, 'shape', [None, None])[0]
        dets = []
        for b in r0.boxes:
            cls_id = int(b.cls.item())
            label = model.names.get(cls_id, str(cls_id)).lower()
            confv = float(b.conf.item()) if b.conf is not None else None
            x1, y1, x2, y2 = [float(x) for x in b.xyxy[0].tolist()]
            dets.append({
                "class": label,
                "score": confv,
                "bbox": [x1, y1, x2 - x1, y2 - y1],
                "frame": {"w": frame_w, "h": frame_h}
            })
            class_totals[label] = class_totals.get(label, 0) + 1

        payload = {
            "image": str(img),
            "frame": {"w": frame_w, "h": frame_h},
            "detections": dets,
            "annotated": str(save_path)
        }
        with results_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")

    summary = {
        "num_images": num_images,
        "class_totals": class_totals,
        "imgsz": imgsz,
        "conf": conf,
        "iou": iou,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


def main():
    p = argparse.ArgumentParser(description="Batch infer all images in a directory and save annotated outputs")
    p.add_argument("--weights", type=str, required=True)
    p.add_argument("--images_dir", type=str, default="./cv/train/dataset/images/train")
    p.add_argument("--out", type=str, default="./cv/train/batch_out")
    p.add_argument("--imgsz", type=int, default=960)
    p.add_argument("--conf", type=float, default=0.15)
    p.add_argument("--iou", type=float, default=0.6)
    args = p.parse_args()

    run_batch(
        weights=Path(args.weights),
        images_dir=Path(args.images_dir),
        out_dir=Path(args.out),
        imgsz=args.imgsz,
        conf=args.conf,
        iou=args.iou,
    )


if __name__ == "__main__":
    main()


