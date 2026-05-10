# Satya — AI Fake News Detector

Full-stack fake news detection combining a **React + TypeScript** frontend with a **Python FastAPI** backend powered by an **ML Ensemble + Rule Engine + Live News API Training**.

---

## Architecture

```
Satya/
├── backend/          ← Python FastAPI (ML engine)
│   ├── main.py       ← Single-file backend (all logic)
│   └── requirements.txt
├── src/              ← React + TypeScript frontend
│   ├── pages/Satya.tsx          ← Main page
│   ├── components/ResultsDisplay.tsx  ← Rich results UI
│   └── components/...
├── .env.example      ← Copy to .env
└── package.json
```

## How it works

1. **Live training** — on startup the backend fetches real headlines from NewsAPI / GNews / Guardian and trains two ML models against a curated fake-news dataset.
2. **ML Ensemble** — Logistic Regression + ANN (MLP) vote on the input text.
3. **Rule Engine** — 6 deterministic rules catch patterns ML misses (short unverified claims, low-cred sources, conspiracy keywords).
4. **Cross-check** — fetches related live news and computes cosine similarity to flag unsupported claims.
5. **Credibility scorer** — analyses sensational vs credibility language, numbers, caps ratio, exclamations.

---

## Setup

### 1. Backend (Python)

```bash
cd backend
pip install -r requirements.txt

# Optional: set API keys for live training data
export NEWSAPI_KEY=your_key_here
export GNEWS_KEY=your_key_here
export GUARDIAN_KEY=your_key_here

python main.py
# Backend starts on http://localhost:8000
```

> **Free API keys:**
> - NewsAPI: https://newsapi.org/register (100 req/day)
> - GNews: https://gnews.io (100 req/day)
> - Guardian: https://open-platform.theguardian.com (unlimited)
>
> Without keys the backend uses the built-in offline dataset — still works well.

### 2. Frontend (React)

```bash
# In the project root
cp .env.example .env
# Edit .env if backend runs on a different port

npm install
npm run dev
# Frontend starts on http://localhost:5173
```

---

## API

### `POST /verify`

```json
{
  "input": "Scientists confirm COVID variant is 30% more transmissible...",
  "source": "BBC",
  "language": "en"
}
```

Response includes:
- `verdict`: `"REAL"` or `"FAKE"`
- `trust_score`: 0–100
- `credibility_grade`: A / B / C / D
- `fake_probability` / `real_probability`
- `decision_method`: Rule Override or ML Ensemble
- `rule_fired` + `rule_reasons`
- `cross_check_similarity`
- `keywords`: top TF-IDF features with LR coefficients
- `trends`: Public Reaction, Viral Spread Risk, Economic Impact, Political Sensitivity
- `ml_models`: detailed LR + ANN breakdown
- `evidence`: fact-check resource links

---

## Features

- 🌐 **English / Hindi** UI toggle
- 📁 File upload support (paste or upload text)
- 📊 Detailed ML model comparison (LR vs ANN)
- 🔍 Live cross-check against NewsAPI
- 🛡️ Rule engine with explainable reasons
- 💡 Keyword influence visualisation
- 📈 Trend predictions (viral risk, political sensitivity, economic impact)
