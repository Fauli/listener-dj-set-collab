/**
 * ErrorBoundary component - Catches React errors and displays fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-8 border border-red-600/50">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0">
                <svg
                  className="w-12 h-12 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-red-400 mb-2">
                  Something went wrong
                </h1>
                <p className="text-gray-300 mb-4">
                  The application encountered an unexpected error and couldn't continue.
                  This has been logged and we'll look into it.
                </p>

                {/* Error details (collapsed by default) */}
                {this.state.error && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-300 text-sm mb-2">
                      Show error details
                    </summary>
                    <div className="bg-gray-900 rounded p-4 mt-2 border border-gray-700">
                      <p className="text-red-400 font-mono text-sm mb-2">
                        {this.state.error.toString()}
                      </p>
                      {this.state.errorInfo && (
                        <pre className="text-gray-500 text-xs overflow-auto max-h-48">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      )}
                    </div>
                  </details>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={this.handleReset}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 rounded font-medium transition"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition"
                  >
                    Reload Page
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded font-medium transition"
                  >
                    Go to Home
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4 mt-6">
              <p className="text-sm text-gray-500">
                If this problem persists, please try clearing your browser cache or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
