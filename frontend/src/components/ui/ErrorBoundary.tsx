import { Component, ErrorInfo, ReactNode } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className="flex items-center justify-center p-6">
        <div className="card p-6 max-w-sm w-full text-center">
          <ExclamationTriangleIcon className="w-8 h-8 text-warning mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-text-1 mb-1">Something went wrong</p>
          <p className="text-[13px] text-text-3 mb-4">
            This section failed to load. Try refreshing or come back later.
          </p>
          <button
            className="btn btn-primary text-[13px]"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-4 text-left text-[11px] text-danger bg-surface-2 rounded-lg p-3 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
