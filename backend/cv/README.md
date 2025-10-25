# Computer Vision API (Integrated)

This folder contains the CV endpoints integrated into the backend so they start automatically with `npm run dev`.

## Routes

- POST `/api/occupancy/` — submit an already computed `occupancyPercent` (0–100) and optional detections.
- POST `/api/occupancy/detections` — send raw detections; server computes occupancy using Dimensions (strategies: `count`, `area`, `volume`).
- POST `/api/occupancy/image` — upload an image (`multipart/form-data`, field `image`); server stores it and can optionally try server-side inference when available.
- GET  `/api/occupancy/latest?trolleyId=...|trolleyCode=...` — fetch latest analysis row.

## Dimensions

Edit `cv/Dimensions.js` (`cv/util/Dimensions.js`) with real trolley and item measurements to improve accuracy.

## Notes

- Server-side YOLO via `onnxruntime-node` is optional and currently stubbed; client/device inference (MLX/YOLO) is preferred.
- Uploads are saved under `backend/storage/uploads/` by default (configurable via `CV_STORAGE_DIR`).