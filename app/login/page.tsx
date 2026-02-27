"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/app/calendrier/types';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'admin' as UserRole
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulation de connexion
    setTimeout(() => {
      const user = {
        id: 1,
        name: formData.email.split('@')[0] || 'Utilisateur',
        email: formData.email,
        role: formData.role,
        theme: 'light',
        image: 'https://i.pravatar.cc/40?img=1'
      };

      // Sauvegarder dans le localStorage
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');

      setLoading(false);
      router.push('/');
    }, 800);
  };

  const quickLogin = (role: UserRole, email: string) => {
    setFormData({ ...formData, email, role });
    setTimeout(() => {
      const user = {
        id: 1,
        name: email.split('@')[0],
        email,
        role,
        theme: 'light',
        image: 'https://i.pravatar.cc/40?img=1'
      };

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
      router.push('/');
    }, 500);
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
            <label htmlFor="email" className="block text-sm font-medium text-primary mb-2 poppins">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              placeholder="votre.email@exemple.com"
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

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-primary mb-2 poppins">
              Rôle
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              className="w-full px-4 py-3 border border-default rounded-lg focus:outline-none focus:ring-2 ring-color focus:border-primary transition-all cursor-pointer poppins"
            >
              <option value="admin">👑 Administrateur - Tous les droits</option>
              <option value="manager">📊 Manager - Gestion d'équipe et événements</option>
              <option value="user">👤 Utilisateur - Édition de son calendrier uniquement</option>
              <option value="viewer">👁️ Visiteur - Lecture seule</option>
            </select>
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

        {/* Séparateur */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-light"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-secondary poppins">Accès rapide démo</span>
          </div>
        </div>

        {/* Boutons d'accès rapide */}
        <div className="space-y-2">
          <button
            onClick={() => quickLogin('admin', 'admin@gandara.com')}
            className="w-full flex items-center justify-between px-4 py-3 bg-primary-50 hover:bg-primary-100 border border-primary rounded-lg transition-all text-primary font-medium poppins"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">👑</span>
              <span>Admin</span>
            </span>
            <span className="text-xs opacity-75">Tous les droits</span>
          </button>
          
          <button
            onClick={() => quickLogin('manager', 'manager@gandara.com')}
            className="w-full flex items-center justify-between px-4 py-3 bg-info-light hover:bg-blue-100 border border-info rounded-lg transition-all text-info font-medium poppins"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>Manager</span>
            </span>
            <span className="text-xs opacity-75">Gestion d'équipe et événements</span>
          </button>
          
          <button
            onClick={() => quickLogin('user', 'user@gandara.com')}
            className="w-full flex items-center justify-between px-4 py-3 bg-secondary hover:bg-tertiary border border-default rounded-lg transition-all text-primary font-medium poppins"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">👤</span>
              <span>Utilisateur</span>
            </span>
            <span className="text-xs opacity-75">Édition de son calendrier</span>
          </button>
          
          <button
            onClick={() => quickLogin('viewer', 'viewer@gandara.com')}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-all text-gray-700 font-medium poppins"
          >
            <span className="flex items-center gap-2">
              <span className="text-lg">👁️</span>
              <span>Visiteur</span>
            </span>
            <span className="text-xs opacity-75">Lecture seule</span>
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <p className="text-xs text-primary text-center poppins">
            💡 <strong>Mode démo</strong> - Aucune vérification réelle. Cliquez sur un bouton d'accès rapide ou remplissez le formulaire.
          </p>
        </div>
      </div>
    </div>
  );
}
