"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../calendrier/hooks/utils/AuthContext';

// Image par défaut en Base64 si rien n'est dans le localStorage
const DEFAULT_LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASgAAAEqCAMAAACRET0gAAAC/VBMVEVHcEwaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsaGBsm6nQjAAAA/nRSTlMABP4Q+gkDAf0C4Az8BuIHHBXP6NP37OaYeApA1jAT+Pb19B1g3B6IwA8jPBbuyPJSFPBIUDdYQxcZ3hrhOSBU6gjxuKiw5E7rk8GdvzOevg4F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";

type LoginPageProps = {
  login: (login: string, password: string) => Promise<{ success: boolean; message?: string }>;
};

export default function LoginPage({ login }: LoginPageProps) {
  const router = useRouter();
  const { resolveCompanyCode } = useAuth();

  const [clientLogo, setClientLogo] = useState<string>(DEFAULT_LOGO_BASE64);

  // États pour l'authentification
  const [formData, setFormData] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // Si le cookie client_api_url est absent, c'est qu'il faut saisir un code entreprise
  const [needsCompanyCode, setNeedsCompanyCode] = useState<boolean>(() => !Cookies.get('client_api_url'));
  const [companyCode, setCompanyCode] = useState('');

  // États UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Récupération du logo client et du message de déconnexion au montage
  useEffect(() => {
    const storedLogo = localStorage.getItem('client_logo_url');
    if (storedLogo && storedLogo.trim() !== '') {
      setClientLogo(storedLogo);
    } else {
      setClientLogo(DEFAULT_LOGO_BASE64);
    }

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
    <div
      className="fixed inset-0 w-full h-[100dvh] flex overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary-500)' }}
    >
      {/* PARTIE GAUCHE : Image plein écran */}
      <div className="hidden lg:block lg:flex-1 relative h-full overflow-hidden">
        <img
          src="/images/background.avif"
          alt="Illustration Gandara Planning"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />
      </div>

      {/* PARTIE DROITE : Bandeau de connexion */}
      <div
        className="w-full lg:w-[460px] xl:w-[520px] shrink-0 h-full
        flex flex-col justify-between overflow-y-auto overscroll-none
        px-6 pt-12 pb-8 sm:px-12 lg:pt-14 lg:pb-10
        lg:border-l border-light shadow-2xl z-10"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="w-full max-w-sm mx-auto">
          {/* Logo et Titre */}
          <div className="text-center mb-8 sm:mb-10">
            {clientLogo && (
              <img
                src={clientLogo}
                alt="Logo"
                className="mx-auto w-40 h-14 sm:w-52 sm:h-16 object-contain mb-3"
              />
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-primary poppins uppercase">
              Gandara Planning
            </h1>
          </div>

          {/* Message d'erreur global */}
          {error && (
            <div className="mb-5 p-3 bg-error-light border border-color-error rounded-lg text-color-error text-sm poppins text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            {needsCompanyCode && (
              <div>
                <label htmlFor="companyCode" className="block text-sm font-medium text-primary mb-2 poppins">
                  Code Entreprise
                </label>
                <input
                  id="companyCode"
                  type="text"
                  autoComplete="organization"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  required
                  placeholder="Ex: gandara-dev"
                  className="w-full min-h-11 px-4 py-2.5 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins text-base"
                  style={{ backgroundColor: 'var(--bg-primary-500)', color: 'var(--text-primary)' }}
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
                autoComplete="username"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                required
                placeholder="Votre identifiant"
                className="w-full min-h-11 px-4 py-2.5 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins text-base"
                style={{ backgroundColor: 'var(--bg-primary-500)', color: 'var(--text-primary)' }}
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
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="••••••••"
                  className="w-full min-h-11 pl-4 pr-12 py-2.5 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins text-base"
                  style={{ backgroundColor: 'var(--bg-primary-500)', color: 'var(--text-primary)' }}
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

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-11 bg-primary-500 hover:bg-primary-500-600 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg poppins flex justify-center items-center"
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
            </div>
          </form>
        </div>

        {/* PIED DE PAGE : Logo Gandara Solution */}
        <div className="mb-15 mt-auto pt-8 pb-2 flex flex-col items-center justify-center shrink-0">          
          <svg
            id="Calque_1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="42 52 200 68"
            className="h-20 w-auto opacity-85 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-primary, #1d1d1b)' }}
            aria-label="Gandara Solution"
          >
            <g fill="currentColor">
              <g>
                <path d="M116.77,93.02c-1.13.85-2.32,1.47-3.59,1.88-1.27.41-2.65.61-4.16.61s-2.79-.22-4.01-.67c-1.22-.44-2.27-1.09-3.16-1.94-.93-.89-1.65-1.93-2.14-3.12-.49-1.19-.73-2.47-.73-3.83,0-2.88.96-5.2,2.88-6.95,1.92-1.75,4.46-2.63,7.62-2.63,1.15,0,2.3.14,3.42.41s2.28.7,3.45,1.27v4.06c-1.22-.63-2.39-1.09-3.5-1.4-1.11-.31-2.15-.46-3.12-.46-1.87,0-3.33.51-4.4,1.52s-1.59,2.41-1.59,4.19.51,3.12,1.52,4.14c1.01,1.03,2.37,1.54,4.09,1.54.46,0,.91-.05,1.36-.14.45-.1.9-.24,1.35-.42v-2.33h0v-3.48h4.71v7.75Z" />
                <path d="M118.41,95.18l8.06-18.5h5.34l7.21,18.5h-4.91l-1.32-3.6h-7.97l-1.48,3.6h-4.93ZM126.16,88.41h5.46l-2.59-7.03-2.87,7.03Z" />
                <path d="M144.85,83.56v11.62h-4.57v-18.5h4.06l9.92,11.03v-11.03h4.57v18.5h-3.62l-10.35-11.62Z" />
                <path d="M161.3,95.18v-18.5h6.94c1.98,0,3.52.15,4.61.45,1.09.3,2.1.79,3.01,1.48,1.18.89,2.08,1.96,2.68,3.19.61,1.24.91,2.61.91,4.12,0,1.65-.37,3.14-1.11,4.49-.74,1.34-1.81,2.47-3.21,3.36-.79.5-1.67.86-2.63,1.08-.96.22-2.38.32-4.27.32h-6.94ZM165.92,80.43v11.01h3.45c1.57,0,2.85-.51,3.84-1.54.99-1.03,1.49-2.35,1.49-3.97s-.5-2.94-1.49-3.97c-.99-1.02-2.27-1.53-3.84-1.53h-3.45Z" />
                <path d="M178.46,95.18l8.06-18.5h5.34l7.21,18.5h-4.91l-1.32-3.6h-7.97l-1.48,3.6h-4.93ZM186.21,88.41h5.46l-2.59-7.03-2.87,7.03Z" />
                <path d="M201.54,95.18v-18.5h6.84c2.51,0,4.37.44,5.57,1.31,1.2.87,1.8,2.23,1.8,4.06,0,1.02-.26,1.9-.79,2.62s-1.34,1.34-2.43,1.84c.46.17.87.45,1.24.84.37.39.68.89.96,1.49l2.95,6.33h-5.22l-2.35-5.33c-.38-.85-.81-1.43-1.3-1.74-.48-.32-1.17-.48-2.06-.48-.07,0-.16,0-.28.01-.11,0-.2.01-.26.01v7.52h-4.64ZM208.4,84.28c.85,0,1.49-.18,1.91-.54.42-.36.63-.9.63-1.63s-.22-1.23-.65-1.59-1.06-.55-1.88-.55h-2.22v4.31h2.22Z" />
                <path d="M218.5,95.18l8.06-18.5h5.34l7.21,18.5h-4.91l-1.32-3.6h-7.97l-1.48,3.6h-4.93ZM226.25,88.41h5.46l-2.59-7.03-2.87,7.03Z" />
              </g>
              <g>
                <path d="M102.16,107.06v-1.36c.46.29.85.49,1.17.6.32.11.62.17.92.17s.53-.05.68-.14c.15-.09.23-.23.23-.41,0-.15-.05-.26-.14-.35s-.32-.19-.67-.32c-.87-.31-1.47-.62-1.8-.94-.33-.32-.49-.73-.49-1.22,0-.52.21-.95.64-1.27.43-.33.98-.49,1.67-.49.35,0,.69.04,1.04.13.35.08.69.21,1.04.37v1.25c-.41-.21-.78-.36-1.11-.46-.33-.1-.62-.15-.89-.15-.29,0-.51.04-.67.13-.15.08-.23.21-.23.36,0,.13.07.25.21.36.14.11.34.22.62.32.06.02.15.06.27.1.58.22,1,.4,1.25.56.27.16.47.37.6.63.14.26.2.56.2.9,0,.57-.21,1.01-.64,1.33s-1.02.49-1.78.49c-.38,0-.75-.05-1.1-.15-.35-.1-.69-.25-1.02-.45Z" />
                <path d="M120.1,104.49c0-.45.08-.88.24-1.26.16-.39.4-.73.72-1.03.31-.29.66-.51,1.05-.65.39-.14.83-.21,1.31-.21s.93.07,1.32.22.75.36,1.05.65c.31.3.55.65.71,1.03.16.39.24.81.24,1.26s-.08.87-.24,1.26c-.16.39-.4.73-.71,1.02-.31.29-.67.51-1.06.66s-.83.22-1.31.22-.91-.07-1.31-.22-.74-.37-1.06-.66c-.31-.3-.55-.64-.71-1.02-.16-.39-.24-.8-.24-1.26ZM121.68,104.49c0,.54.16.99.49,1.34.33.35.75.53,1.25.53s.93-.18,1.26-.53c.33-.35.49-.8.49-1.34s-.16-1-.49-1.35c-.33-.35-.75-.53-1.26-.53s-.93.18-1.25.53-.49.8-.49,1.35Z" />
                <path d="M140.45,107.55v-6.11h1.53v4.93h2.64v1.18h-4.17Z" />
                <path d="M163.68,101.43v3.5c0,.86-.25,1.52-.76,2-.51.48-1.22.72-2.13.72s-1.62-.24-2.13-.72-.76-1.15-.76-2v-3.5h1.54v3.44c0,.49.12.86.35,1.12.23.26.57.39,1.01.39s.77-.13,1-.38c.23-.26.35-.63.35-1.12v-3.44h1.53Z" />
                <path d="M179.13,107.55v-4.98h-2.02v-1.14h5.66v1.14h-2.02v4.98h-1.61Z" />
                <path d="M196.27,107.55v-6.11h1.58v6.11h-1.58Z" />
                <path d="M211.58,104.49c0-.45.08-.88.24-1.26.16-.39.4-.73.72-1.03.31-.29.66-.51,1.05-.65.39-.14.83-.21,1.31-.21s.93.07,1.32.22.75.36,1.05.65c.32.3.55.65.71,1.03.16.39.24.81.24,1.26s-.08.87-.24,1.26c-.16.39-.4.73-.71,1.02-.31.29-.67.51-1.06.66-.39.15-.83.22-1.31.22s-.91-.07-1.3-.22c-.39-.15-.74-.37-1.06-.66-.31-.3-.55-.64-.71-1.02s-.24-.8-.24-1.26ZM213.15,104.49c0,.54.16.99.49,1.34.33.35.75.53,1.25.53s.93-.18,1.26-.53c.33-.35.49-.8.49-1.34s-.16-1-.49-1.35-.75-.53-1.26-.53-.92.18-1.25.53-.49.8-.49,1.35Z" />
                <path d="M233.43,103.7v3.84h-1.51v-6.11h1.34l3.28,3.64v-3.64h1.51v6.11h-1.2l-3.42-3.84Z" />
              </g>
            </g>
            <polygon fill="currentColor" points="100.43 68.34 100.43 68.34 100.52 68.37 100.43 68.34" />
            <polygon fill="currentColor" points="100.43 68.34 100.43 68.34 100.52 68.37 100.43 68.34" />
            <g fill="currentColor" fillRule="evenodd">
              <g>
                <path d="M66.47,54.89h0s0,0,0,0Z" />
                <path d="M69.71,66.31l-1.94-.91h0c.02.1.04.21.07.32,0,.03.02.07.02.1.02.08.04.17.06.25.01.04.02.08.03.12.03.09.05.19.08.28,0,.03.02.06.03.08.04.12.08.24.14.36.01.03.03.06.04.09.04.09.09.19.13.28.02.04.04.08.07.12.05.09.11.19.16.28.02.04.05.07.07.11.09.13.18.26.28.39.01.02.03.03.04.05.09.11.2.23.31.34.04.04.08.08.12.12.1.09.2.19.31.28.05.04.1.08.15.13.14.11.28.23.44.34.03.02.05.04.08.06.19.13.39.26.61.39.06.04.13.07.19.11.17.1.34.19.52.29.08.04.17.09.25.13.07.03.12.07.19.1-.02,0-.03-.02-.05-.03.03.02.07.03.11.05-.02,0-.05-.01-.06-.02.11.05.23.1.34.15.13.06.25.12.38.17.19.08.39.16.6.24.14.05.27.11.41.16.24.09.49.17.75.26.13.05.26.09.4.14.4.13,2.93,1.05,3.38,1.17l.3-.58c-2.9-1.41-7.46-4.08-9.01-5.94Z" />
                <path d="M69.96,63.74c-.05-.05-.09-.11-.14-.16-.19-.22-.38-.44-.55-.67-.02-.03-.05-.06-.07-.09-.19-.25-.36-.49-.52-.74-.04-.06-.07-.11-.11-.17-.16-.25-.31-.5-.45-.75,0,0,0,0,0,0-.14-.25-.26-.5-.38-.75-.03-.06-.05-.11-.08-.17-.11-.25-.22-.49-.31-.73,0-.03-.02-.05-.03-.07-.09-.23-.16-.45-.23-.67-.02-.05-.03-.1-.05-.15-.07-.24-.14-.47-.2-.7,0-.04-.02-.08-.03-.11-.05-.21-.09-.41-.13-.62,0-.04-.02-.08-.02-.11-.04-.22-.08-.44-.11-.66,0-.04-.01-.08-.02-.13-.03-.2-.05-.39-.06-.58,0-.02,0-.03,0-.05h0s0-.01,0-.02c-.02-.24-.03-.46-.04-.68,0-.03,0-.07,0-.1,0-.21-.01-.41,0-.61,0-.03,0-.07,0-.1,0-.19,0-.37.01-.54,0-.03,0-.05,0-.08,0-.17.02-.34.03-.49l10.43,12.56s2.84,3.66,3.66,4.97c-.04.06-.82.89-.96,1.05-4.38-2.65-8.4-6.43-9.64-7.87Z" />
                <path d="M48.02,65.47c-2.06-2.36-3.1-4.83-3.66-6.38l18.98,9.29,1.27.6c2.74,1.31,5.1,2.68,7.09,3.97,0,0,0,0,0,0,.19.12.37.24.55.37.1.06.2.13.29.19.3.2.58.4.86.59,0,0-7.17-.26-13.21-2-5.91-1.7-10.68-4.85-12.17-6.64Z" />
                <path d="M70.07,84.77c-1.34.13-2.47-.12-3.15-.31l8-4.32.53-.29c1.14-.63,2.21-1.12,3.17-1.49,0,0,0,0,0,0,.09-.04.18-.07.27-.1.05-.02.09-.04.14-.05.14-.05.28-.1.42-.15,0,0-1.89,2.44-4.01,4.13-2.07,1.64-4.37,2.53-5.37,2.6Z" />
                <path d="M60.87,77.13c-1.72-.02-3.17-.32-4.38-.77-.11-.04-.22-.08-.33-.12-.03-.01-.06-.02-.08-.04-.62-.25-1.17-.55-1.67-.86,0,0,0,0,0,0-.16-.1-.32-.21-.47-.32-.03-.02-.05-.04-.07-.05-.2-.15-.39-.3-.56-.45-.08-.07-.16-.13-.23-.2-.06-.05-.11-.1-.16-.15-.09-.09-.18-.17-.27-.26-.04-.05-.09-.09-.13-.13-.09-.09-.17-.19-.25-.28-.03-.04-.06-.07-.09-.11-.1-.12-.2-.24-.28-.35h2.45s.26,0,.26,0c2.8,1.31,6.19,2.17,10.26,2.2,4.1.08,8.49-.49,8.49-.49l-.35.99s-3.34.8-6.74,1.21c-2.32.28-4.96.22-5.38.19Z" />
                <path d="M76.8,75.56l-10.3,3.13c-.67.21-1.32.38-1.95.54l-6.74,1.81c.79,1.39,4.45,3.69,9.16,1.87,1.35-.49,2.92-1.26,2.92-1.26l7.72-4.26-.8-1.82Z" />
              </g>
              <g>
                <polygon points="100.24 68.33 100.24 68.33 100.33 68.37 100.24 68.33" />
                <path d="M80.06,90.25s0,0,.01,0c0,0,0,0-.01,0Z" />
              </g>
              <g>
                <path d="M87.94,97.42s0,0,0,0c0,0-.01,0-.02-.01,0,0,0,0,0,0Z" />
                <path d="M97.53,66.52l-.07-.08c-.68-.85-3.19-3.61-6.85-3.61-2.87,0-5.8,1.7-8.69,5.06l-.4.47h0c-1.52,1.82-6.64,8.05-8.44,16.9h0s-1.65,6.46,3.57,14.98l.46.74-.03-.05.04.06.02.03c.6,1.02,6.18,10.12,15.83,15.74h.03s.36.3.36.3v-.38c-.01-.06-.06-1.41-1.52-4l-.71-1.26,4.77,2.61-.12-.39c-.06-.19-1.47-4.8-6.26-9.52l-.86-.89,2.59.77-.13-.36s-.73-1.99-3.04-3.96l-.81-.69,2.55-.1c-.19-1.46-3.7-5.04-10.42-5.71l.03-1.72c4.74.08,7.39-5.16,9.76-11.14.66-1.68,1.85-5.4,3.53-7.91l.03-.05c1.07-1.72,2.96-2.86,5.1-2.86,0,0,.17,0,.35.02l9.48,1.2-10.13-4.17ZM91.26,113.45c.56,1.06.85,1.96.85,1.96-2.65-2.04-5.67-4.73-7.93-7.17-1.38-1.43-2.21-2.49-2.05-2.31-2.32-2.61-3.75-5.01-4.42-5.84,5.39,3.86,8.73,6.99,10.85,9.48,0,0,0,0-.01,0,0,0,0,0,0,0,1.05,1.24,1.8,2.32,2.35,3.26,0,0,0,0,0,0,0,0,.05.07.35.63ZM93.98,111.54l-1.72-.84h0s-1.63-.8-1.63-.8c-.08-.11-.17-.22-.26-.33.05.06.1.12.14.18-2.04-2.64-5.4-6.08-10.93-10.21,1.96.77,3.68,1.65,5.2,2.58,0,0,0,0,0,0,1.14.7,2.16,1.43,3.08,2.17h0c3.4,2.73,5.29,5.56,6.14,7.25ZM79.57,94.58c4.67.25,7.12,1.63,8.38,2.84.31.3.55.59.73.85l-1.33-.02c-.18-.13-2.99-2.04-7.78-3.63,0-.01,0-.02,0-.03ZM89.58,102.6l-1.47-.65s0,0,0,0c0,0,0,0,0,0l-1.47-.65c-.17-.13-.35-.27-.52-.4-2.14-1.63-4.66-3.17-7.65-4.47,0,0,6.81.72,11.1,6.17ZM97.06,68.78s-5.48-.51-8.81,4.99c0,0,2.18-1.57,4.09-2.23-.68.81-1.26,1.71-1.74,2.61,0,0,0,0,0,0-.24.45-.75,1.81-1.49,3.55,0-.01.01-.03.02-.04-3.66,11.4-8.35,12.87-10.2,12.46-.79-.17-1.03-.55-1.03-.55l.02,1.18c.04,2.96-.23,5.47-1.08,6.57-3.69-6.64-3.44-10.45-1.63-13.72,0,0-.23,3.19.54,4.16-.46-3.73,2.26-6.5,2.26-6.5,0,0,1.41-.49,1.79-.82,0,0-.28,1.74-1.03,3.43,0,0,3.72-1.88,3.66-7.69l-2.03-1.27-1.69-1.06c1.48-2.65,2.72-3.88,2.72-3.89l.05-.04.03-.04s0,0,0,0h0c2.84-3.76,5.42-5.44,7.64-5.97.67-.16,1.3-.21,1.89-.19.4.01.78.06,1.14.14.73.15,1.39.42,1.97.73.29.16.56.32.81.5.13.09.25.17.36.26.23.18.44.35.63.53.76.69,1.17,1.27,1.17,1.28l.12.16,2.99,1.02s0,0,0,0h0s0,0,0,0l2.38.82,2.64.91-6.63-1.08c-.54-.13-1.06-.2-1.56-.2Z" />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}