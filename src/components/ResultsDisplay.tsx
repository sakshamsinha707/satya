import { useState } from "react";
import {
  CheckCircle, AlertTriangle, XCircle, Eye, EyeOff, Lightbulb,
  TrendingUp, Shield, Cpu, Search, ChevronDown, ChevronUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrustMeter } from "./TrustMeter";
import { EvidenceCard } from "./EvidenceCard";
import { LanguageToggle } from "./LanguageToggle";
import { cn } from "@/lib/utils";
import type { AnalysisResult } from "@/pages/Satya";

interface ResultsDisplayProps {
  result: AnalysisResult;
  language: "en" | "hi";
  onLanguageChange: (language: "en" | "hi") => void;
  className?: string;
}

function ProgressBar({ value, color = "bg-primary" }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className={cn("h-2 rounded-full transition-all", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function ResultsDisplay({ result, language, onLanguageChange, className }: ResultsDisplayProps) {
  const [showSimplified, setShowSimplified] = useState(false);
  const [showKeywords, setShowKeywords] = useState(false);
  const [showMLDetails, setShowMLDetails] = useState(false);

  const isReal = result.verdict === "REAL";
  const verdictColor = isReal ? "verified" : "false";

  const t = {
    en: {
      verdict: isReal ? "This information appears credible" : "This information appears misleading",
      explanation: "Detailed Explanation",
      simplified: "Simple Explanation",
      showSimple: "Show Simple Version",
      showDetailed: "Show Detailed Version",
      evidence: "Fact-Check Resources",
      credibility: "Credibility Score",
      source: "Source Reliability",
      mlModels: "ML Model Details",
      keywords: "Key Signals",
      trends: "Trend Predictions",
      ruleEngine: "Rule Engine",
      crossCheck: "Live Cross-Check",
      noEvidence: "No additional evidence found.",
      realProb: "Real Probability",
      fakeProb: "Fake Probability",
      dataLabel: "Trained on",
      method: "Decision Method",
    },
    hi: {
      verdict: isReal ? "यह जानकारी विश्वसनीय लगती है" : "यह जानकारी भ्रामक लगती है",
      explanation: "विस्तृत स्पष्टीकरण",
      simplified: "सरल स्पष्टीकरण",
      showSimple: "सरल संस्करण दिखाएं",
      showDetailed: "विस्तृत संस्करण दिखाएं",
      evidence: "तथ्य-जांच संसाधन",
      credibility: "विश्वसनीयता स्कोर",
      source: "स्रोत विश्वसनीयता",
      mlModels: "ML मॉडल विवरण",
      keywords: "मुख्य संकेत",
      trends: "ट्रेंड पूर्वानुमान",
      ruleEngine: "नियम इंजन",
      crossCheck: "लाइव क्रॉस-चेक",
      noEvidence: "कोई अतिरिक्त प्रमाण नहीं मिला।",
      realProb: "वास्तविक संभावना",
      fakeProb: "नकली संभावना",
      dataLabel: "प्रशिक्षित",
      method: "निर्णय विधि",
    },
  }[language];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Language Toggle */}
      <div className="flex justify-end">
        <LanguageToggle currentLanguage={language} onLanguageChange={onLanguageChange} />
      </div>

      {/* ─── VERDICT CARD ─── */}
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            {isReal
              ? <CheckCircle className="w-7 h-7 text-verified" />
              : <XCircle className="w-7 h-7 text-false" />}
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{t.verdict}</h2>
              <Badge variant={isReal ? "default" : "destructive"} className="text-sm font-bold">
                {result.verdict}
              </Badge>
            </div>
            <TrustMeter score={result.trust_score} size="lg" />
            <p className="text-xs text-muted-foreground">
              {t.credibility}: {result.trust_score}/100 — {result.credibility_grade}
            </p>
          </div>
        </div>

        {/* Probabilities */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.realProb}</span>
              <span className="font-semibold text-verified">{(result.real_probability * 100).toFixed(1)}%</span>
            </div>
            <ProgressBar value={result.real_probability * 100} color="bg-verified" />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.fakeProb}</span>
              <span className="font-semibold text-false">{(result.fake_probability * 100).toFixed(1)}%</span>
            </div>
            <ProgressBar value={result.fake_probability * 100} color="bg-false" />
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
          <p><span className="font-medium">{t.method}:</span> {result.decision_method}</p>
          <p><span className="font-medium">{t.dataLabel}:</span> {result.data_label}</p>
        </div>
      </Card>

      {/* ─── EXPLANATION ─── */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-accent" />
            {showSimplified ? t.simplified : t.explanation}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setShowSimplified(!showSimplified)}
            className="flex items-center gap-2">
            {showSimplified ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showSimplified ? t.showDetailed : t.showSimple}
          </Button>
        </div>
        <div className={cn(
          "p-4 rounded-lg border-l-4",
          verdictColor === "verified" ? "bg-verified/5 border-verified" : "bg-false/5 border-false"
        )}>
          <p className="text-sm leading-relaxed">
            {showSimplified ? result.simplified_explanation : result.explanation}
          </p>
        </div>
      </Card>

      {/* ─── RULE ENGINE ─── */}
      {result.rule_fired && (
        <Card className="p-6 space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-destructive" />
            {t.ruleEngine}
            <Badge variant="destructive" className="ml-auto">Triggered</Badge>
          </h3>
          <div className="space-y-2">
            {result.rule_reasons.map((reason, i) => (
              <div key={i} className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm">
                {reason}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── CROSS-CHECK ─── */}
      <Card className="p-6 space-y-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search className="w-5 h-5 text-accent" />
          {t.crossCheck}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Similarity to verified news</span>
            <span className={cn("font-semibold",
              result.cross_check_similarity > 0.5 ? "text-verified" :
              result.cross_check_similarity > 0.2 ? "text-uncertain" : "text-false"
            )}>
              {(result.cross_check_similarity * 100).toFixed(0)}%
            </span>
          </div>
          <ProgressBar
            value={result.cross_check_similarity * 100}
            color={result.cross_check_similarity > 0.5 ? "bg-verified" :
                   result.cross_check_similarity > 0.2 ? "bg-uncertain" : "bg-false"}
          />
          <p className="text-xs text-muted-foreground">
            {result.cross_check_similarity < 0.2
              ? "⚠️ No similar verified news found — suspicious"
              : result.cross_check_similarity > 0.5
              ? "✅ Strong match with real news articles"
              : "⚡ Partial match with real news"}
          </p>
        </div>
      </Card>

      {/* ─── SOURCE + CREDIBILITY ─── */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            {t.source}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span className="font-bold">{result.source_reliability}/100</span>
            </div>
            <ProgressBar value={result.source_reliability}
              color={result.source_reliability >= 75 ? "bg-verified" :
                     result.source_reliability >= 50 ? "bg-uncertain" : "bg-false"} />
            <p className="text-xs text-muted-foreground">{result.source_tier}</p>
          </div>
        </Card>

        <Card className="p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {t.credibility}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span className="font-bold">{result.trust_score}/100</span>
            </div>
            <ProgressBar value={result.trust_score}
              color={result.trust_score >= 75 ? "bg-verified" :
                     result.trust_score >= 50 ? "bg-uncertain" : "bg-false"} />
            <p className="text-xs text-muted-foreground">{result.credibility_grade}</p>
          </div>
        </Card>
      </div>

      {/* ─── ML MODEL DETAILS ─── */}
      <Card className="p-6 space-y-3">
        <button
          onClick={() => setShowMLDetails(!showMLDetails)}
          className="w-full flex items-center justify-between text-lg font-semibold"
        >
          <span className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent" />
            {t.mlModels}
          </span>
          {showMLDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMLDetails && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={result.ml_models.models_agree ? "default" : "outline"}>
                {result.ml_models.models_agree ? "✅ Models Agree" : "⚡ Models Disagree"}
              </Badge>
              <span className="text-muted-foreground">Best: {result.ml_models.top_model}</span>
            </div>

            {/* LR */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-sm">Logistic Regression</span>
                <Badge variant={result.ml_models.lr_label === "REAL" ? "default" : "destructive"}>
                  {result.ml_models.lr_label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Real</span><span>{(result.ml_models.lr_real * 100).toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={result.ml_models.lr_real * 100} color="bg-verified" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Fake</span><span>{(result.ml_models.lr_fake * 100).toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={result.ml_models.lr_fake * 100} color="bg-false" />
                </div>
              </div>
            </div>

            {/* ANN */}
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-sm">ANN (MLPClassifier)</span>
                <Badge variant={result.ml_models.ann_label === "REAL" ? "default" : "destructive"}>
                  {result.ml_models.ann_label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Real</span><span>{(result.ml_models.ann_real * 100).toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={result.ml_models.ann_real * 100} color="bg-verified" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Fake</span><span>{(result.ml_models.ann_fake * 100).toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={result.ml_models.ann_fake * 100} color="bg-false" />
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ─── KEYWORDS ─── */}
      {result.keywords.length > 0 && (
        <Card className="p-6 space-y-3">
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            className="w-full flex items-center justify-between text-lg font-semibold"
          >
            <span className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-accent" />
              {t.keywords}
            </span>
            {showKeywords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showKeywords && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">
                Words that most influenced the ML prediction. Green → points to REAL, Red → points to FAKE.
              </p>
              <div className="space-y-1">
                {result.keywords.map((kw, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0",
                      kw.direction === "REAL" ? "bg-verified" : "bg-false"
                    )} />
                    <span className="font-mono w-40 truncate">{kw.word}</span>
                    <div className="flex-1">
                      <ProgressBar
                        value={Math.abs(kw.influence) * 100}
                        color={kw.direction === "REAL" ? "bg-verified" : "bg-false"}
                      />
                    </div>
                    <span className={cn(
                      "text-xs font-medium w-12 text-right",
                      kw.direction === "REAL" ? "text-verified" : "text-false"
                    )}>
                      {kw.direction}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ─── TRENDS ─── */}
      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent" />
          {t.trends}
        </h3>
        <div className="space-y-4">
          {Object.entries(result.trends).map(([cat, trend]) => (
            <div key={cat} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{cat}</span>
                <span className="font-medium">
                  {trend.level}
                  <span className="text-muted-foreground ml-2">({trend.confidence}%)</span>
                </span>
              </div>
              <ProgressBar
                value={trend.confidence}
                color={
                  trend.confidence > 70 ? "bg-false" :
                  trend.confidence > 45 ? "bg-uncertain" : "bg-verified"
                }
              />
            </div>
          ))}
        </div>
      </Card>

      {/* ─── EVIDENCE ─── */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t.evidence}</h3>
        {result.evidence.length > 0 ? (
          <div className="grid gap-4">
            {result.evidence.map((item, index) => (
              <EvidenceCard
                key={index}
                source={item.source}
                excerpt={item.excerpt}
                url={item.url}
                date={item.date}
                author={item.author}
                credibilityRating={item.credibilityRating}
              />
            ))}
          </div>
        ) : (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground text-sm">{t.noEvidence}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
