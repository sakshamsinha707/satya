import { ExternalLink, Calendar, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EvidenceCardProps {
  source: string;
  excerpt: string;
  url: string;
  date?: string;
  author?: string;
  credibilityRating?: "high" | "medium" | "low";
  className?: string;
}

export function EvidenceCard({
  source,
  excerpt,
  url,
  date,
  author,
  credibilityRating = "high",
  className
}: EvidenceCardProps) {
  const getRatingColor = (rating: "high" | "medium" | "low") => {
    switch (rating) {
      case "high": return "verified";
      case "medium": return "uncertain";
      case "low": return "false";
    }
  };

  const ratingColor = getRatingColor(credibilityRating);

  return (
    <Card className={cn("p-4 space-y-3 hover:shadow-medium transition-shadow", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-foreground">{source}</h4>
          <div className="flex items-center gap-2 mt-1">
            {author && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>{author}</span>
              </div>
            )}
            {date && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>{date}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Credibility Badge */}
        <div 
          className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            ratingColor === "verified" && "bg-verified/10 text-verified",
            ratingColor === "uncertain" && "bg-uncertain/10 text-uncertain",
            ratingColor === "false" && "bg-false/10 text-false"
          )}
        >
          {credibilityRating.charAt(0).toUpperCase() + credibilityRating.slice(1)}
        </div>
      </div>

      {/* Excerpt */}
      <div className="relative">
        <p className="text-sm text-muted-foreground leading-relaxed">
          "{excerpt}"
        </p>
        <div className={cn(
          "absolute left-0 top-0 w-1 h-full rounded-full",
          ratingColor === "verified" && "bg-verified",
          ratingColor === "uncertain" && "bg-uncertain",
          ratingColor === "false" && "bg-false"
        )} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(url, '_blank')}
          className="text-xs text-primary hover:text-primary-foreground hover:bg-primary"
        >
          View Source
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </Card>
  );
}