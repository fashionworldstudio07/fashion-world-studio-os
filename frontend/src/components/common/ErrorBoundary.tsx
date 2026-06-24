import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0d14] text-[var(--text-primary)] px-4">
          <div className="max-w-md w-full bg-[#111622] border border-[rgba(212,160,23,0.2)] rounded-3xl p-8 text-center shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 bg-[rgba(212,160,23,0.1)] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[rgba(212,160,23,0.3)]">
              <svg className="w-8 h-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Something went wrong</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              An unexpected error occurred in the application rendering.
            </p>
            
            {this.state.error && (
              <div className="bg-[#0e121c] border border-[rgba(255,255,255,0.05)] rounded-xl p-4 mb-6 text-left max-h-[120px] overflow-y-auto">
                <p className="font-mono text-xs text-red-400 break-all">{this.state.error.toString()}</p>
              </div>
            )}
            
            <div className="flex gap-4 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-2.5 bg-[var(--primary)] text-black font-semibold rounded-xl text-sm transition-all duration-300 hover:bg-[var(--primary-hover)] shadow-[0_4px_15px_rgba(212,160,23,0.3)]"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
