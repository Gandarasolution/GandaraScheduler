"use client";
import Calendrier from './calendrier/pages/index';
import LoginPage from './login/page'; 
import React, { useCallback, useEffect, useState } from 'react';

import { ThemeType, useTheme } from './calendrier/utils/themeManager';
import { ErrorBoundary } from "./calendrier/components/ui/ErrorBoundary";
import { useAuth } from './calendrier/hooks/utils/AuthContext';


export default function Home() {

  const {user, login, isLoading, isAuthenticated, setUser} = useAuth();

  const { setTheme } = useTheme(user);
  
  // Fonction pour changer le thème et mettre à jour l'objet user
  // RÈGLE: Si navigateur dark → ne pas sauvegarder les changements (dark forcé)
  const handleThemeChange = useCallback((newTheme: ThemeType) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
      // Navigateur en dark → forcer dark, ignorer la demande de changement
      setTheme('dark');
      return;
    }
    
    // Navigateur en light → bloquer le thème dark, autoriser les autres
    const finalTheme = newTheme === 'dark' ? 'light' : newTheme;
    
    // 1. Mettre à jour l'objet user
    setUser(prevUser => prevUser ? ({
      ...prevUser,
      theme: finalTheme
    }) : prevUser);
    
    // 2. Appliquer le thème visuellement
    setTheme(finalTheme);
    
    // 3. TODO: Sauvegarder sur le backend
    // await updateUserTheme(user.id, finalTheme);
  }, [setTheme]);
  
  // Synchroniser le thème de l'utilisateur avec localStorage au chargement
  // Cela garantit que le script inline dans layout.tsx aura la bonne valeur au prochain chargement
  useEffect(() => {
    if (!user) return;
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
      // Navigateur en dark → forcer dark
      setTheme('dark');
    } else {
      // Navigateur en light → appliquer le thème de l'utilisateur (sauf dark)
      const userTheme = user.theme as ThemeType;
      const finalTheme = userTheme === 'dark' ? 'light' : userTheme;
      
      // Appliquer le thème (sauvegarde automatiquement dans localStorage)
      setTheme(finalTheme);
    }
  }, [user, setTheme]);


  if (!isAuthenticated) return <LoginPage login={login} />;

  return (
     <ErrorBoundary
        maxRetries={3}
        retryDelay={2000}
        onError={(error, errorInfo) => {
          // Log l'erreur (peut être envoyé à un service de monitoring)
          console.error('[Error Boundary]', error, errorInfo);
        }}
      >
        <Calendrier onThemeChange={handleThemeChange} />
      </ErrorBoundary>
  );
}
