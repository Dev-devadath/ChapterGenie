import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlayCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoUrlInputProps {
  onSubmit: (url: string) => void;
  className?: string;
  disabled?: boolean;
}

export function VideoUrlInput({ onSubmit, className, disabled }: VideoUrlInputProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(url);
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={cn(
        "w-full max-w-3xl mx-auto space-y-2",
        className
      )}
    >
      <div>
        <label htmlFor="videoUrl" className="text-sm font-medium text-muted-foreground">
          YouTube Video URL
        </label>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <PlayCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="videoUrl"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pl-10 h-12 border-border focus-visible:ring-primary"
            />
          </div>
          
          <Button 
            type="submit" 
            className="h-12 px-8 font-medium transition-all duration-300 shine-effect"
            disabled={isLoading || disabled}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            <span>{isLoading ? "Processing..." : "Analyze Video"}</span>
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Paste your YouTube video URL to generate AI-powered timestamps
        </p>
      </div>
    </form>
  );
}
