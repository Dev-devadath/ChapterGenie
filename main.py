from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from youtube_transcript_api import YouTubeTranscriptApi
from typing import Optional, List, Dict, Any
import uvicorn
import os
import google.generativeai as genai
from dotenv import load_dotenv
import time
from collections import defaultdict
import asyncio

# Load environment variables
load_dotenv()

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

genai.configure(api_key=GEMINI_API_KEY)

app = FastAPI(
    title="YouTube Chapter Generator API",
    description="API to generate chapter timestamps for YouTube videos",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
    expose_headers=["*"],  # Expose all headers
    max_age=86400,        # Cache CORS preflight for 24 hours
)

# Rate limiting configuration
RATE_LIMIT = {
    "window_size": 60,  # seconds
    "max_requests": 5,  # requests per window
    "requests": defaultdict(list)  # IP -> list of timestamps
}

# Rate limiting function
async def check_rate_limit(ip: str):
    now = time.time()
    
    # Remove old requests outside the window
    RATE_LIMIT["requests"][ip] = [
        timestamp for timestamp in RATE_LIMIT["requests"][ip]
        if now - timestamp < RATE_LIMIT["window_size"]
    ]
    
    # Check if rate limit is exceeded
    if len(RATE_LIMIT["requests"][ip]) >= RATE_LIMIT["max_requests"]:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a minute before trying again."
        )
    
    # Add current request
    RATE_LIMIT["requests"][ip].append(now)
    
    # Clean up old IPs periodically
    if len(RATE_LIMIT["requests"]) > 10000:  # Prevent memory leak
        for ip in list(RATE_LIMIT["requests"].keys()):
            if not RATE_LIMIT["requests"][ip]:
                del RATE_LIMIT["requests"][ip]

# Add rate limiting middleware to existing routes
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Get client IP
    client_ip = request.client.host
    
    # Only apply rate limiting to API endpoints
    if request.url.path.startswith("/api"):
        await check_rate_limit(client_ip)
    
    response = await call_next(request)
    return response

# Add middleware to handle CORS manually if needed
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# Pydantic model for request validation
class VideoRequest(BaseModel):
    url: str
    language: Optional[str] = None  # Now optional
    
# Pydantic model for chapter format
class Chapter(BaseModel):
    timestamp: str
    title: str

# Function to extract video ID from URL
def extract_video_id(url: str) -> str:
    """
    Extracts the video ID from a YouTube URL.
    """
    if 'v=' in url:
        return url.split('v=')[1].split('&')[0]
    elif 'youtu.be/' in url:
        return url.split('youtu.be/')[1].split('?')[0]
    else:
        raise ValueError("Invalid YouTube URL")

# Function to format time from seconds to MM:SS
def format_time(seconds: float) -> str:
    """
    Converts time from seconds (float) to MM:SS format.
    """
    minutes = int(seconds // 60)
    seconds = int(seconds % 60)
    return f"{minutes:02}:{seconds:02}"  # Ensures two-digit formatting

# Function to fetch transcript
def fetch_transcript(video_url: str, language_code: str = None):
    """
    Fetches the transcript for a YouTube video.
    Automatically detects the best available language if not specified.
    """
    try:
        video_id = extract_video_id(video_url)
        
        # Get available transcripts
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        
        # Auto-detect language if not provided
        if not language_code:
            # Prioritize English if available
            if 'en' in [t.language_code for t in transcript_list]:
                language_code = 'en'
            else:
                # Fall back to the first available language
                language_code = next(iter(transcript_list)).language_code

        # Fetch the transcript in the detected language
        transcript = transcript_list.find_transcript([language_code]).fetch()
        
        # Calculate total duration
        total_duration = sum(entry['duration'] for entry in transcript)
        total_duration_formatted = format_time(total_duration)

        # Format transcript with MM:SS timestamps
        formatted_transcript = [
            {
                "time": format_time(entry['start']),
                "text": entry['text'],
                "start": entry['start'],
                "duration": entry['duration']
            }
            for entry in transcript
        ]

        return formatted_transcript, language_code, total_duration_formatted

    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Error fetching transcript: {str(e)}")


# Function to generate initial chapters using Gemini AI
async def generate_chapters_with_gemini(transcript: List[Dict[str, Any]], total_duration: str) -> List[Dict[str, str]]:
    """
    Uses Gemini AI to generate chapter timestamps and titles from a transcript.
    
    Args:
        transcript: The formatted transcript with timestamps and text
        total_duration: The total duration of the video in MM:SS format
        
    Returns:
        A list of chapters with timestamps and titles
    """
    try:
        # Configure the model
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",  # Using a valid model name
            generation_config={
                "temperature": 0.3,
                "top_p": 0.95,
                "top_k": 40,
            }
        )
        
        # Format transcript with timestamps for the AI
        transcript_with_timestamps = "\n".join([f"[{entry['time']}] {entry['text']}" for entry in transcript])
        
        # Create the prompt for Gemini (keeping your existing prompt)
        prompt = f"""
        You are a video summarization assistant that generates clear and concise chapter timestamps for YouTube videos. Your goal is to analyze a provided transcript and the total video duration, and then identify only the major segments of the video in a balanced way. Follow these instructions exactly:
        1. Input Details:
        - You will receive the full transcript of a YouTube video along with its total duration (e.g., 20:00).
        - If the transcript is in a non-English language, first translate it to English before processing.
        2. Chapter Creation:
        - Identify only significant topic shifts or major modules that represent a clear, substantial change in content.
        - Avoid creating chapters for minor transitions or repetitive content. Group similar or consecutive content into one chapter.
        - Generate a balanced number of chapters relative to the video length. For a 20-minute video, aim for between 5 to 8 chapters.
        - Ensure chapters are evenly distributed across the entire video duration so that early, middle, and later segments are all represented.
        - Do not create any chapter timestamps beyond the total video duration. All timestamps must be within the video's length.
        3. Timestamp and Output Format:
        - Each chapter must include:
            - An approximate timestamp in the format MM:SS (e.g., 03:15) that reflects the start time of that major segment.
            - A brief, descriptive title summarizing the key topic of that segment.
        - List the chapters in sequential order with clearly formatted timestamps (MM:SS).
        4. Additional Guidelines:
        - Ensure the final chapter reflects the concluding segment of the video, and do not extend beyond the video's total duration.
        - Focus on capturing only the essential highlights and avoid over-fragmentation.
        - Provide a final, easy-to-follow list of chapters that covers the entire video in a balanced manner.

        Using these guidelines, generate a set of chapters that accurately represents the key points in the transcript without exceeding the video's actual length.
        
        TRANSCRIPT WITH TIMESTAMPS:
        {transcript_with_timestamps}  # Limiting transcript length to avoid token limits
        
        TOTAL DURATION:
        {total_duration}
        
        OUTPUT FORMAT (ONLY):
        00:00 - Introduction
        MM:SS - Chapter Title
        MM:SS - Chapter Title
        ...
        """
        
        # Generate response from Gemini
        response = model.generate_content(prompt)
        
        # Parse the response to extract chapters
        chapters_text = response.text.strip().split('\n')
        chapters = []
        
        for chapter in chapters_text:
            if ' - ' in chapter and ':' in chapter.split(' - ')[0]:
                parts = chapter.split(' - ', 1)
                timestamp = parts[0].strip()
                title = parts[1].strip()
                chapters.append({"timestamp": timestamp, "title": title})
        
        return chapters
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating chapters with AI: {str(e)}")

# Function to refine chapters using Gemini AI
async def refine_chapters_with_gemini(initial_chapters: List[Dict[str, str]], transcript: List[Dict[str, Any]], total_duration: str) -> List[Dict[str, str]]:
    """
    Uses Gemini AI to refine the initial chapters by analyzing them alongside the transcript.
    
    Args:
        initial_chapters: The initial chapters generated in the first pass
        transcript: The formatted transcript with timestamps and text
        total_duration: The total duration of the video in MM:SS format
        
    Returns:
        A refined list of chapters with timestamps and titles
    """
    try:
        # Configure the model
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            generation_config={
                "temperature": 0.1,  # Lower temperature for more precise refinement
                "top_p": 0.95,
                "top_k": 40,
            }
        )
        
        # Format transcript with timestamps for the AI
        transcript_with_timestamps = "\n".join([f"[{entry['time']}] {entry['text']}" for entry in transcript])
        
        # Format initial chapters for the AI
        initial_chapters_formatted = "\n".join([f"{chapter['timestamp']} - {chapter['title']}" for chapter in initial_chapters])
        
        # Create the prompt for Gemini refinement
        prompt = f"""
        You are an advanced video summarization assistant specializing in refining chapter timestamps for YouTube videos. Your task is to take the preliminary chapter/timestamp list (generated by another AI) along with the complete transcript of the video, and produce a final, optimized set of chapters. Follow these guidelines:
        1. Input:
        - You will receive the initial chapters and timestamps (in MM:SS format) that were generated.
        - You will also receive the full transcript of the video.
        - If the transcript is in a non-English language, first translate it to English before processing.
        2. Analysis and Comparison:
        - Analyze the preliminary chapter list in the context of the transcript.
        - Identify and remove any chapters that are unnecessary, redundant, or overly granular.
        - Merge chapters that cover similar or consecutive topics, ensuring that each chapter reflects a significant topic shift.
        - Ensure that the chapters cover the entire video and are evenly distributed.
        3. Final Chapter Generation:
        - Generate a final set of chapters with timestamps in MM:SS format that represent the major segments of the video.
        - For a 20-minute video, aim for a balanced number of chapters (typically between 5 to 8).
        - Ensure no chapter timestamp extends beyond the total video duration.
        - Provide concise and descriptive titles for each chapter that clearly summarize the segment's content.
        4. Output:
        - Present the final chapter list in sequential order with each chapter's timestamp and title.
        - The final list should be clear, balanced, and easy for viewers to navigate.

        Using these guidelines, generate the final, optimized set of chapters and timestamps that best represent the video content.        
        INITIAL CHAPTERS:
        {initial_chapters_formatted}
        
        TRANSCRIPT WITH TIMESTAMPS:
        {transcript_with_timestamps}
        
        TOTAL DURATION:
        {total_duration}
        
        OUTPUT FORMAT (ONLY):
        00:00 - Introduction
        MM:SS - Chapter Title
        MM:SS - Chapter Title
        ...
        """
        
        # Generate response from Gemini
        response = model.generate_content(prompt)
        
        # Parse the response to extract refined chapters
        refined_chapters_text = response.text.strip().split('\n')
        refined_chapters = []
        
        for chapter in refined_chapters_text:
            if ' - ' in chapter and ':' in chapter.split(' - ')[0]:
                parts = chapter.split(' - ', 1)
                timestamp = parts[0].strip()
                title = parts[1].strip()
                refined_chapters.append({"timestamp": timestamp, "title": title})
        
        return refined_chapters
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error refining chapters with AI: {str(e)}")

@app.post("/generate_chapters")
async def generate_chapters(request: VideoRequest):
    try:
        # Fetch transcript
        transcript, language, total_duration = fetch_transcript(request.url, request.language)
        
        # Generate initial chapters
        initial_chapters = await generate_chapters_with_gemini(transcript, total_duration)
        
        # Refine chapters
        final_chapters = await refine_chapters_with_gemini(initial_chapters, transcript, total_duration)
        
        return {"chapters": final_chapters}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Additional endpoint with a name that won't trigger ad blockers
@app.post("/process-video")
async def process_video(request: VideoRequest):
    # This is just an alias for the generate_chapters endpoint
    return await generate_chapters(request)

@app.get("/")
async def root():
    return {
        "name": "YouTube Chapter Generator API",
        "version": "1.0.0",
        "description": "Generate chapter timestamps for YouTube videos",
        "endpoints": {
            "POST /api": "Main endpoint for generating chapters",
            "POST /generate_chapters": "Generate chapters (alternative endpoint)",
            "POST /process-video": "Generate chapters (alternative endpoint)",
            "GET /test": "Check if API is running",
            "GET /wake": "Keep service awake"
        },
        "documentation": "/docs",
        "github": "https://github.com/yourusername/youtube-chapter-generator"
    }

@app.get("/test")
async def test_endpoint():
    """Simple endpoint to test if the server is working properly."""
    return {"status": "ok", "message": "Server is running correctly"}

@app.get("/wake")
async def wake_up():
    """Endpoint to keep the service awake on platforms that sleep after inactivity."""
    return {"message": "I Won't Sleep"}

@app.post("/simple-demo")
async def simple_demo(request: VideoRequest):
    """
    A simple demo endpoint that returns hardcoded chapters without using any external services.
    This is for testing the frontend-backend connection only.
    """
    # Return hardcoded sample chapters
    sample_chapters = [
        {"timestamp": "00:00", "title": "Introduction"},
        {"timestamp": "02:15", "title": "Key concepts explained"},
        {"timestamp": "05:30", "title": "First demonstration"},
        {"timestamp": "08:45", "title": "Common challenges"},
        {"timestamp": "12:20", "title": "Advanced techniques"},
        {"timestamp": "15:50", "title": "Case study"},
        {"timestamp": "20:10", "title": "Results and analysis"},
        {"timestamp": "25:30", "title": "Conclusion and key takeaways"}
    ]
    
    return {"chapters": sample_chapters}

@app.post("/api")
async def api_endpoint(request: VideoRequest):
    """
    Main API endpoint that uses the real YouTube transcript and Gemini AI to generate chapters.
    """
    try:
        # Fetch transcript
        transcript, language, total_duration = fetch_transcript(request.url, request.language)
        
        # Generate initial chapters
        initial_chapters = await generate_chapters_with_gemini(transcript, total_duration)
        
        # Refine chapters
        final_chapters = await refine_chapters_with_gemini(initial_chapters, transcript, total_duration)
        
        return {"chapters": final_chapters}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)