import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TrustMeterProps {
  score: number;
  animated?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TrustMeter({ score, animated = true, size = "md", className }: TrustMeterProps) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setDisplayScore(score);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDisplayScore(score);
    }
  }, [score, animated]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "verified";
    if (score >= 40) return "uncertain";
    return "false";
  };

  const getScoreText = (score: number) => {
    if (score >= 70) return "Credible";
    if (score >= 40) return "Uncertain";
    return "Misleading";
  };

  const scoreColor = getScoreColor(displayScore);
  const scoreText = getScoreText(displayScore);

  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4"
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Score Display */}
      <div className="flex items-center justify-between">
        <span className={cn("font-semibold", textSizeClasses[size])}>
          Trust Score
        </span>
        <div className="flex items-center gap-2">
          <span className={cn("font-bold", textSizeClasses[size])}>
            {Math.round(displayScore)}%
          </span>
          <span 
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              scoreColor === "verified" && "bg-verified text-verified-foreground",
              scoreColor === "uncertain" && "bg-uncertain text-uncertain-foreground",
              scoreColor === "false" && "bg-false text-false-foreground"
            )}
          >
            {scoreText}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className={cn("w-full bg-muted rounded-full overflow-hidden", sizeClasses[size])}>
          <div
            className={cn(
              "trust-meter-fill rounded-full transition-all duration-1000 ease-out",
              scoreColor === "verified" && "bg-verified",
              scoreColor === "uncertain" && "bg-uncertain",
              scoreColor === "false" && "bg-false"
            )}
            style={{ width: `${displayScore}%` }}
          />
        </div>
        
        {/* Glow Effect */}
        {animated && (
          <div
            className={cn(
              "absolute top-0 left-0 h-full rounded-full opacity-50 blur-sm transition-all duration-1000",
              scoreColor === "verified" && "bg-verified",
              scoreColor === "uncertain" && "bg-uncertain",
              scoreColor === "false" && "bg-false"
            )}
            style={{ width: `${displayScore}%` }}
          />
        )}
      </div>

      {/* Score Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Misleading</span>
        <span>Uncertain</span>
        <span>Credible</span>
      </div>
    </div>
  );
}