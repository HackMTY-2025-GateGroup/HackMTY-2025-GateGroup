import argparse
from pathlib import Path

try:
    from ultralytics import YOLO
except Exception as e:
    raise SystemExit("Ultralytics not installed. Run: pip install ultralytics") from e


def parse_args():
    p = argparse.ArgumentParser(description="Export trained YOLO to ONNX / Core ML")
    p.add_argument("--weights", type=str, required=True, help="Path to trained .pt (e.g., runs/exp/weights/best.pt)")
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--opset", type=int, default=12)
    p.add_argument("--outdir", type=str, default="exports")
    p.add_argument("--coreml", action="store_true", help="Also export to Core ML (requires macOS)")
    return p.parse_args()


def main():
    args = parse_args()
    w = Path(args.weights)
    if not w.exists():
        raise SystemExit(f"Weights not found: {w}")

    model = YOLO(str(w))
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    print("Exporting ONNX...")
    onnx_file = model.export(format="onnx", imgsz=args.imgsz, opset=args.opset, optimize=True)
    print("ONNX saved:", onnx_file)

    if args.coreml:
        try:
            print("Exporting Core ML...")
            mlmodel = model.export(format="coreml", imgsz=args.imgsz)
            print("Core ML saved:", mlmodel)
        except Exception as e:
            print("Core ML export failed (likely not on macOS):", e)


if __name__ == "__main__":
    main()
