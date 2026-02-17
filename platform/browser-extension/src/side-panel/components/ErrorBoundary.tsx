import { AlertTriangle } from 'lucide-react';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level error boundary for the side panel. Catches render errors and
 * displays a recoverable fallback UI instead of a white screen.
 *
 * React error boundaries must be class components — there is no hook-based
 * equivalent for componentDidCatch/getDerivedStateFromError.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[opentabs:side-panel] Render error caught by ErrorBoundary:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16 text-center text-gray-200">
          <AlertTriangle className="mb-4 h-12 w-12 text-amber-400" />
          <h2 className="mb-2 text-lg font-medium text-gray-300">Something went wrong</h2>
          <p className="mb-6 max-w-[240px] text-sm text-gray-500">The side panel encountered an unexpected error.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-amber-400">
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };
