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
import { CalendarViewProvider } from './calendrier/hooks/calendar/CalendarViewContext';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

const getDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop';

  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
  const smallSide = Math.min(window.innerWidth, window.innerHeight);

  if (isTouchDevice && smallSide < 640) return 'mobile';
  if (isTouchDevice && smallSide < 1200) return 'tablet';
  return 'desktop';
};

export default function Home() {
  const {
    user, login, isAuthenticated, setUser, 
    UserPlanning, currentPlanningId, setCurrentPlanningId,
    currentVueId, setCurrentVueId,
    hasPermission
  } = useAuth();

  const { setTheme } = useTheme(user);

  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType);

  const isMobile = deviceType === 'mobile';
  const isTablet = deviceType === 'tablet';

  console.log('Device Type:', deviceType, 'isMobile:', isMobile, 'isTablet:', isTablet);
  console.log(isMobile || (isTablet && !hasPermission(229)))

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

  // --- Détection Smartphone / Tablette / Desktop ---
  useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
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
  const renderStep = () => {
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
          <CalendarViewProvider idPlanning={currentPlanningId} user={user} isMobile={isMobile}>
            <DayTypesProvider>
              <Calendrier isMobile={isMobile} isTablet={isTablet} />
            </DayTypesProvider>
          </CalendarViewProvider>
        </ErrorBoundary>
      );
    }

    return null;
  };

  return (
    <>
      {/* Overlay de blocage en mode paysage (uniquement sur smartphone, pas sur tablette) */}
      {(isMobile || (isTablet && !hasPermission(229))) && (
        <div
          className="portrait-only-overlay fixed inset-0 z-[10000] flex-col items-center justify-center p-6 text-center select-none"
          style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-4 animate-bounce"
            style={{ color: 'var(--color-primary-500)' }}
          >
            <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
            <path d="M12 18h.01" />
          </svg>
          <h2 className="text-lg font-bold mb-2">Mode portrait uniquement</h2>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Veuillez pivoter votre téléphone à la verticale pour utiliser l'application.
          </p>
        </div>
      )}

      {renderStep()}
    </>
  );
}