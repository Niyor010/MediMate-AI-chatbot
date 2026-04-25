from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
import os
import traceback

# ── Model paths ───────────────────────────────────────────────────────────────
ORAL_MODEL_PATH = "./oral7_finetuned.h5"
SKIN_MODEL_PATH = "./skin7_finetuned.h5"

# ── Labels exactly as trained ─────────────────────────────────────────────────
# From training report classification report
ORAL_LABELS = [
    "Calculus",
    "Caries",
    "Gingivitis",
    "Healthy",
    "Hypodontia",
    "Tooth Discoloration",
    "Ulcer",
]

SKIN_LABELS = [
    "Acne",
    "Benign",
    "Eczema",
    "Infection",
    "Healthy",
    "Malign",
    "Pigment",
]

# ── Image size from training report: 256×256 ──────────────────────────────────
IMG_SIZE = (256, 256)

oral_model      = None
skin_model      = None
oral_error      = None
skin_error      = None
oral_input_size = IMG_SIZE
skin_input_size = IMG_SIZE

CONFIDENCE_THRESHOLD = 20.0


# ── EfficientNet preprocessing (CRITICAL — must match training) ───────────────
def efficientnet_preprocess(img: Image.Image, size: tuple) -> np.ndarray:
    """
    Preprocessing exactly as EfficientNet expects:
    - Resize to training size
    - Convert to float32
    - Scale to [0, 255] range (EfficientNet does its own internal normalization)
    - Do NOT divide by 255 manually — EfficientNet's preprocess_input does that
    """
    import tensorflow as tf
    img  = img.resize(size, Image.LANCZOS).convert("RGB")
    arr  = np.array(img, dtype=np.float32)        # keep in 0-255 range
    arr  = tf.keras.applications.efficientnet.preprocess_input(arr)
    return arr


def load_h5_model(path: str):
    try:
        import tf_keras as keras
        import tensorflow as tf
        m = keras.models.load_model(
            path,
            compile=False,
            custom_objects={
                "preprocess_input": tf.keras.applications.efficientnet.preprocess_input
            }
        )
        print(f"✅ Loaded via tf_keras: {path}")
        print(f"   Input shape : {m.input_shape}")
        print(f"   Output shape: {m.output_shape}")
        return m
    except Exception as e1:
        print(f"⚠️  tf_keras failed: {e1}")
        try:
            import tensorflow as tf
            m = tf.keras.models.load_model(path, compile=False)
            print(f"✅ Loaded via tf.keras: {path}")
            print(f"   Input shape : {m.input_shape}")
            print(f"   Output shape: {m.output_shape}")
            return m
        except Exception as e2:
            print(f"❌ Both loaders failed")
            print(f"   tf_keras : {e1}")
            print(f"   tf.keras : {e2}")
            traceback.print_exc()
            return None


def get_input_size(model) -> tuple:
    try:
        shape = model.input_shape
        h, w  = int(shape[1]), int(shape[2])
        print(f"   Auto-detected input size: {w}×{h}")
        return (w, h)
    except Exception:
        print(f"   Could not detect size, using {IMG_SIZE}")
        return IMG_SIZE


@asynccontextmanager
async def lifespan(app: FastAPI):
    global oral_model, skin_model, oral_error, skin_error
    global oral_input_size, skin_input_size

    print("=" * 60)
    print(f"📂 Dir  : {os.getcwd()}")
    print(f"📁 Files: {os.listdir('.')}")
    print("=" * 60)

    # Load oral model
    if os.path.exists(ORAL_MODEL_PATH):
        size_mb = os.path.getsize(ORAL_MODEL_PATH) / 1024 / 1024
        print(f"\n🦷 Loading oral model ({size_mb:.1f} MB)...")
        oral_model = load_h5_model(ORAL_MODEL_PATH)
        if oral_model:
            oral_input_size = get_input_size(oral_model)
        else:
            oral_error = "Failed to load oral model"
    else:
        oral_error = f"Not found: {ORAL_MODEL_PATH}"
        print(f"❌ {oral_error}")

    # Load skin model
    if os.path.exists(SKIN_MODEL_PATH):
        size_mb = os.path.getsize(SKIN_MODEL_PATH) / 1024 / 1024
        print(f"\n🩺 Loading skin model ({size_mb:.1f} MB)...")
        skin_model = load_h5_model(SKIN_MODEL_PATH)
        if skin_model:
            skin_input_size = get_input_size(skin_model)
        else:
            skin_error = "Failed to load skin model"
    else:
        skin_error = f"Not found: {SKIN_MODEL_PATH}"
        print(f"❌ {skin_error}")

    print("\n" + "=" * 60)
    print(f"🦷 Oral : {'✅ Ready input=' + str(oral_input_size) if oral_model else '❌ ' + str(oral_error)}")
    print(f"🩺 Skin : {'✅ Ready input=' + str(skin_input_size) if skin_model else '❌ ' + str(skin_error)}")
    print("=" * 60 + "\n")

    yield
    print("👋 Shutting down.")


app = FastAPI(title="MediMate ML Server", version="5.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {
        "status": "ok",
        "oral_model": oral_model is not None,
        "skin_model": skin_model is not None,
        "oral_input_size": oral_input_size,
        "skin_input_size": skin_input_size,
        "oral_error": oral_error,
        "skin_error": skin_error,
    }


# ── Core prediction with TTA ──────────────────────────────────────────────────
def predict(model, img_bytes: bytes, labels: list, input_size: tuple):
    """
    Use EfficientNet-correct preprocessing + TTA to get unbiased predictions.
    """
    import tensorflow as tf

    image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    image = image.resize(input_size, Image.LANCZOS)
    arr   = np.array(image, dtype=np.float32)

    preprocess = tf.keras.applications.efficientnet.preprocess_input

    # ── 5 TTA variants ────────────────────────────────────────────
    variants = [
        preprocess(arr.copy()),                               # original
        preprocess(np.fliplr(arr.copy())),                   # horizontal flip
        preprocess(np.flipud(arr.copy())),                   # vertical flip
        preprocess(np.clip(arr.copy() * 1.05, 0, 255)),      # slightly brighter
        preprocess(np.clip(arr.copy() * 0.95, 0, 255)),      # slightly darker
    ]

    batch    = np.stack(variants, axis=0)        # (5, H, W, 3)
    all_pred = model.predict(batch, verbose=0)   # (5, num_classes)
    preds    = np.mean(all_pred, axis=0)         # average

    # ── Debug log ─────────────────────────────────────────────────
    raw = {labels[i]: f"{preds[i]*100:.1f}%" for i in range(min(len(labels), len(preds)))}
    print(f"📊 Raw preds: {raw}")

    idx   = int(np.argmax(preds))
    conf  = float(np.max(preds)) * 100
    label = labels[idx] if idx < len(labels) else f"Class_{idx}"

    if conf < CONFIDENCE_THRESHOLD:
        label = "Uncertain"
        print(f"⚠️  Low confidence ({conf:.1f}%) → Uncertain")
    else:
        print(f"✅ Result: {label} ({conf:.1f}%)")

    all_p = sorted(
        [{"label": labels[i] if i < len(labels) else f"Class_{i}",
          "confidence": round(float(preds[i]) * 100, 2)}
         for i in range(len(preds))],
        key=lambda x: x["confidence"],
        reverse=True,
    )[:3]

    return label, round(conf, 2), all_p


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.post("/predict/oral")
async def predict_oral(file: UploadFile = File(...)):
    if oral_model is None:
        raise HTTPException(503, detail=f"Oral model not loaded: {oral_error}")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="File must be an image.")
    try:
        contents = await file.read()
        label, conf, all_p = predict(oral_model, contents, ORAL_LABELS, oral_input_size)
        advice = oral_advice(label)
        return JSONResponse({
            "success": True, "prediction": label, "confidence": conf,
            "severity": advice["severity"], "description": advice["description"],
            "recommendation": advice["recommendation"], "all_predictions": all_p,
        })
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, detail=str(e))


@app.post("/predict/skin")
async def predict_skin(file: UploadFile = File(...)):
    if skin_model is None:
        raise HTTPException(503, detail=f"Skin model not loaded: {skin_error}")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="File must be an image.")
    try:
        contents = await file.read()
        label, conf, all_p = predict(skin_model, contents, SKIN_LABELS, skin_input_size)
        advice = skin_advice(label)
        return JSONResponse({
            "success": True, "prediction": label, "confidence": conf,
            "severity": advice["severity"], "description": advice["description"],
            "recommendation": advice["recommendation"], "all_predictions": all_p,
        })
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, detail=str(e))


# ── Advice maps ───────────────────────────────────────────────────────────────
def oral_advice(condition: str) -> dict:
    m = {
        "Calculus":           {"severity": "moderate", "description": "Dental calculus (tartar) buildup detected.",        "recommendation": "Visit a dentist for professional scaling and cleaning."},
        "Caries":             {"severity": "high",     "description": "Tooth decay (dental caries) detected.",             "recommendation": "See a dentist as soon as possible to prevent further damage."},
        "Gingivitis":         {"severity": "moderate", "description": "Gum inflammation (gingivitis) detected.",           "recommendation": "Brush twice daily, floss regularly, and visit a dentist."},
        "Healthy":            {"severity": "none",     "description": "Your oral health looks great!",                     "recommendation": "Keep brushing twice daily and visit a dentist every 6 months."},
        "Hypodontia":         {"severity": "moderate", "description": "Missing teeth (hypodontia) detected.",              "recommendation": "Consult an orthodontist or dentist for implant or bridge options."},
        "Tooth Discoloration":{"severity": "low",      "description": "Tooth discoloration detected.",                    "recommendation": "Professional whitening may help. See a dentist for the cause."},
        "Ulcer":              {"severity": "low",      "description": "Mouth ulcer detected.",                             "recommendation": "Use saltwater rinse. See a doctor if it persists over 3 weeks."},
        "Uncertain":          {"severity": "unknown",  "description": "Could not determine condition clearly.",            "recommendation": "Please take a clearer photo in good lighting and try again."},
    }
    return m.get(condition, {"severity": "unknown", "description": f"{condition} detected.", "recommendation": "Consult a dentist."})


def skin_advice(condition: str) -> dict:
    m = {
        "Acne":       {"severity": "low",      "description": "Acne detected.",                          "recommendation": "Use gentle cleanser. See a dermatologist for severe cases."},
        "Benign":     {"severity": "low",      "description": "Benign skin condition detected.",          "recommendation": "Monitor the area. Consult a dermatologist if it changes."},
        "Eczema":     {"severity": "moderate", "description": "Eczema (atopic dermatitis) detected.",    "recommendation": "Use moisturizer, avoid triggers. Consult a dermatologist."},
        "Infection":  {"severity": "high",     "description": "Skin infection detected.",                 "recommendation": "See a doctor promptly for appropriate treatment."},
        "Healthy":    {"severity": "none",     "description": "Skin looks healthy!",                      "recommendation": "Maintain good skincare and use sunscreen daily."},
        "Malign":     {"severity": "high",     "description": "Possible malignant skin condition.",       "recommendation": "See a dermatologist or oncologist immediately for evaluation."},
        "Pigment":    {"severity": "low",      "description": "Pigmentation irregularity detected.",      "recommendation": "Consult a dermatologist for evaluation and treatment."},
        "Uncertain":  {"severity": "unknown",  "description": "Could not determine condition clearly.",   "recommendation": "Please retake in good lighting and try again."},
    }
    return m.get(condition, {"severity": "unknown", "description": f"{condition} detected.", "recommendation": "Consult a dermatologist."})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)