/**
 * @fileoverview Error Boundary avec retry automatique et UI de secours
 * 
 * Capture les erreurs JavaScript dans les composants enfants
 * et affiche une interface de récupération avec plusieurs options :
 * - Retry automatique avec délai progressif
 * - Retry manuel
 * - Affichage des détails d'erreur (dev mode)
 * - Rapport d'erreur (optionnel)
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  retryDelay?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    
    // Logger l'erreur
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Callback personnalisé
    if (onError) {
      onError(error, errorInfo);
    }
    
    this.setState({ errorInfo });
    
    // Retry automatique si pas encore atteint le maximum
    this.scheduleRetry();
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  /**
   * Planifie un retry automatique avec délai progressif
   */
  scheduleRetry = () => {
    const { maxRetries = 3, retryDelay = 2000 } = this.props;
    const { retryCount } = this.state;
    
    if (retryCount < maxRetries) {
      // Délai progressif : 2s, 4s, 8s...
      const delay = retryDelay * Math.pow(2, retryCount);
      
      this.setState({ isRetrying: true });
      
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, delay);
    }
  };

  /**
   * Tente de récupérer de l'erreur
   */
  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));
  };

  /**
   * Reset complet de l'état
   */
  handleReset = () => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      showDetails: false,
    });
  };

  /**
   * Retour à l'accueil
   */
  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  /**
   * Toggle des détails d'erreur
   */
  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    const { hasError, error, errorInfo, retryCount, isRetrying, showDetails } = this.state;
    const { children, fallback, maxRetries = 3 } = this.props;

    if (hasError) {
      // Fallback personnalisé
      if (fallback) {
        return fallback;
      }

      // UI de secours par défaut
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Oups !</h1>
                  <p className="text-white/90">Une erreur inattendue s'est produite</p>
                </div>
              </div>
              
              {isRetrying && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3">
                  <RefreshCw size={20} className="animate-spin" />
                  <div>
                    <p className="font-semibold">Tentative de récupération...</p>
                    <p className="text-sm text-white/80">
                      Essai {retryCount + 1} sur {maxRetries}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Body */}
            <div className="p-8">
              {/* Message d'erreur */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                  <p className="text-sm font-mono text-red-800 break-words">
                    {error.toString()}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <RefreshCw size={20} className={isRetrying ? 'animate-spin' : ''} />
                  Réessayer
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  <Home size={20} />
                  Accueil
                </button>
              </div>

              {/* Détails techniques (collapsable) */}
              <div className="border-t border-gray-200 pt-6">
                <button
                  onClick={this.toggleDetails}
                  className="flex items-center justify-between w-full text-left text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <span>Détails techniques</span>
                  {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {showDetails && errorInfo && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg overflow-auto max-h-64">
                    <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-words">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>

              {/* Informations */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Conseils :</strong>
                </p>
                <ul className="mt-2 text-sm text-blue-700 space-y-1 ml-4 list-disc">
                  <li>Vérifiez votre connexion internet</li>
                  <li>Actualisez la page (F5)</li>
                  <li>Videz le cache de votre navigateur</li>
                  <li>Si le problème persiste, contactez le support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook pour reset l'Error Boundary depuis un composant enfant
 */
export const useErrorBoundary = () => {
  const [, setError] = React.useState();

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
};
