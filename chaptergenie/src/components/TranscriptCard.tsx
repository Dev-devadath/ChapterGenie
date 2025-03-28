import { useState, useEffect } from "react";
import { CopyIcon, CheckIcon, Code, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TranscriptCardProps {
  transcript: string;
  className?: string;
}

export function TranscriptCard({ transcript, className }: TranscriptCardProps) {
  const [copied, setCopied] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div 
      className={cn(
        "glass-card opacity-0 transition-all duration-500 ease-out", 
        {
          "opacity-100 translate-y-0": animateIn,
          "opacity-0 translate-y-4": !animateIn
        },
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-xs font-medium gap-1"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <CheckIcon className="h-3.5 w-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ScrollText className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-lg">Video Transcript & Chapters</h3>
        </div>
        
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="rounded-lg bg-muted/50 p-4 overflow-auto text-sm leading-relaxed whitespace-pre-wrap">
            {transcript || "Your transcript will appear here..."}
          </pre>
        </div>
      </div>
    </div>
  );
}
