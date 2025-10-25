# Setup rápido (Windows PowerShell)



py train_yolo.py --data data.yaml --model yolov8n.pt --epochs 20 --imgsz 640 --batch 16 --name gategroup-v1




```powershell
# 1) Crear el entorno virtual en esta carpeta
python -m venv .venv

# 2) Permitir ejecutar el script de activación en esta sesión
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

# 3) Activar el entorno virtual (nota el prefijo & y la ruta con .venv)
& .\.venv\Scripts\Activate.ps1

# 4) Instalar dependencias
pip install -r requirements.txt
```

Si prefieres no cambiar la política, puedes usar directamente el Python del venv sin “activar”:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe train_yolo.py --data data.yaml --model yolov8n.pt --epochs 20 --imgsz 640 --batch 16 --name gategroup-pretrain
```
# descarga
python -m venv .venv

# activate 

# YOLO Training for Trolley Products

This folder provides a minimal, reproducible pipeline to train a local YOLO model for your trolley items and then export it for Web (ONNX Runtime Web) and iPhone (Core ML / MLX Swift via Core ML).

## Classes

Default classes (edit `data.sample.yaml` if needed):
- 0: can_355ml
- 1: water_1_5l
- 2: juice_946ml
- 3: cookie_30g
- 4: coke_1_5l

You can add more (e.g., tray_front/tray_back) if you also annotate them.

## Dataset format

Use standard YOLO format:
```
<dataset>/
  images/
    train/  *.jpg|*.png
    val/    *.jpg|*.png
    test/   *.jpg|*.png (optional)
  labels/
    train/  *.txt  (same basenames as images)
    val/    *.txt
    test/   *.txt  (optional)
```
Each label .txt line: `class x_center y_center width height` (normalized to [0,1]).

Update `data.sample.yaml` and set `path` to your dataset root. Rename it to `data.yaml` if you want to keep defaults.

## Install

```powershell
cd backend/cv/train
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Train

```powershell
# If your dataset yaml is backend/cv/train/data.yaml
python train_yolo.py --data data.yaml --model yolov8n.pt --epochs 50 --imgsz 640 --batch 16 --device auto --name gategroup-v1
```
- Replace `yolov8n.pt` with other variants (yolov8s.pt, yolov10n.pt, etc.) if you prefer.
- Results will be under `runs/<name>/`, best weights at `runs/<name>/weights/best.pt`.

## Export

Export to ONNX (for Web):
```powershell
python export_model.py --weights runs/gategroup-v1/weights/best.pt --imgsz 640 --opset 12 --outdir exports
```
This produces an ONNX file consumable by ONNX Runtime (web or node). For Web, use ONNX Runtime Web.

Optionally export to Core ML (iPhone):
```powershell
# Requires macOS; will likely fail on Windows.
python export_model.py --weights runs/gategroup-v1/weights/best.pt --imgsz 640 --coreml --outdir exports
```
On iPhone, use the Core ML model directly, or wrap it under MLX Swift as needed.

## Integration

- Web: Load ONNX model in the browser (onnxruntime-web) and run detection locally; then POST detections to:
  - `/api/occupancy/estimate-volume` (liters/percent per tray)
  - `/api/occupancy/estimate-doubleside` (rows with front/back)
- iPhone: Use Core ML for on-device inference; map class IDs to the names above, send detections to the same endpoints.

## Tips for accuracy

- Label both front and back views (separado), y si es útil, añade clases específicas para packs.
- Mantén consistencia en distancias/cámara; usa un marcador de escala si quieres métricas métricas de tamaño a partir de imagen.
- Aumenta con flips/escala/luz (ya configurado en el script) y evalúa con `val` realistas.

## Next steps

- Fine-tune with more samples de tus `Assets/CV-images/` (anota y entrena).
- Si quieres segmentación (contornos), usa modelos `*-seg.pt` y ajusta el script (`task=segment`).
