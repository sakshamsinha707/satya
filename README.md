# Satya — AI Fake News Detector

Satya is a full-stack fake news detection platform that combines **Machine Learning**, **Rule-Based Analysis**, and **Live News Cross-Checking** to help users assess the credibility of information before sharing it.

## Live Demo

🌐 Frontend: https://satya-fake-news-detector.netlify.app

## Architecture

```
Satya/
├── backend/                     # Python FastAPI backend
│   ├── main.py                  # ML engine + API endpoints
│   └── requirements.txt
├── src/                         # React + TypeScript frontend
│   ├── pages/
│   │   └── Satya.tsx
│   ├── components/
│   │   ├── ResultsDisplay.tsx
│   │   └── ...
│   └── ...
├── package.json
└── ...
```

## How It Works

1. **Live Training**

   * On startup, the backend fetches recent headlines from NewsAPI, GNews, and Guardian (if API keys are provided).
   * These headlines are combined with built-in datasets to train the models.

2. **ML Ensemble**

   * Logistic Regression
   * Artificial Neural Network (MLPClassifier)

3. **Rule Engine**

   * Detects suspicious patterns such as:

     * Short unverified claims
     * Conspiracy language
     * Miracle cure claims
     * Viral urgency phrases
     * Low-credibility sources

4. **Live Cross-Check**

   * Searches for related news articles.
   * Uses cosine similarity to determine whether the claim aligns with verified reporting.

5. **Credibility Scoring**

   * Evaluates:

     * Sensational language
     * Evidence-based wording
     * Use of statistics
     * Excessive capitalization
     * Source reliability

## Features

* 🌐 English / Hindi interface
* 🤖 ML Ensemble (Logistic Regression + ANN)
* 🛡️ Explainable Rule Engine
* 🔍 Live News Cross-Checking
* 📊 Detailed Model Breakdown
* 📈 Trend Predictions
* 🧠 Keyword Influence Analysis
* 📰 Fact-Check Resource Recommendations
* 📱 Responsive User Interface

## Screens Included in the Application

* Landing page introducing Satya
* Analysis result dashboard
* Detailed explanation panel
* Rule engine explanations
* Live cross-check results
* Source reliability assessment
* ML model comparison
* Keyword influence visualization
* Trend prediction dashboard
* Fact-check resource suggestions

## Backend Setup (FastAPI)

```bash
cd backend
pip install -r requirements.txt

# Optional API keys
export NEWSAPI_KEY=your_key
export GNEWS_KEY=your_key
export GUARDIAN_KEY=your_key

python main.py
```

Backend runs on:

```
http://localhost:8000
```

FastAPI documentation:

```
http://localhost:8000/docs
```

## Frontend Setup (React)

```bash
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

The frontend automatically uses:

```typescript
const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000";
```

For production deployments, configure:

```env
VITE_API_URL=https://your-render-backend.onrender.com
```

## API Endpoint

### POST `/verify`

Request:

```json
{
  "input": "Scientists confirm COVID variant is 30% more transmissible...",
  "source": "BBC",
  "language": "en"
}
```

Response includes:

* Verdict (REAL / FAKE)
* Trust Score
* Credibility Grade
* Fake / Real Probabilities
* Decision Method
* Rule Engine Explanations
* Cross-Check Similarity
* Source Reliability Metrics
* ML Model Outputs
* Keyword Influence Analysis
* Trend Predictions
* Fact-Check Evidence Links

## Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui

### Backend

* FastAPI
* scikit-learn
* NumPy
* Uvicorn
* Pydantic

### Machine Learning

* Logistic Regression
* MLPClassifier (ANN)
* TF-IDF Vectorization
* Cosine Similarity

## Disclaimer

Satya is designed as an educational and research-oriented fact-checking assistant. The system provides probabilistic assessments and should not be considered a substitute for professional journalism or independent verification from trusted sources.
