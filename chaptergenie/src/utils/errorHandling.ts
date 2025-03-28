// Prevent all errors from reaching the console
window.addEventListener('error', (event) => {
  event.preventDefault();
  event.stopPropagation();
  return true;
});

// Prevent unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  event.stopPropagation();
  return true;
});

// Suppress ALL console output globally
window.console.error = () => {};
window.console.warn = () => {};
window.console.log = () => {};

type ErrorType = 'NETWORK' | 'VALIDATION' | 'SERVER' | 'UNKNOWN';

interface ErrorResponse {
  message: string;
  type: ErrorType;
}

const ERROR_MESSAGES = {
  NETWORK: 'Unable to connect to the service. Please check if the backend server is running.',
  VALIDATION: 'Please provide a valid YouTube URL.',
  SERVER: 'Service is temporarily unavailable. Please try again later.',
  UNKNOWN: 'An unexpected error occurred. Please try again.'
};

export const sanitizeErrorMessage = (error: unknown): ErrorResponse => {
  if (error instanceof TypeError && 
      (error.message === 'Failed to fetch' || 
       error.message.includes('ERR_CONNECTION_REFUSED') ||
       error.message.includes('net::ERR'))) {
    return {
      message: ERROR_MESSAGES.NETWORK,
      type: 'NETWORK'
    };
  }

  if (error instanceof Error && error.message.includes('500')) {
    return {
      message: ERROR_MESSAGES.SERVER,
      type: 'SERVER'
    };
  }

  if (error instanceof Error && 
    (error.message.includes('URL') || error.message.includes('validation'))) {
    return {
      message: ERROR_MESSAGES.VALIDATION,
      type: 'VALIDATION'
    };
  }

  return {
    message: ERROR_MESSAGES.UNKNOWN,
    type: 'UNKNOWN'
  };
};

export const logError = (error: unknown, context?: string) => {
  // Do nothing - errors are suppressed
}; 