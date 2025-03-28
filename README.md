# YouTube Chapter Generator API

A FastAPI backend service that generates chapter timestamps for YouTube videos using Google's Gemini AI. This project includes both a backend API and a frontend web application (Chapter Genie) for a complete user experience.

## Features

### Backend API

- Extract transcripts from YouTube videos
- Generate intelligent chapter timestamps using Gemini 2.0 Flash model
- Two-stage AI processing for optimal chapter generation:
  - Initial chapter generation based on transcript analysis
  - Chapter refinement to optimize and balance the final output
- Format timestamps in MM:SS format
- Automatic language detection with English prioritization
- Support for multiple languages
- Error handling for invalid URLs or unavailable transcripts
- Rate limiting to prevent API abuse
- Multiple API endpoints for flexibility

### Frontend Application (Chapter Genie)

- Modern, responsive UI built with React, TypeScript, and Tailwind CSS
- Simple YouTube URL input interface
- Displays generated chapters with clickable timestamps
- Dark/light theme toggle
- Error handling and user feedback
- Direct links to YouTube video at specific timestamps

## Project Structure

- `/Backend` - FastAPI backend service
- `/chapter-genie` - React frontend application

## Setup

### Backend Setup

#### Prerequisites

- Python 3.8+
- pip

#### Installation

1. Clone the repository
2. Navigate to the Backend directory
3. Install dependencies:

```bash
pip install -r requirements.txt
```

#### Environment Setup

Create a `.env` file in the Backend directory with the following variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Frontend Setup

#### Prerequisites

- Node.js & npm

#### Installation

1. Navigate to the chapter-genie directory
2. Install dependencies:

```bash
npm install
```

## Usage

### Running the Backend API

```bash
cd Backend
python main.py
```

The API will be available at http://localhost:8000

### Running the Frontend Application

```bash
cd chapter-genie
npm run dev
```

The frontend will be available at http://localhost:5173

## API Endpoints

### GET /

Root endpoint that confirms the API is running.

**Response:**

```json
{
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
```

### POST /api, /generate_chapters, /process-video

Endpoints to generate chapter timestamps for a YouTube video using Gemini AI.

**Request Body:**

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "language": "en" // Optional, will auto-detect if not provided
}
```

**Response:**

```json
{
  "chapters": [
    {
      "timestamp": "00:00",
      "title": "Introduction"
    }
    // More refined chapters
  ]
}
```

## Error Handling

The API handles various error scenarios:

- Invalid YouTube URL: 400 Bad Request
- Transcript not available: 404 Not Found
- Rate limit exceeded: 429 Too Many Requests
- Unexpected errors: 500 Internal Server Error

## How It Works

1. **Transcript Extraction**: The API extracts the transcript from the provided YouTube video URL
2. **Language Detection**: If no language is specified, the API automatically detects the best available language
3. **Initial Chapter Generation**: Gemini AI analyzes the transcript to identify major topic shifts and generates initial chapters
4. **Chapter Refinement**: A second pass with Gemini AI optimizes the chapters for balance and relevance
5. **Final Output**: The API returns the refined chapter timestamps
6. **Frontend Display**: The Chapter Genie frontend displays the chapters with clickable timestamps that link directly to those points in the YouTube video

## Testing

A test script is included to verify the API functionality:

```bash
python test_api.py
```

## Future Enhancements

- Support for more video platforms
- Custom chapter generation parameters
- User accounts and saved chapter history
- Export chapters in various formats
- Embedding options for content creators

## Contributors

- Special thanks to [@neumaz66](https://github.com/neumaz66) for their valuable contributions to the project, including improvements to the AI prompt engineering and frontend UI enhancements.

## License

MIT
