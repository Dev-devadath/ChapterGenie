"use client";
import { useState } from 'react';

interface Chapter {
  timestamp: string;
  title: string;
}

export default function Home() {
  const [url, setUrl] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url) {
      setError('Please enter a YouTube URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Sending request to backend with URL:', url);
      
      const response = await fetch('http://localhost:8000/generate_chapters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to analyze video');
      }

      const data = await response.json();
      console.log('Received data:', data);
      
      if (!data.chapters || !Array.isArray(data.chapters)) {
        throw new Error('Invalid response format from server');
      }
      
      setChapters(data.chapters);
    } catch (err) {
      console.error('Error details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setChapters([]); // Clear chapters on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6 text-center">YouTube Chapter Generator</h1>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter YouTube URL"
                className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Analyzing...' : 'Analyze Video'}
              </button>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {loading && (
              <div className="text-center text-gray-600">
                Analyzing video and generating chapters...
              </div>
            )}

            {chapters.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-4">Video Chapters:</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <ul className="space-y-3">
                    {chapters.map((chapter, index) => (
                      <li key={index} className="flex items-center gap-3">
                        <span className="font-mono text-blue-600">{chapter.timestamp}</span>
                        <span className="text-gray-700">-</span>
                        <span className="flex-1">{chapter.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 