import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logCrash } from '../services/firebase.ts';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    logCrash(error, true, { componentStack: errorInfo.componentStack?.slice(0, 500) });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'sans-serif', backgroundColor: '#111', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: '#ef4444', marginBottom: 16 }}>Something went wrong.</h1>
          <p style={{ color: '#ccc', marginBottom: 24 }}>An unexpected error occurred in the application.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '12px 24px', backgroundColor: '#0055FF', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
          >
            Reload Page
          </button>
          {this.state.error && (
            <pre style={{ marginTop: 32, padding: 16, backgroundColor: '#222', borderRadius: 8, maxWidth: '80%', overflowX: 'auto', fontSize: 12 }}>
              {this.state.error.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
