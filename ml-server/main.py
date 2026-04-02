from contextlib import asynccontextmanager
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
import os
import traceback

os.environ["TF_USE_LEGACY_KERAS"] = "1"

# ── Oral model config ──────────────────────────────────────────────────────────
ORAL_MODEL_PATH   = "./stage2_final_model.keras"
ORAL_WEIGHTS_PATH = "./stage2_best_weights.h5"
ORAL_LABELS       = ["Calculus", "Caries", "Gingivitis", "Mouth Ulcer",
                     "Tooth Discoloration", "Hypodontia", "Normal"]
ORAL_IMG_SIZE     = (224, 224)

# ── Skin model config ──────────────────────────────────────────────────────────
SKIN_MODEL_PATH   = "./skinDiseaseVGG19.h5"
SKIN_LABELS       = [
    "Acne and Rosacea",
    "Actinic Keratosis / Basal Cell Carcinoma",
    "Eczema",
    "Melanoma / Skin Cancer",
    "Psoriasis / Lichen Planus",
    "Tinea / Ringworm / Candidiasis",
    "Urticaria / Hives",
    "Nail Fungus",
]
SKIN_IMG_SIZE     = (32, 32)

# ── Eye model config ───────────────────────────────────────────────────────────
EYE_MODEL_PATH    = "./eye_disease_model.h5"
EYE_LABELS        = ["Cataract", "Diabetic Retinopathy", "Glaucoma", "Normal"]
EYE_IMG_SIZE      = (224, 224)

oral_model = None
skin_model = None
eye_model  = None
load_error = None


# ── Loaders ────────────────────────────────────────────────────────────────────
def try_load_oral_model():
    import tensorflow as tf
    try:
        print("🔄 Oral Attempt 1: standard load...")
        m = tf.keras.models.load_model(ORAL_MODEL_PATH, compile=False)
        print("✅ Oral Attempt 1 succeeded!")
        return m
    except Exception as e:
        print(f"❌ Oral Attempt 1 failed: {e}")
    try:
        print("🔄 Oral Attempt 2: with custom_objects...")
        m = tf.keras.models.load_model(ORAL_MODEL_PATH, compile=False,
            custom_objects={"Normalization": tf.keras.layers.Normalization})
        print("✅ Oral Attempt 2 succeeded!")
        return m
    except Exception as e:
        print(f"❌ Oral Attempt 2 failed: {e}")
    try:
        print("🔄 Oral Attempt 3: build EfficientNetB0 + load weights...")
        base = tf.keras.applications.EfficientNetB0(include_top=False, weights=None, input_shape=(224, 224, 3))
        x    = tf.keras.layers.GlobalAveragePooling2D()(base.output)
        x    = tf.keras.layers.Dense(256, activation="relu")(x)
        x    = tf.keras.layers.Dropout(0.3)(x)
        out  = tf.keras.layers.Dense(len(ORAL_LABELS), activation="softmax")(x)
        m    = tf.keras.Model(inputs=base.input, outputs=out)
        if os.path.exists(ORAL_WEIGHTS_PATH):
            m.load_weights(ORAL_WEIGHTS_PATH, by_name=True, skip_mismatch=True)
            print("✅ Oral Attempt 3 succeeded with weights!")
        else:
            print("⚠️  No oral weights file found")
        return m
    except Exception as e:
        print(f"❌ Oral Attempt 3 failed: {e}")
        traceback.print_exc()
    return None


def try_load_skin_model():
    import tensorflow as tf
    try:
        print("🔄 Skin: loading skinDiseaseVGG19.h5 ...")
        m = tf.keras.models.load_model(SKIN_MODEL_PATH, compile=False)
        print("✅ Skin model loaded!")
        return m
    except Exception as e:
        print(f"❌ Skin model failed: {e}")
        traceback.print_exc()
    return None


def try_load_eye_model():
    import tensorflow as tf

    # Attempt 1 — standard load
    try:
        print("🔄 Eye Attempt 1: standard load...")
        m = tf.keras.models.load_model(EYE_MODEL_PATH, compile=False)
        print("✅ Eye Attempt 1 succeeded!")
        return m
    except Exception as e:
        print(f"❌ Eye Attempt 1 failed: {e}")

    # Attempt 2 — patch batch_shape → shape in InputLayer config
    try:
        print("🔄 Eye Attempt 2: patching InputLayer batch_shape...")
        import h5py, json

        with h5py.File(EYE_MODEL_PATH, "r") as f:
            model_config = json.loads(f.attrs["model_config"])

        def patch_config(cfg):
            if isinstance(cfg, dict):
                if cfg.get("class_name") in ("InputLayer", "input_layer") and "batch_shape" in cfg.get("config", {}):
                    batch_shape = cfg["config"].pop("batch_shape")
                    cfg["config"]["shape"] = batch_shape[1:]  # remove batch dim
                    cfg["config"].pop("sparse", None)
                for v in cfg.values():
                    patch_config(v)
            elif isinstance(cfg, list):
                for item in cfg:
                    patch_config(item)

        patch_config(model_config)

        m = tf.keras.Model.from_config(model_config)
        m.load_weights(EYE_MODEL_PATH, by_name=False, skip_mismatch=True)
        print("✅ Eye Attempt 2 succeeded with patched config!")
        return m
    except Exception as e:
        print(f"❌ Eye Attempt 2 failed: {e}")

    # Attempt 3 — build CNN manually and load weights
    try:
        print("🔄 Eye Attempt 3: build VGG16 + load weights...")
        base = tf.keras.applications.VGG16(
            include_top=False, weights=None, input_shape=(224, 224, 3)
        )
        x   = tf.keras.layers.GlobalAveragePooling2D()(base.output)
        x   = tf.keras.layers.Dense(256, activation="relu")(x)
        x   = tf.keras.layers.Dropout(0.3)(x)
        out = tf.keras.layers.Dense(len(EYE_LABELS), activation="softmax")(x)
        m   = tf.keras.Model(inputs=base.input, outputs=out)
        m.load_weights(EYE_MODEL_PATH, by_name=True, skip_mismatch=True)
        print("✅ Eye Attempt 3 succeeded with VGG16 + weights!")
        return m
    except Exception as e:
        print(f"❌ Eye Attempt 3 failed: {e}")

    # Attempt 4 — build EfficientNetB0 + load weights
    try:
        print("🔄 Eye Attempt 4: build EfficientNetB0 + load weights...")
        base = tf.keras.applications.EfficientNetB0(
            include_top=False, weights=None, input_shape=(224, 224, 3)
        )
        x   = tf.keras.layers.GlobalAveragePooling2D()(base.output)
        x   = tf.keras.layers.Dense(256, activation="relu")(x)
        x   = tf.keras.layers.Dropout(0.3)(x)
        out = tf.keras.layers.Dense(len(EYE_LABELS), activation="softmax")(x)
        m   = tf.keras.Model(inputs=base.input, outputs=out)
        m.load_weights(EYE_MODEL_PATH, by_name=True, skip_mismatch=True)
        print("✅ Eye Attempt 4 succeeded with EfficientNetB0 + weights!")
        return m
    except Exception as e:
        print(f"❌ Eye Attempt 4 failed: {e}")
        traceback.print_exc()

    return None


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global oral_model, skin_model, eye_model, load_error
    print(f"📂 Working dir : {os.getcwd()}")
    print(f"📄 Files       : {os.listdir('.')}")

    m = try_load_oral_model()
    if m: oral_model = m; print("🎉 Oral model ready!")
    else: load_error = "Oral model failed."; print(f"❌ {load_error}")

    s = try_load_skin_model()
    if s: skin_model = s; print("🎉 Skin model ready!")
    else: print("❌ Skin model failed to load.")

    e = try_load_eye_model()
    if e: eye_model = e; print("🎉 Eye model ready!")
    else: print("❌ Eye model failed to load.")

    yield
    print("👋 Shutting down.")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="MediMate ML Server", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/")
def health():
    return {
        "status": "ok",
        "oral_model_loaded": oral_model is not None,
        "skin_model_loaded": skin_model is not None,
        "eye_model_loaded":  eye_model  is not None,
        "load_error": load_error,
    }


# ── Helper: generic predict ────────────────────────────────────────────────────
def run_prediction(model, img_bytes, img_size, labels):
    img       = Image.open(io.BytesIO(img_bytes)).convert("RGB").resize(img_size)
    arr       = np.expand_dims(np.array(img) / 255.0, axis=0)
    preds     = model.predict(arr, verbose=0)
    idx       = int(np.argmax(preds[0]))
    conf      = float(np.max(preds[0])) * 100
    label     = labels[idx] if idx < len(labels) else f"Class {idx}"
    all_preds = sorted(
        [{"label": labels[i] if i < len(labels) else f"Class {i}",
          "confidence": round(float(p) * 100, 2)} for i, p in enumerate(preds[0])],
        key=lambda x: x["confidence"], reverse=True
    )
    return label, round(conf, 2), all_preds[:3]


# ── Oral ───────────────────────────────────────────────────────────────────────
@app.post("/predict/oral")
async def predict_oral(file: UploadFile = File(...)):
    if oral_model is None:
        raise HTTPException(503, detail=f"Oral model not loaded: {load_error}")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="File must be an image.")
    try:
        label, conf, all_preds = run_prediction(oral_model, await file.read(), ORAL_IMG_SIZE, ORAL_LABELS)
        advice = get_oral_advice(label)
        return JSONResponse({"success": True, "prediction": label, "confidence": conf,
            "severity": advice["severity"], "description": advice["description"],
            "recommendation": advice["recommendation"], "all_predictions": all_preds})
    except Exception as e:
        traceback.print_exc(); raise HTTPException(500, detail=str(e))


# ── Skin ───────────────────────────────────────────────────────────────────────
@app.post("/predict/skin")
async def predict_skin(file: UploadFile = File(...)):
    if skin_model is None:
        raise HTTPException(503, detail="Skin model not loaded.")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="File must be an image.")
    try:
        label, conf, all_preds = run_prediction(skin_model, await file.read(), SKIN_IMG_SIZE, SKIN_LABELS)
        advice = get_skin_advice(label)
        return JSONResponse({"success": True, "prediction": label, "confidence": conf,
            "severity": advice["severity"], "description": advice["description"],
            "recommendation": advice["recommendation"], "all_predictions": all_preds})
    except Exception as e:
        traceback.print_exc(); raise HTTPException(500, detail=str(e))


# ── Eye ────────────────────────────────────────────────────────────────────────
@app.post("/predict/eye")
async def predict_eye(file: UploadFile = File(...)):
    if eye_model is None:
        raise HTTPException(503, detail="Eye model not loaded.")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="File must be an image.")
    try:
        label, conf, all_preds = run_prediction(eye_model, await file.read(), EYE_IMG_SIZE, EYE_LABELS)
        advice = get_eye_advice(label)
        return JSONResponse({"success": True, "prediction": label, "confidence": conf,
            "severity": advice["severity"], "description": advice["description"],
            "recommendation": advice["recommendation"], "all_predictions": all_preds})
    except Exception as e:
        traceback.print_exc(); raise HTTPException(500, detail=str(e))


# ── Advice maps ────────────────────────────────────────────────────────────────
def get_oral_advice(condition: str) -> dict:
    return {
        "Calculus":            {"severity": "moderate", "description": "Dental calculus (tartar) detected.",    "recommendation": "Visit a dentist for professional scaling."},
        "Caries":              {"severity": "high",     "description": "Tooth decay (cavities) detected.",      "recommendation": "See a dentist as soon as possible."},
        "Gingivitis":          {"severity": "moderate", "description": "Gum inflammation detected.",            "recommendation": "Brush twice daily and floss regularly."},
        "Mouth Ulcer":         {"severity": "low",      "description": "Mouth ulcer detected.",                 "recommendation": "Use saltwater rinse. See a doctor if persists over 3 weeks."},
        "Tooth Discoloration": {"severity": "low",      "description": "Tooth discoloration detected.",         "recommendation": "Consult a dentist for whitening options."},
        "Hypodontia":          {"severity": "moderate", "description": "Missing teeth detected.",               "recommendation": "Consult an orthodontist for treatment options."},
        "Normal":              {"severity": "none",     "description": "No oral disease detected. Looks good!", "recommendation": "Keep brushing and visit a dentist every 6 months."},
    }.get(condition, {"severity": "unknown", "description": f"{condition} detected.", "recommendation": "Consult a dentist."})


def get_skin_advice(condition: str) -> dict:
    return {
        "Acne and Rosacea":                         {"severity": "low",      "description": "Acne or rosacea detected.",                      "recommendation": "Use gentle cleansers. Consult a dermatologist for persistent cases."},
        "Actinic Keratosis / Basal Cell Carcinoma": {"severity": "high",     "description": "Possible pre-cancerous or cancerous skin lesion.", "recommendation": "See a dermatologist immediately for biopsy and treatment."},
        "Eczema":                                   {"severity": "moderate", "description": "Eczema (atopic dermatitis) detected.",             "recommendation": "Moisturize regularly. Avoid triggers. Consult a dermatologist."},
        "Melanoma / Skin Cancer":                   {"severity": "high",     "description": "Possible melanoma or skin cancer detected.",       "recommendation": "Seek urgent dermatology consultation. Do not delay."},
        "Psoriasis / Lichen Planus":                {"severity": "moderate", "description": "Psoriasis or lichen planus detected.",             "recommendation": "Consult a dermatologist for topical or systemic treatment."},
        "Tinea / Ringworm / Candidiasis":           {"severity": "low",      "description": "Fungal skin infection detected.",                  "recommendation": "Apply antifungal cream. Keep area clean and dry."},
        "Urticaria / Hives":                        {"severity": "moderate", "description": "Urticaria (hives) detected.",                     "recommendation": "Identify and avoid allergens. Antihistamines may help."},
        "Nail Fungus":                              {"severity": "low",      "description": "Nail fungal infection detected.",                  "recommendation": "Use antifungal nail treatment. Keep nails trimmed and dry."},
    }.get(condition, {"severity": "unknown", "description": f"{condition} detected.", "recommendation": "Consult a dermatologist."})


def get_eye_advice(condition: str) -> dict:
    return {
        "Cataract":             {"severity": "moderate", "description": "Cataract detected — clouding of the eye lens.",                    "recommendation": "Consult an ophthalmologist. Surgery is often effective and safe."},
        "Diabetic Retinopathy": {"severity": "high",     "description": "Diabetic retinopathy — damage to retinal blood vessels detected.", "recommendation": "See an eye specialist urgently. Control blood sugar levels immediately."},
        "Glaucoma":             {"severity": "high",     "description": "Glaucoma detected — increased pressure damaging the optic nerve.", "recommendation": "Seek immediate ophthalmology consultation to prevent vision loss."},
        "Normal":               {"severity": "none",     "description": "No eye disease detected. Eyes appear healthy!",                    "recommendation": "Get a routine eye check every year, especially if diabetic or over 40."},
    }.get(condition, {"severity": "unknown", "description": f"{condition} detected.", "recommendation": "Consult an ophthalmologist."})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)