import { useState } from "react";
import { Search, Shield, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { FileUpload } from "@/components/FileUpload";
import { LoadingState } from "@/components/LoadingState";
import { ResultsDisplay } from "@/components/ResultsDisplay";
import { LanguageToggle } from "@/components/LanguageToggle";
import heroImage from "@/assets/hero-image.jpg";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

type AppState = "input" | "loading" | "results" | "error";

export interface KeywordItem {
  word: string;
  tfidf: number;
  lr_coef: number;
  influence: number;
  direction: "REAL" | "FAKE";
}

export interface TrendItem {
  level: string;
  confidence: number;
}

export interface MLModels {
  lr_label: string;
  lr_real: number;
  lr_fake: number;
  lr_conf: number;
  ann_label: string;
  ann_real: number;
  ann_fake: number;
  ann_conf: number;
  top_model: string;
  models_agree: boolean;
}

export interface AnalysisResult {
  verdict: "REAL" | "FAKE";
  trust_score: number;
  credibility_grade: string;
  fake_probability: number;
  real_probability: number;
  decision_method: string;
  rule_fired: boolean;
  rule_reasons: string[];
  cross_check_similarity: number;
  explanation: string;
  simplified_explanation: string;
  keywords: KeywordItem[];
  trends: Record<string, TrendItem>;
  ml_models: MLModels;
  source_reliability: number;
  source_tier: string;
  data_label: string;
  evidence: Array<{
    source: string;
    excerpt: string;
    url: string;
    date?: string;
    author?: string;
    credibilityRating?: "high" | "medium" | "low";
  }>;
}

export default function Satya() {
  const [appState, setAppState] = useState<AppState>("input");
  const [inputText, setInputText] = useState("");
  const [sourceInput, setSourceInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | undefined>();
  const [language, setLanguage] = useState<"en" | "hi">("en");
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAnalysis = async () => {
    if (!inputText.trim() && !uploadedFile) return;
    setAppState("loading");
    setErrorMsg("");

    try {
      let textToAnalyze = inputText.trim();
      if (uploadedFile && !textToAnalyze) {
        textToAnalyze = await uploadedFile.text();
      }

      const response = await fetch(`${API_BASE}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: textToAnalyze,
          source: sourceInput.trim() || "Unknown",
          language,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Server error");
      }

      const data: AnalysisResult = await response.json();
      setResults(data);
      setAppState("results");
    } catch (e: any) {
      setErrorMsg(
        e.message === "Failed to fetch"
          ? "Cannot connect to the Satya backend. Make sure it is running on port 8000."
          : e.message
      );
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("input");
    setInputText("");
    setSourceInput("");
    setUploadedFile(undefined);
    setResults(null);
    setErrorMsg("");
  };

  const translations = {
    en: {
      title: "Satya",
      subtitle: "Verify Truth, Build Trust",
      description:
        "AI-powered fact-checking combining ML ensemble, rule engine, and live news cross-checking to combat misinformation.",
      placeholder: "Paste news text, article link, or social media post here...",
      sourcePlaceholder: "Source (e.g. BBC, WhatsApp, Unknown)…",
      uploadText: "Or upload a screenshot/document",
      checkButton: "Check Credibility",
      newCheckButton: "Check New Content",
      features: {
        instant: "ML Ensemble",
        instantDesc: "LR + ANN models",
        reliable: "Rule Engine",
        reliableDesc: "Pattern-based detection",
        multilingual: "Live Training",
        multilingualDesc: "Real news API data",
      },
    },
    hi: {
      title: "सत्य",
      subtitle: "सत्य की जांच करें, विश्वास बनाएं",
      description:
        "ML एन्सेंबल, नियम इंजन और लाइव न्यूज़ क्रॉस-चेकिंग के साथ AI-संचालित तथ्य-जांच।",
      placeholder: "यहाँ समाचार पाठ, लेख लिंक, या सोशल मीडिया पोस्ट पेस्ट करें...",
      sourcePlaceholder: "स्रोत (जैसे BBC, WhatsApp, Unknown)…",
      uploadText: "या स्क्रीनशॉट/दस्तावेज़ अपलोड करें",
      checkButton: "विश्वसनीयता जांचें",
      newCheckButton: "नई सामग्री जांचें",
      features: {
        instant: "ML एन्सेंबल",
        instantDesc: "LR + ANN मॉडल",
        reliable: "नियम इंजन",
        reliableDesc: "पैटर्न-आधारित पहचान",
        multilingual: "लाइव प्रशिक्षण",
        multilingualDesc: "वास्तविक समाचार डेटा",
      },
    },
  };

  const t = translations[language];

  if (appState === "loading") {
    return <LoadingState className="min-h-screen" />;
  }

  if (appState === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-lg text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Analysis Failed</h2>
          <p className="text-muted-foreground text-sm">{errorMsg}</p>
          <Button onClick={handleReset}>Try Again</Button>
        </Card>
      </div>
    );
  }

  if (appState === "results" && results) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8 text-center">
            <Button variant="outline" onClick={handleReset} className="mb-4">
              ← {t.newCheckButton}
            </Button>
            <h1 className="text-3xl font-bold gradient-text">{t.title}</h1>
          </div>
          <ResultsDisplay result={results} language={language} onLanguageChange={setLanguage} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">{t.title}</h1>
                <p className="text-sm text-muted-foreground">{t.subtitle}</p>
              </div>
            </div>
            <LanguageToggle currentLanguage={language} onLanguageChange={setLanguage} />
          </div>
        </div>
      </header>

      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl lg:text-5xl font-bold leading-tight">{t.subtitle}</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{t.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t.features.instant}</p>
                    <p className="text-xs text-muted-foreground">{t.features.instantDesc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <Shield className="w-5 h-5 text-verified flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t.features.reliable}</p>
                    <p className="text-xs text-muted-foreground">{t.features.reliableDesc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border">
                  <Search className="w-5 h-5 text-accent flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t.features.multilingual}</p>
                    <p className="text-xs text-muted-foreground">{t.features.multilingualDesc}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img src={heroImage} alt="Satya AI Fact Checking" className="w-full rounded-lg shadow-large" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="p-8 shadow-large">
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Start Fact-Checking</h3>
                <p className="text-muted-foreground">Enter content below to verify its credibility</p>
              </div>
              <div className="space-y-4">
                <Textarea
                  placeholder={t.placeholder}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <Input
                  placeholder={t.sourcePlaceholder}
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                />
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t.uploadText}</span>
                  </div>
                </div>
                <FileUpload
                  onFileUpload={setUploadedFile}
                  onRemoveFile={() => setUploadedFile(undefined)}
                  uploadedFile={uploadedFile}
                />
                <Button
                  onClick={handleAnalysis}
                  disabled={!inputText.trim() && !uploadedFile}
                  className="w-full h-12 text-lg font-semibold"
                  size="lg"
                >
                  <Search className="w-5 h-5 mr-2" />
                  {t.checkButton}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <footer className="py-8 border-t bg-card">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Satya provides AI-powered credibility checks using ML ensemble + rule engine but does not replace human judgment.
          </p>
        </div>
      </footer>
    </div>
  );
}
