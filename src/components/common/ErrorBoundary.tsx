import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, LogOut, ChevronDown, ChevronUp } from 'lucide-react'
import { authService } from '../../services/authService'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    try {
      window.history.replaceState({}, '', '/')
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleSignOut = async () => {
    try {
      await authService.signOut()
    } catch (e) {
      console.warn('Sign out during error recovery error:', e)
    }
    try {
      window.history.replaceState({}, '', '/')
    } catch {}
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'An unexpected rendering error occurred.'
      const componentStack = this.state.errorInfo?.componentStack || ''

      return (
        <div
          style={{
            minHeight: '100vh',
            width: '100%',
            maxWidth: '100%',
            backgroundColor: '#0C1012',
            color: '#FFFFFF',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px 16px',
            boxSizing: 'border-box',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              backgroundColor: '#161B1E',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '28px 20px',
              textAlign: 'center',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(237, 73, 86, 0.15)',
                border: '1.5px solid rgba(237, 73, 86, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ED4956',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h2 style={{ fontSize: '19px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>
                {this.props.fallbackTitle || 'Something Went Wrong'}
              </h2>
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.65)',
                  margin: 0,
                  lineHeight: 1.5,
                }}
              >
                An issue occurred while rendering the page. You can reload or reset your session safely.
              </p>
            </div>

            {/* Error Message Box */}
            <div
              style={{
                width: '100%',
                backgroundColor: 'rgba(237, 73, 86, 0.08)',
                border: '1px solid rgba(237, 73, 86, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#fca5a5',
                wordBreak: 'break-word',
                lineHeight: 1.4,
              }}
            >
              <strong>Error:</strong> {errorMsg}
            </div>

            {/* Expandable Technical Details */}
            {componentStack && (
              <div style={{ width: '100%', textAlign: 'left' }}>
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                  }}
                >
                  <span>{this.state.showDetails ? 'Hide' : 'Show'} Component Stack</span>
                  {this.state.showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {this.state.showDetails && (
                  <pre
                    style={{
                      marginTop: '8px',
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.6)',
                      overflowX: 'auto',
                      maxHeight: '140px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                width: '100%',
                marginTop: '4px',
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  height: '42px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0095F6, #1877F2)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} />
                <span>Reload Application</span>
              </button>

              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Home size={14} />
                  <span>Home Feed</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleSignOut}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px solid rgba(237, 73, 86, 0.3)',
                    backgroundColor: 'rgba(237, 73, 86, 0.08)',
                    color: '#ED4956',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
