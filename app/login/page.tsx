"use client";

import { Dispatch, SetStateAction, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '@/app/calendrier/types';
import authService from '@/app/service/auth.service';


type LoginPageProps = {
  setUser: Dispatch<SetStateAction<User | undefined>>;
};

export default function LoginPage(
  { setUser }: LoginPageProps
) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    login: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login({
        login: formData.login,
        password: formData.password,
      });
      console.log(response);
      

      if (response?.error === 0 && response.user) {
        authService.saveSession(response.token);
        setUser(response.user);
        router.push('/');
      } 
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-ultra-light via-white to-primary-lighter">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-light">
        {/* Logo et Titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2 poppins">Gandara Scheduler</h1>
          <p className="text-secondary poppins">Connectez-vous à votre espace</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-light border border-color-error rounded-lg text-color-error text-sm poppins">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-primary mb-2 poppins">
              Login
            </label>
            <input
              id="login"
              type="login"
              value={formData.login}
              onChange={(e) => setFormData({ ...formData, login: e.target.value })}
              required
              placeholder="votre login"
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
            className="w-full bg-primary hover:bg-primary-600 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg poppins"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion...
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>    
      </div>
    </div>
  );
}
