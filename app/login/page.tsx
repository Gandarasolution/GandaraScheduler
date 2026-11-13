"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../calendrier/hooks/utils/AuthContext';

type LoginPageProps = {
  login: (login: string, password: string) => Promise<{ success: boolean; message?: string }>;
};

export default function LoginPage({ login }: LoginPageProps) {
  const router = useRouter();
  const { resolveCompanyCode } = useAuth();

  const clientLogo = localStorage.getItem('client_logo_url');

  // États pour l'authentification
  const [formData, setFormData] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  // Si le cookie client_api_url est absent, c'est qu'il faut saisir un code entreprise
  const [needsCompanyCode, setNeedsCompanyCode] = useState<boolean>(() => !Cookies.get('client_api_url'));
  const [companyCode, setCompanyCode] = useState('');
  
  // États UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Gestion du message de déconnexion pour inactivité
  useEffect(() => {
    const sessionExpiredMessage = localStorage.getItem('session_expired');
    if (sessionExpiredMessage) {
      setError(sessionExpiredMessage);
      localStorage.removeItem('session_expired');
    }
  }, []);

  // Soumission du formulaire de login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError('');

    try {
      if (needsCompanyCode) {
        if (!companyCode.trim()) {
          setError("Saisissez le code entreprise.");
          setLoading(false);
          return;
        }

        const resolveResult = await resolveCompanyCode(companyCode.trim());

        if (!resolveResult.success) {
          setError(resolveResult.error || "Impossible de trouver cet espace de travail.");
          setLoading(false);
          return;
        }
        setNeedsCompanyCode(false);
      }

      const result = await login(
        formData.login,
        formData.password
      );

      if (!result.success) {
        setError(result.message || 'Échec de la connexion');
        setLoading(false);
        return;
      }

      router.push('/');

    } catch {
      setError('Une erreur réseau est survenue.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="p-6 sm:p-8 rounded-2xl shadow-md w-full max-w-md border border-light transition-all duration-300" style={{ backgroundColor: 'var(--bg-card)' }}>
        
        {/* Logo et Titre */}
        <div className="text-center mb-8">
          {clientLogo && (
            <img src={clientLogo} alt="Logo" className="mx-auto mb-4 w-60 h-24 object-contain mb-10" />
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2 poppins uppercase">Gandara Planning</h1>
          <p className="text-secondary poppins text-sm sm:text-base">
            {needsCompanyCode ? "Trouvez votre espace de travail" : "Connectez-vous à votre espace"}
          </p>
        </div>

        {/* Message d'erreur global */}
        {error && (
          <div className="mb-4 p-3 bg-error-light border border-color-error rounded-lg text-color-error text-sm poppins text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} className="space-y-4 sm:space-y-5">
          {needsCompanyCode && (
            <div>
              <label htmlFor="companyCode" className="block text-sm font-medium text-primary mb-2 poppins">
                Code Entreprise
              </label>
              <input
                id="companyCode"
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                required
                placeholder="Ex: gandara-dev"
                className="w-full min-h-12 px-4 py-3 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins text-base"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <p className="text-xs text-tertiary mt-2 poppins">
                Entrez le code fourni par votre administrateur pour accéder à votre environnement.
              </p>
            </div>
          )}
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-primary mb-2 poppins">
              Identifiant
            </label>
            <input
              id="login"
              type="text"
              value={formData.login}
              onChange={(e) => setFormData({ ...formData, login: e.target.value })}
              required
              placeholder="Votre identifiant"
              className="w-full min-h-12 px-4 py-3 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins text-base"
              style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-primary mb-2 poppins">
              Mot de passe
            </label>
            <div className="relative w-full">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="••••••••"
                className="w-full min-h-12 pl-4 pr-12 py-3 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins text-base"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none p-1"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-12 bg-primary hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg poppins flex justify-center items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </button>
          
          {/* {needsCompanyCode && (
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => {
                  Cookies.remove('client_api_url', { path: '/' });
                  Cookies.remove('client_mercure_url', { path: '/' });
                  localStorage.removeItem('client_logo_url');
                  setNeedsCompanyCode(true);
                  setFormData({ login: '', password: '' });
                }}
                className="text-xs text-secondary hover:text-primary transition-colors underline cursor-pointer"
              >
                Changer d'espace de travail
              </button>
            </div>
          )} */}
        </form>
      </div>
    </div>
  );
}