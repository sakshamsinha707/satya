import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  currentLanguage: "en" | "hi";
  onLanguageChange: (language: "en" | "hi") => void;
  className?: string;
}

export function LanguageToggle({ currentLanguage, onLanguageChange, className }: LanguageToggleProps) {
  const languages = [
    { code: "en", label: "English", native: "English" },
    { code: "hi", label: "Hindi", native: "हिंदी" }
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Globe className="w-4 h-4 text-muted-foreground" />
      <div className="flex rounded-lg bg-muted p-1">
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant="ghost"
            size="sm"
            onClick={() => onLanguageChange(lang.code as "en" | "hi")}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-all",
              currentLanguage === lang.code
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {lang.native}
          </Button>
        ))}
      </div>
    </div>
  );
}