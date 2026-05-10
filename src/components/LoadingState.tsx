import { Loader2, Shield, Search, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ 
  message = "Analyzing content across verified sources...", 
  className 
}: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-6", className)}>
      {/* Animated Icons */}
      <div className="relative">
        {/* Central Shield */}
        <div className="relative z-10 p-4 bg-primary/10 rounded-full">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        
        {/* Orbiting Icons */}
        <div className="absolute inset-0 animate-spin">
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
            <Search className="w-4 h-4 text-primary animate-pulse" />
          </div>
          <div className="absolute top-1/2 -right-2 transform -translate-y-1/2">
            <CheckCircle className="w-4 h-4 text-verified animate-pulse" />
          </div>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
            <Loader2 className="w-4 h-4 text-accent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Loading Bar */}
      <div className="w-64 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-accent to-verified scanning-animation rounded-full" />
      </div>

      {/* Message */}
      <div className="text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">
          This may take a few seconds...
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span>Analyzing</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-muted rounded-full" />
          <span>Fact-checking</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-muted rounded-full" />
          <span>Verifying</span>
        </div>
      </div>
    </div>
  );
}