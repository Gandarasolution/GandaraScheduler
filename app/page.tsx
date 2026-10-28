"use client";
import Calendrier from './calendrier/pages/index';
import LoginPage from './login/page'; 
import React, { useCallback, useEffect, useState } from 'react';

import { ThemeType, useTheme } from './calendrier/utils/themeManager';
import { ErrorBoundary } from "./calendrier/components/ui/ErrorBoundary";
import { useAuth } from './calendrier/hooks/utils/AuthContext';
import SelectionScreen from './login/SelectionScreen';
import { axiosAgent } from '@/app/service/axios.service';
import { DayTypesProvider } from './calendrier/hooks/data/dayTypesContext';

export default function Home() {
  const {
    user, login, isAuthenticated, setUser, 
    UserPlanning, currentPlanningId, setCurrentPlanningId,
    currentVueId, setCurrentVueId
  } = useAuth();

  const { setTheme } = useTheme(user);
  
  const [isMobile, setIsMobile] = useState(false);


  // Fonction pour changer le thème
  const handleThemeChange = useCallback((newTheme: ThemeType) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
      setTheme('dark');
      return;
    }
    
    const finalTheme = newTheme === 'dark' ? 'light' : newTheme;
    
    setUser(prevUser => prevUser ? ({
      ...prevUser,
      theme: finalTheme
    }) : prevUser);
    
    setTheme(finalTheme);
  }, [setTheme, setUser]);
  
  // Synchroniser le thème au chargement
  useEffect(() => {
    if (!user) return;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      setTheme('dark');
    } else {
      const userTheme = user.theme as ThemeType;
      const finalTheme = userTheme === 'dark' ? 'light' : userTheme;
      setTheme(finalTheme);
    }
  }, [user, setTheme]);

  // --- Detection Mobile ---
  useEffect(() => {
    const handleResize = () => {
      const isTrue = window.innerWidth < 640;
      setIsMobile(isTrue);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // ==============================================================
  // LOGIQUE DU WORKFLOW : APPEL API POUR LES VUES
  // ==============================================================
  useEffect(() => {
    if (currentPlanningId !== -1 && currentVueId === null) {
      setCurrentVueId(0);
      axiosAgent.defaults.headers.common['X-PlanningVue-Id'] = null;
    }
  }, [currentPlanningId, currentVueId, setCurrentVueId]);


  // ==============================================================
  // RENDU DU WORKFLOW (Étape par étape)
  // ==============================================================
  
  // ÉTAPE 0 : Non connecté
  if (!isAuthenticated || !user) return <LoginPage login={login} />;

  // ÉTAPE 1 : Choix du Planning (S'il y en a plusieurs)
  if (UserPlanning.length > 1 && currentPlanningId === -1) {
    return (
      <SelectionScreen 
        title="Espaces de travail"
        subtitle="Sélectionnez le planning auquel vous souhaitez accéder"
        options={UserPlanning.map(p => ({ id: p.IdPlanning, name: p.NomPlanning }))}
        onSelect={(id) => setCurrentPlanningId(id)} 
      />
    );
  }

  // ÉTAPE 2 : Initialisation du calendrier
  if (currentPlanningId !== -1 && currentVueId === null) {
    return (
      <SelectionScreen
        title="Chargement..."
        subtitle="Ouverture du planning"
        options={[]}
        onSelect={() => {}}
        isLoading={true}
      />
    );
  }

  // ÉTAPE 3 : Affichage du Calendrier
  if (currentPlanningId !== -1 && currentVueId !== null) {
    return (
      <ErrorBoundary
        maxRetries={3}
        retryDelay={2000}
        onError={(error, errorInfo) => {
          console.error('[Error Boundary]', error, errorInfo);
        }}
      >
        <DayTypesProvider>
          <Calendrier isMobile={isMobile} />
        </DayTypesProvider>
      </ErrorBoundary>
    );
  }
}