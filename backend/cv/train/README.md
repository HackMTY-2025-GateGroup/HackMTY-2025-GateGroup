
## YOLO Training & Inference for Trolley Product Detection

This directory contains scripts and configuration for training and running a YOLOv8 object detection model for trolley/tray product detection.

### 🎯 Overview

The system uses two complementary approaches for occupancy analysis:

1. **Object Detection (YOLO)**: Detects individual products (cans, bottles, cookies, etc.)
2. **Visual Occupancy Analysis**: Estimates fill level (0-10 scale) based on image analysis

### 📦 Requirements

```bash
pip install -r requirements.txt
```

The requirements include:
- `ultralytics` - YOLOv8 training and inference
- `opencv-python` - Visual analysis and image processing
- `pillow` - Image handling
- `numpy` - Array operations
- `torch` - PyTorch backend (auto-installed by ultralytics)

### 🏋️ Training

#### 1. Prepare Your Dataset

Create a YOLO-format dataset:

```
dataset/
├── images/
│   ├── train/
│   │   ├── image1.jpg
│   │   ├── image2.jpg
│   │   └── ...
│   └── val/
│       ├── val1.jpg
│       └── ...
└── labels/
    ├── train/
    │   ├── image1.txt
    │   ├── image2.txt
    │   └── ...
    └── val/
        ├── val1.txt
        └── ...
```

**Label Format** (one line per detection in `image.txt`):
```
<class_id> <x_center> <y_center> <width> <height>
```

Where coordinates are normalized to [0, 1].

#### 2. Class Mapping

Update `data.yaml` with your classes:

```yaml
names:
  0: can_355ml
  1: water_1_5l
  2: juice_946ml
  3: cookie_30g      # 🍪 Cookies/snacks
  4: coke_1_5l
```

**Important**: For cookies and small snacks, ensure you have sufficient training samples (at least 20-50 images per class).

#### 3. Train the Model

```bash
# Basic training
python train_yolo.py --data data.yaml --model yolov8n.pt --epochs 50

# Advanced training with parameters
python train_yolo.py \
  --data data.yaml \
  --model yolov8n.pt \
  --epochs 100 \
  --imgsz 640 \
  --batch 16 \
  --device 0 \
  --patience 20 \
  --lr0 0.01 \
  --weight_decay 0.0005
```

**Training Parameters**:
- `--epochs`: Number of training epochs (50-100 recommended)
- `--imgsz`: Image size for training (640 or 960)
- `--batch`: Batch size (adjust based on GPU memory)
- `--device`: GPU device ('0' for GPU, 'cpu' for CPU)
- `--patience`: Early stopping patience (stop if no improvement)
- `--lr0`: Initial learning rate
- `--weight_decay`: L2 regularization

#### 4. Training with Cookie Optimization

To improve cookie detection:

1. **Increase training data**: Collect 50+ images with various cookie angles and lighting
2. **Use smaller model**: `yolov8n.pt` (nano) trains faster, `yolov8s.pt` (small) is more accurate
3. **Augmentation**: The training script includes:
   - Horizontal flips (50%)
   - Mosaic augmentation
   - Mixup augmentation
   - Color space adjustments (HSV)

### 🔍 Inference

#### 1. Quick Inference (Object Detection)

```bash
python quick_infer.py \
  --weights runs/trolley_boot_bottle/weights/best.pt \
  --image path/to/image.jpg \
  --imgsz 960 \
  --conf 0.15
```

Output JSON:
```json
{
  "frame": {"w": 1280, "h": 720},
  "detections": [
    {
      "class": "can_355ml",
      "score": 0.92,
      "bbox": [100, 150, 50, 120],
      "frame": {"w": 1280, "h": 720}
    }
  ]
}
```

#### 2. Visual Occupancy Analysis

```bash
python visual_occupancy.py \
  --image path/to/image.jpg \
  --debug
```

Output JSON:
```json
{
  "fill_percent": 75.42,
  "fill_score": 7.54,
  "vertical_score": 9,
  "combined_score": 8.27,
  "final_score": 8.27,
  "category": "nearly_full",
  "detail": {
    "vertical_distribution": {
      "top_third_percent": 45.2,
      "middle_third_percent": 35.1,
      "bottom_third_percent": 19.7
    }
  }
}
```

**Score Interpretation**:
- 0-1: Empty
- 1-3: Sparse
- 3-5: Partially filled
- 5-7: Good fill
- 7-9: Nearly full
- 9-10: Full/Overflowing

### 📊 Model Architecture

- **Model**: YOLOv8 (nano, small, or medium)
- **Input**: RGB images (640x640 or 960x960)
- **Output**: Bounding boxes with class labels and confidence scores

### 🚀 Using Trained Model in Backend

1. Train model and get `best.pt`
2. Copy to `backend/cv/train/`:
   ```bash
   cp runs/trolley_boot_bottle/weights/best.pt backend/cv/train/trolley_best.pt
   ```
3. Set environment variable:
   ```bash
   export YOLO_WEIGHTS=backend/cv/train/trolley_best.pt
   ```
4. Server will automatically use it for inference

### 🔧 Troubleshooting

#### Model not detecting cookies?
- ❌ **Not enough training data**: Collect more cookie images (50+)
- ❌ **Poor quality labels**: Verify bounding boxes are correctly annotated
- ❌ **Low confidence threshold**: Lower `--conf` parameter in quick_infer.py
- ✅ **Solution**: Increase training epochs to 100, use data augmentation

#### Slow inference?
- Use `yolov8n.pt` (nano) instead of larger models
- Reduce `--imgsz` to 640
- Run on GPU: `export CUDA_VISIBLE_DEVICES=0`

#### Visual occupancy not detecting items?
- Verify lighting is adequate
- Ensure products are visible against background
- Check that products are not white/light-colored (script assumes products are darker)
- Add `--debug` flag to save mask images for inspection

### 📝 Tips for Better Results

1. **Diverse Data**: Train with images from different angles, lighting, and product configurations
2. **Balanced Classes**: Ensure roughly equal samples per class
3. **Regular Testing**: Validate on test set after each 10 epochs
4. **Confidence Tuning**: Lower confidence threshold for sparse detections, higher for false positives
5. **Fine-tuning**: Start with pretrained yolov8n.pt, fine-tune on your dataset

### 📚 References

- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [YOLO Format Guide](https://docs.roboflow.com/formats/yolo-darknet-txt)
- [Training Best Practices](https://docs.ultralytics.com/yolov8/train/)
