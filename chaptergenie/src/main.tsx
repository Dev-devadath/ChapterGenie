// Original console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

// Intercept all console methods
console.error = function(...args) {
  // Convert args to string for easier checking
  const errorString = args.join(' ');
  
  // Check for network errors or any URL patterns
  if (errorString.includes('net::') || 
      errorString.includes('ERR_') || 
      errorString.includes('localhost') || 
      errorString.includes('127.0.0.1') ||
      errorString.includes('http://') || 
      errorString.includes('https://') ||
      errorString.includes('POST') ||
      errorString.includes('/api/')) {
    
    // Replace with custom message
    originalConsoleError.call(console, "HAHA NO IP FOR YOU");
    return;
  }
  
  // Pass through other errors
  originalConsoleError.apply(console, args);
};

console.warn = function(...args) {
  // Convert args to string for easier checking
  const warningString = args.join(' ');
  
  // Check for network errors or any URL patterns
  if (warningString.includes('net::') || 
      warningString.includes('ERR_') || 
      warningString.includes('localhost') || 
      warningString.includes('127.0.0.1') ||
      warningString.includes('http://') || 
      warningString.includes('https://') ||
      warningString.includes('POST') ||
      warningString.includes('/api/')) {
    
    // Replace with custom message
    originalConsoleWarn.call(console, "HAHA NO IP FOR YOU");
    return;
  }
  
  // Pass through other warnings
  originalConsoleWarn.apply(console, args);
};

console.log = function(...args) {
  // Convert args to string for easier checking
  const logString = args.join(' ');
  
  // Check for network errors or any URL patterns
  if (logString.includes('net::') || 
      logString.includes('ERR_') || 
      logString.includes('localhost') || 
      logString.includes('127.0.0.1') ||
      logString.includes('http://') || 
      logString.includes('https://') ||
      logString.includes('POST') ||
      logString.includes('/api/')) {
    
    // Replace with custom message
    originalConsoleLog.call(console, "HAHA NO IP FOR YOU");
    return;
  }
  
  // Pass through other logs
  originalConsoleLog.apply(console, args);
};

// Add a more comprehensive error interception
const originalFetch = window.fetch;
window.fetch = function(input, init) {
  return originalFetch.apply(this, arguments)
    .catch(error => {
      console.error("HAHA NO IP FOR YOU");
      throw new Error("HAHA NO IP FOR YOU");
    });
};

// Global error handler 
window.addEventListener('error', (event) => {
  // Prevent all errors from showing in console with URLs
  if (event.message || event.filename) {
    event.preventDefault();
    console.error("HAHA NO IP FOR YOU");
    return true;
  }
  return false;
}, true);

// Suppress unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  console.error("HAHA NO IP FOR YOU");
  return true;
});

import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
