import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VideoUrlInput } from "@/components/VideoUrlInput";
import { TranscriptCard } from "@/components/TranscriptCard";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { Github } from "lucide-react";
import { GenieIcon } from "@/components/GenieIcon";
import ErrorBoundary from "../components/ErrorBoundary";
import { sanitizeErrorMessage, logError } from "../utils/errorHandling";
import config from "../config";
import { Chapter } from "../types/Chapter";

// Rate limiting configuration
const RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60000, // 1 minute
  requests: [] as number[],
};

// Create an API wrapper to hide the actual request
const makeApiRequest = async (url: string): Promise<any> => {
  try {
    // Check rate limit
    const now = Date.now();
    RATE_LIMIT.requests = RATE_LIMIT.requests.filter(
      (time) => now - time < RATE_LIMIT.windowMs
    );

    if (RATE_LIMIT.requests.length >= RATE_LIMIT.maxRequests) {
      throw new Error(
        "Rate limit exceeded. Please wait a minute before trying again."
      );
    }

    RATE_LIMIT.requests.push(now);

    // Using a relative path that gets proxied by Vite
    const response = await fetch(config.backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error("Service unavailable");
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Service unavailable");
  }
};

const Index = () => {
  const [transcript, setTranscript] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");

  const handleVideoSubmit = async (url: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentVideoUrl(url); // Save the current video URL

      if (!url.trim()) {
        toast.error("Please enter a YouTube URL", { position: "top-center" });
        return;
      }

      const youtubeUrlPattern =
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeUrlPattern.test(url)) {
        toast.error("Please enter a valid YouTube URL", {
          position: "top-center",
        });
        return;
      }

      const data = await makeApiRequest(url);
      setChapters(data.chapters);
      setShowTranscript(true); // Show the transcript when chapters are fetched
      setError(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Rate limit")) {
        toast.error(err.message, { position: "top-center" });
      } else {
        toast.error(
          "Unable to connect to the service. Please check if the backend server is running.",
          { position: "top-center" }
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTimestampClick = (timestamp: string) => {
    if (!currentVideoUrl) return;
    const videoId = currentVideoUrl.split("v=")[1];

    // Convert MM:SS to seconds
    const [minutes, seconds] = timestamp.split(":").map(Number);
    const totalSeconds = minutes * 60 + seconds;

    window.open(
      `https://www.youtube.com/watch?v=${videoId}&t=${totalSeconds}`,
      "_blank"
    );
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-border sticky top-0 z-10 bg-background/80 backdrop-blur-sm">
          <div className="container flex items-center justify-between h-16 px-4 sm:px-8 md:px-12">
            <div className="flex items-center">
              <img
                src="/icon/icon.png"
                alt="Genie Lamp"
                className="h-8 w-8 mr-2"
              />
              <h1 className="text-lg font-semibold tracking-tight relative">
                <span className="absolute -top-1 -right-3 text-purple-400 text-xs animate-pulse">
                  ✦
                </span>
                <span className="font-bold">Chapter</span>
                <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                  Genie
                </span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/Dev-devadath/ChapterGenie"
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-1 container px-4 py-16 sm:py-24 max-w-7xl mx-auto">
          <div className="text-center space-y-8 mb-16 max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-balance relative">
              <span className="absolute -top-8 right-[15%] text-purple-400 animate-pulse">
                ✦
              </span>
              <span className="absolute -top-4 right-[35%] text-pink-400 animate-pulse delay-75">
                ✦
              </span>
              <span className="absolute top-0 left-[20%] text-blue-400 animate-pulse delay-150">
                ✦
              </span>
              Transform Your Videos
              <br />
              <span className="relative inline-block">
                <span className="absolute -top-6 -right-8 text-purple-400 animate-pulse delay-100">
                  ✦
                </span>
                <span className="absolute -bottom-4 -left-6 text-pink-400 animate-pulse delay-200">
                  ✦
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                  Into Chapters
                </span>
              </span>
              <span className="ml-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                using AI
              </span>
            </h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto text-balance">
              Simply paste a YouTube URL and our AI will analyze the content to
              create accurate, meaningful chapter markers for easier navigation.
            </p>
          </div>

          <div className="space-y-12">
            <VideoUrlInput
              onSubmit={handleVideoSubmit}
              className="animate-fade-in opacity-0"
              disabled={loading}
            />

            {loading && (
              <div className="text-center text-muted-foreground animate-fade-in">
                <div
                  className="inline-block animate-spin mr-2 h-5 w-5 border-2 border-current border-t-transparent rounded-full"
                  aria-hidden="true"
                ></div>
                <div className="mb-2">
                  Analyzing video and generating chapters...
                </div>
                <div className="text-sm text-muted-foreground">
                  This may take up to 30-60 seconds as our AI analyzes the video
                  content.
                </div>
              </div>
            )}

            {showTranscript && !loading && chapters.length > 0 && (
              <div className="mx-auto max-w-3xl space-y-4">
                <div className="border rounded-xl bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                  <div className="border-b px-4 py-3 bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto p-4 space-y-3">
                    {chapters.map((chapter: Chapter, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 bg-background rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-foreground">
                            {chapter.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {chapter.description}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            handleTimestampClick(chapter.timestamp)
                          }
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {chapter.timestamp}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t">
                    <div className="flex justify-center px-4 py-3 bg-muted/50">
                      <button
                        onClick={() => {
                          const formattedText = chapters
                            .map(
                              (chapter) =>
                                `${chapter.timestamp} - ${chapter.title}`
                            )
                            .join("\n");
                          navigator.clipboard.writeText(formattedText);
                          toast.success("Timestamps copied to clipboard!", {
                            position: "top-center",
                          });
                        }}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        Copy Timestamps
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-border py-6 bg-muted/20">
          <div className="container px-4 text-center text-sm text-muted-foreground">
            <p>
              © {new Date().getFullYear()} ChapterGenie. All rights reserved.
            </p>
          </div>
        </footer>

        <Toaster position="top-center" expand={false} richColors closeButton />
      </div>
    </ErrorBoundary>
  );
};

export default Index;
