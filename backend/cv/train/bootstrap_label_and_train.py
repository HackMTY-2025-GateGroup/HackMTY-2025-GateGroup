import argparse
from pathlib import Path
import random
import shutil

try:
    from ultralytics import YOLO
except Exception as e:
    raise SystemExit("Ultralytics not installed. Run: pip install ultralytics") from e


def yolo_box_to_norm(xyxy, w, h):
    x1, y1, x2, y2 = xyxy
    bw = max(1.0, x2 - x1)
    bh = max(1.0, y2 - y1)
    cx = x1 + bw / 2.0
    cy = y1 + bh / 2.0
    return cx / w, cy / h, bw / w, bh / h


def auto_label(products_model, images, out_labels, min_conf=0.15):
    out_labels.mkdir(parents=True, exist_ok=True)
    names = products_model.names if hasattr(products_model, 'names') else {}
    for img_path in images:
        results = products_model.predict(source=str(img_path), imgsz=960, conf=min_conf, iou=0.6, verbose=False)
        if not results:
            (out_labels / (img_path.stem + '.txt')).write_text('')
            continue
        r0 = results[0]
        lines = []
        for b in r0.boxes:
            cls_id = int(b.cls.item())
            label = str(names.get(cls_id, str(cls_id))).lower()
            if label != 'bottle':
                continue
            x1, y1, x2, y2 = [float(x) for x in b.xyxy[0].tolist()]
            cx, cy, bw, bh = yolo_box_to_norm((x1, y1, x2, y2), r0.orig_img.shape[1], r0.orig_img.shape[0])
            # Single-class dataset: class 0 == 'bottle'
            lines.append(f"0 {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}")
        (out_labels / (img_path.stem + '.txt')).write_text('\n'.join(lines))


def write_bootstrap_yaml(root):
    yaml = (
        "path: ./dataset\n"
        "train: images/train_boot\n"
        "val: images/val_boot\n\n"
        "names:\n  0: bottle\n"
    )
    (root / 'bootstrap.yaml').write_text(yaml)


def main():
    p = argparse.ArgumentParser(description='Bootstrap-label current images and train a quick detector for bottle class')
    p.add_argument('--epochs', type=int, default=12)
    p.add_argument('--batch', type=int, default=16)
    p.add_argument('--model', type=str, default='yolov8n.pt')
    p.add_argument('--name', type=str, default='trolley_boot_bottle')
    args = p.parse_args()

    root = Path(__file__).parent
    ds = root / 'dataset'
    img_train = ds / 'images' / 'train'
    all_imgs = sorted([p for p in img_train.glob('*.*') if p.suffix.lower() in {'.jpg', '.jpeg', '.png'}])
    if not all_imgs:
        raise SystemExit(f'No images found at {img_train}')

    # Create bootstrap splits
    img_train_boot = ds / 'images' / 'train_boot'
    img_val_boot = ds / 'images' / 'val_boot'
    lbl_train_boot = ds / 'labels' / 'train_boot'
    lbl_val_boot = ds / 'labels' / 'val_boot'
    for d in (img_train_boot, img_val_boot, lbl_train_boot, lbl_val_boot):
        d.mkdir(parents=True, exist_ok=True)

    random.seed(42)
    random.shuffle(all_imgs)
    k = max(1, int(len(all_imgs) * 0.8))
    tr_imgs, va_imgs = all_imgs[:k], all_imgs[k:]
    if not va_imgs:
        va_imgs = all_imgs[-1:]
        tr_imgs = all_imgs[:-1] or all_imgs

    # Copy images to boot folders
    for pth in tr_imgs:
        shutil.copy2(pth, img_train_boot / pth.name)
    for pth in va_imgs:
        shutil.copy2(pth, img_val_boot / pth.name)

    # Load base model and auto-label only 'bottle'
    base = YOLO(str(root / args.model))
    auto_label(base, [img_train_boot / p.name for p in tr_imgs], lbl_train_boot)
    auto_label(base, [img_val_boot / p.name for p in va_imgs], lbl_val_boot)

    # Write lightweight YAML
    write_bootstrap_yaml(root)

    # Train quick detector
    model = YOLO(str(root / args.model))
    results = model.train(
        data=str(root / 'bootstrap.yaml'),
        epochs=args.epochs,
        imgsz=960,
        batch=args.batch,
        project=str(root / 'runs'),
        name=args.name,
        device='cpu',
        seed=42,
        patience=5,
        lr0=0.01,
        weight_decay=0.0005,
        workers=4,
        mosaic=0.5,
        mixup=0.1,
        fliplr=0.5,
    )
    print('Bootstrap training complete. Weights:', results.save_dir)


if __name__ == '__main__':
    main()


