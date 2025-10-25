# Computer Vision API (Integrated)

This folder contains the CV endpoints integrated into the backend so they start automatically with `npm run dev`.

## Routes

- POST `/api/occupancy/` — submit an already computed `occupancyPercent` (0–100) and optional detections.
- POST `/api/occupancy/detections` — send raw detections; server computes occupancy using Dimensions (strategies: `count`, `area`, `volume`).
- POST `/api/occupancy/image` — upload an image (`multipart/form-data`, field `image`); server stores it and can optionally try server-side inference when available.
- GET  `/api/occupancy/latest?trolleyId=...|trolleyCode=...` — fetch latest analysis row.
 - GET  `/api/occupancy/specs` — list available tray specs.
 - GET  `/api/occupancy/specs/:name` — fetch a tray spec JSON (e.g. `default.mx`).
 - POST `/api/occupancy/estimate` — compute per-tray percentages from client detections using a named spec.

## Dimensions

Edit `cv/Dimensions.js` (`cv/util/Dimensions.js`) with real trolley and item measurements to improve accuracy.

## Notes

- Server-side YOLO via `onnxruntime-node` is optional and currently stubbed; client/device inference (MLX/YOLO) is preferred.
- Uploads are saved under `backend/storage/uploads/` by default (configurable via `CV_STORAGE_DIR`).

## Tray specs and percentages (MVP)

- Specs live in `cv/specs/*.json` with normalized ROIs ([x,y,w,h] fractions in 0..1), capacities, and class aliases.
- Start with `cv/specs/default.mx.json` (based on the top-down photos you shared) or copy `template.mx.json` to define your own.
- To compute percentages:
	1) Run detection on the client (any model that returns boxes + class names).
	2) POST to `/api/occupancy/estimate` with:
		 - `specName`: e.g. `default.mx`
		 - `frame`: `{ w, h }` in pixels
		 - `detections`: array of `{ class, score?, bbox:[x,y,w,h] }`
	3) Response returns `{ overallPercent, trays:[{id,label,count,capacity,percent}] }`.

### How to get detections quickly (no custom training yet)

Option A — Frontend (JS) with Hugging Face Transformers (no native deps):

- Use `@xenova/transformers` with a DETR object-detection model in the browser; map classes to our spec aliases ("bottle", "cup", "cake", etc.).
- Send the detections to `/api/occupancy/estimate`.

Option B — Python script with Ultralytics YOLOv8 (fast to try):

1) `pip install ultralytics`
2) Small script to export detections (boxes + class names) and POST them to our endpoint.
3) Start with `yolov8n.pt` (COCO). For cans, map `bottle`/`cup` as aliases until we train a custom model.

When you're ready, we'll fine-tune a small YOLO on your specific classes (cans, bottles, snacks, trays) to improve accuracy.