"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { authService } from '@/app/service';

type LoginPageProps = {
  login: (login: string, password: string) => Promise<{ success: boolean; message?: string }>;
};

export default function LoginPage({ login }: LoginPageProps) {
  const router = useRouter();
  
  // États pour l'authentification
  const [formData, setFormData] = useState({ login: '', password: '' });
  
  // Nouveaux états pour la gestion de l'URL canonique
  const [companyCode, setCompanyCode] = useState('');
  const [needsCompanyCode, setNeedsCompanyCode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // États UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. Initialisation et vérification de l'URL
  useEffect(() => {
    const checkEnvironment = async () => {
      const host = window.location.host;
      
      // On vérifie si on a DÉJÀ un cookie valide (ex: utilisateur déconnecté qui se reconnecte)
      const existingApiUrl = Cookies.get('client_api_url');
      

      

      console.log('window.location', window.location);
      // LOGIQUE CANONIQUE : Adapte cette condition selon ton domaine principal
      // Ex: si on n'est pas sur localhost et pas sur www.tondomaine.com
      const isCanonical = await authService.SchedulerIsURICannonical(host);

      if (isCanonical && !existingApiUrl) {
        await resolveCompanyCode(host);
      } else if (!existingApiUrl) {
        // L'utilisateur est sur localhost ou le domaine générique sans cookie
        setNeedsCompanyCode(true);
        setIsInitializing(false);
      } else {
        // On a déjà l'URL de l'API en cookie, on affiche direct le login
        setNeedsCompanyCode(false);
        setIsInitializing(false);
      }
    };

    checkEnvironment();
  }, []);

  // 2. Appel à l'API Gandara pour récupérer la bonne URL
  const resolveCompanyCode = async (code: string) => {
    setLoading(true);
    setError('');
    
    try {
      // ⚠️ REMPLACE CETTE URL par la vraie route de ton API Gandara globale
      // On utilise fetch direct pour éviter l'intercepteur Axios qui pourrait bloquer
      const response = await authService.SchedulerGetAPI(code);
      
      if (!response) {
        throw new Error("Code entreprise introuvable.");
      }
      
      
      // ⚠️ Assure-toi que data.apiUrl correspond bien à la propriété renvoyée par ton API
      if (response) {
        Cookies.set('client_api_url', response, { expires: 365 });
        setNeedsCompanyCode(false); // On passe à l'écran de login
      } else {
        throw new Error("L'URL de l'API n'a pas été fournie.");
      }
    } catch (err: any) {
      setError(err.message || "Impossible de résoudre l'environnement.");
      setNeedsCompanyCode(true); // En cas d'erreur, on force la saisie manuelle
    } finally {
      setLoading(false);
      setIsInitializing(false);
    }
  };

  // 3. Soumission du formulaire "Code Entreprise" (Manuel)
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyCode.trim()) return;
    await resolveCompanyCode(companyCode.trim());
  };

  // 4. Soumission du formulaire de Login final
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(formData.login, formData.password);
      if (!result.success) {
        setError(result.message || 'Échec de la connexion');
        setLoading(false);
        return;
      }
      // On ne set pas loading à false ici car la redirection vers '/' va recharger l'app
      router.push('/');
    } catch {
      setError('Une erreur réseau est survenue.');
      setLoading(false);
    }
  };

  // ÉCRAN DE CHARGEMENT INITIAL (Pour éviter le clignotement)
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-ultra-light via-white to-primary-lighter">
         <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-ultra-light via-white to-primary-lighter">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-light transition-all duration-300">
        
        {/* Logo et Titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2 poppins">Gandara Scheduler</h1>
          <p className="text-secondary poppins">
            {needsCompanyCode ? "Trouvez votre espace de travail" : "Connectez-vous à votre espace"}
          </p>
        </div>

        {/* Message d'erreur global */}
        {error && (
          <div className="mb-4 p-3 bg-error-light border border-color-error rounded-lg text-color-error text-sm poppins text-center">
            {error}
          </div>
        )}

        {/* CONDITION : Affiche soit la demande de code, soit le login */}
        {needsCompanyCode ? (
          /* FORMULAIRE 1 : CODE ENTREPRISE */
          <form onSubmit={handleCompanySubmit} className="space-y-5">
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
                className="w-full px-4 py-3 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins"
              />
              <p className="text-xs text-gray-400 mt-2 poppins">
                Entrez le code fourni par votre administrateur pour accéder à votre environnement.
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || !companyCode.trim()}
              className="w-full bg-primary hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg poppins flex justify-center items-center"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Continuer'
              )}
            </button>
          </form>
        ) : (
          /* FORMULAIRE 2 : CONNEXION (Existant) */
          <form onSubmit={handleLoginSubmit} className="space-y-5">
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
                className="w-full px-4 py-3 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-primary mb-2 poppins">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all poppins"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg poppins flex justify-center items-center"
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
            
            {/* Petit bouton pour changer d'environnement si besoin */}
            <div className="text-center mt-4">
              <button 
                type="button" 
                onClick={() => {
                  Cookies.remove('client_api_url');
                  setNeedsCompanyCode(true);
                  setFormData({ login: '', password: '' });
                }}
                className="text-xs text-secondary hover:text-primary transition-colors underline"
              >
                Changer d'espace de travail
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}