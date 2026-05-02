import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-3xl mx-auto py-8 px-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h1 className="text-lg font-bold text-red-900 mb-2">Une erreur s'est produite</h1>
            <p className="text-red-700 mb-4">
              {this.state.error?.message || "Une erreur inattendue s'est produite."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
