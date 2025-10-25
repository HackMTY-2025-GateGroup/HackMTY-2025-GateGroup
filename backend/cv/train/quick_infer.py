import argparse
import json
from pathlib import Path

import requests
from PIL import Image

try:
    from ultralytics import YOLO
except Exception as e:
    raise SystemExit("Ultralytics not installed. Run: pip install ultralytics") from e


def parse_args():
    p = argparse.ArgumentParser(description="Run YOLO inference on one image and optionally POST detections to backend")
    p.add_argument("--weights", type=str, required=True, help="Path to trained .pt or pretrained (e.g., yolov8n.pt)")
    p.add_argument("--image", type=str, required=True, help="Path to image file")
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--conf", type=float, default=0.25)
    p.add_argument("--iou", type=float, default=0.7)
    p.add_argument("--backend_url", type=str, default=None, help="e.g., http://localhost:5000")
    p.add_argument("--post", type=str, choices=["none","estimate-volume","estimate-doubleside"], default="none")
    p.add_argument("--specName", type=str, default="doubleside.mx")
    p.add_argument("--side", type=str, choices=["front","back"], default="front")
    return p.parse_args()


def to_detections(result, names):
    dets = []
    frame_w = getattr(result.orig_img, 'shape', [None, None])[1]
    frame_h = getattr(result.orig_img, 'shape', [None, None])[0]
    for b in result.boxes:
        cls_id = int(b.cls.item())
        label = names.get(cls_id, str(cls_id)).lower()
        conf = float(b.conf.item()) if b.conf is not None else None
        x1, y1, x2, y2 = [float(x) for x in b.xyxy[0].tolist()]
        w = x2 - x1
        h = y2 - y1
        dets.append({
            "class": label,
            "score": conf,
            "bbox": [x1, y1, w, h],
            "frame": {"w": frame_w, "h": frame_h}
        })
    return dets, {"w": frame_w, "h": frame_h}


def main():
    args = parse_args()

    w = Path(args.weights)
    img = Path(args.image)
    if not w.exists():
        raise SystemExit(f"Weights not found: {w}")
    if not img.exists():
        raise SystemExit(f"Image not found: {img}")

    model = YOLO(str(w))
    results = model.predict(source=str(img), imgsz=args.imgsz, conf=args.conf, iou=args.iou, verbose=False)
    if not results:
        raise SystemExit("No results returned by model")

    detections, frame = to_detections(results[0], model.names)
    print(json.dumps({"frame": frame, "detections": detections}, indent=2))

    if args.post != "none":
        if not args.backend_url:
            raise SystemExit("--backend_url is required when --post != none")
        url = f"{args.backend_url}/api/occupancy/{'estimate-volume' if args.post=='estimate-volume' else 'estimate-doubleside'}"
        payload = {"specName": args.specName, "frame": frame, "detections": detections}
        if args.post == 'estimate-doubleside':
            payload["side"] = args.side
        r = requests.post(url, json=payload, timeout=30)
        r.raise_for_status()
        print("\nBackend response:")
        print(json.dumps(r.json(), indent=2))


if __name__ == "__main__":
    main()
