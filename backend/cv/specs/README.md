# Cómo describir tu carrito sin fotos

Si aún no tienes imágenes, puedes definir la organización y dimensiones del carrito para que el servidor calcule porcentajes por charola a partir de detecciones. Dos piezas:

1) Un archivo de especificación de bandejas/productos (JSON) en `cv/specs/`.
2) Medidas físicas (cm) en `cv/util/Dimensions.js` para mejorar estrategias basadas en volumen/área.

## 1) Crea tu spec JSON

Parte de `cv/specs/template.mx.json` y guárdalo con un nombre, por ejemplo: `cv/specs/a320-standard.mx.json`.

Esquema mínimo del spec:

```
{
  "name": "a320-standard",
  "version": "0.1.0",
  "image": { "orientation": "top-down", "roi": [0, 0, 1, 1] },
  "class_alias": {
    "can":    ["can", "bottle", "cup"],
    "bottle": ["bottle", "cup"],
    "snack":  ["snack", "cake", "donut", "sandwich"]
  },
  "trays": [
    { "id": "left-top",   "label": "Snacks",  "roi": [0.00, 0.00, 0.33, 0.25], "capacity": 28, "classes": ["snack"] },
    { "id": "middle-top", "label": "Botellas","roi": [0.33, 0.00, 0.34, 0.25], "capacity": 12, "classes": ["bottle"] },
    { "id": "right-top",  "label": "Latas",   "roi": [0.67, 0.00, 0.33, 0.25], "capacity": 24, "classes": ["can"] }
  ]
}
```

- `roi` de cada charola es `[x, y, w, h]` normalizado (0..1) sobre la imagen. Si la cámara ve el carrito completo de arriba, puedes dividir el ancho en terceras partes como en el ejemplo.
- `capacity` = cuántas piezas caben en esa charola (la forma más estable del MVP).
- `classes` = qué categorías acepta esa charola (usamos alias para mapear clases del detector; por ejemplo, si el modelo sólo da `bottle`/`cup`, puedes contarlas como `can` temporalmente).

Consejo: si conoces filas/columnas (grid) por charola, calcula `capacity = filas * columnas` y define el `roi` a la zona física de esa charola.

### Cómo convertir centímetros a ROI normalizado

1. Ancho/alto útiles internos del carrito: `W_carrito`, `H_carrito` (cm).
2. Si la foto cubre exactamente el carrito, entonces `x_norm = x_cm / W_carrito`, `y_norm = y_cm / H_carrito`, `w_norm = w_cm / W_carrito`, `h_norm = h_cm / H_carrito`.
3. Sin foto, usa una partición lógica: por ejemplo 3 columnas → `w_norm = 1/3` y `x_norm = 0, 1/3, 2/3`.

## 2) Añade medidas físicas (opcional pero recomendado)

Edita `cv/util/Dimensions.js`:

- `trolley`: ancho/alto/fondo internos y `expectedItemCapacity` global de referencia.
- `items`: dimensiones nominales por clase (ej. `can`, `bottle`, `snack`) para estrategias basadas en volumen/área.

Ejemplo de item personalizado:

```
items: {
  can355: { h: 12, d: 6.6, w: 6.6, volumeCm3: Math.PI * (6.6/2) ** 2 * 12 },
  bottle500: { h: 21, d: 6.5, w: 6.5, volumeCm3: Math.PI * (6.5/2) ** 2 * 21 }
}
```

Luego usa esas clases (o mapea alias en el spec) para que el conteo/volumen sea consistente.

## Cómo probar

1) Arranca el backend y llama:
   - `GET /api/occupancy/specs` → ver nombres de specs.
   - `GET /api/occupancy/specs/a320-standard` → obtiene tu spec.
2) Envía detecciones al MVP:
   - `POST /api/occupancy/estimate` con body:
     ```json
     {
       "specName": "a320-standard",
       "frame": { "w": 1080, "h": 1920 },
       "detections": [ { "class": "bottle", "bbox": [780, 80, 60, 60] } ]
     }
     ```
   - Respuesta: `{ overallPercent, trays:[{ id,label,count,capacity,percent }] }`.

Con esto puedes entregar toda la estructura del carrito sin fotos y empezar a obtener porcentajes inmediatamente cuando el cliente (MLX/YOLO) mande detecciones.
