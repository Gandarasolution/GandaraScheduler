"use client";
import Calendrier from './calendrier/pages/index';
import LoginPage from './login/page'; 
import React, { useCallback, useEffect, useState } from 'react';

import { ThemeType, useTheme } from './calendrier/utils/themeManager';
import { ErrorBoundary } from "./calendrier/components/ui/ErrorBoundary";
import { useAuth } from './calendrier/hooks/utils/AuthContext';
import SelectionScreen from './login/SelectionScreen';
import { axiosAgent } from '@/app/service/axios.service';
import { calendarConfigService } from './service';

export default function Home() {
  const {
    user, login, isAuthenticated, setUser, 
    UserPlanning, currentPlanningId, setCurrentPlanningId,
    currentVueId, setCurrentVueId, setLastVueForUser
  } = useAuth();

  const { setTheme } = useTheme(user);
  
  // Nouveaux états pour la gestion de l'API des Vues
  const [availableVues, setAvailableVues] = useState<any[] | null>(null);
  const [isLoadingVues, setIsLoadingVues] = useState(false);
  const [vueError, setVueError] = useState<string | null>(null);

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


  // ==============================================================
  // LOGIQUE DU WORKFLOW : APPEL API POUR LES VUES
  // ==============================================================
  useEffect(() => {
    // Dès qu'on a un Planning mais pas encore de Vue, on déclenche l'API
    if (currentPlanningId !== -1 && currentVueId === null) {
      const fetchVues = async () => {
        setIsLoadingVues(true);
        setVueError(null);
        
        try {
          // L'en-tête X-Planning-Id est déjà défini par AuthContext, mais on sécurise
          axiosAgent.defaults.headers.common['X-Planning-Id'] = currentPlanningId;
          
          const response = await calendarConfigService.getLastVueForUser();
          
          console.log('Réponse de l\'API getLastVueForUser :', response);
          if (response.error === 0 && response.data) {
            const vuesData = response.data;
            // Ta route peut renvoyer un objet unique (préférence) ou un tableau de vues
            const vues = Array.isArray(vuesData) ? vuesData : [vuesData];
            
            if (vues.length === 0) {
              setVueError("Aucune vue n'est configurée ou disponible pour ce planning.");
            } else if (vues.length === 1) {
              // ⚡ MAGIC : S'il n'y a qu'une seule vue, on la sélectionne automatiquement !
              setCurrentVueId(vues[0].IdPlanningVue);
              axiosAgent.defaults.headers.common['X-PlanningVue-Id'] = vues[0].IdPlanningVue;
            } else {
              // Sinon, on les met en mémoire pour afficher l'écran de sélection
              setAvailableVues(vues);
            }
          } else {
            setVueError(response?.message || "Erreur lors de la récupération de la vue.");
          }
        } catch (error: any) {
          setVueError(error.response?.data?.message || "Impossible de joindre le serveur pour récupérer vos vues.");
        } finally {
          setIsLoadingVues(false);
        }
      };

      fetchVues();
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

  // ÉTAPE 2 : Choix de la Vue (ou Chargement/Erreur)
  if (currentPlanningId !== -1 && currentVueId === null) {
    // 2.A - L'appel API est en cours
    if (isLoadingVues) {
      return (
        <SelectionScreen 
          title="Chargement..."
          subtitle="Récupération de vos préférences d'affichage"
          options={[]}
          onSelect={() => {}}
          isLoading={true}
        />
      );
    }

    // 2.B - Erreur (ex: Utilisateur non autorisé ou aucune vue)
    if (vueError || (availableVues && availableVues.length === 0)) {
      return (
        <SelectionScreen 
          title="Erreur d'accès"
          subtitle="Impossible de configurer l'espace"
          options={[]}
          onSelect={() => {}}
          error={vueError || "Aucune configuration disponible."}
          onBack={UserPlanning.length > 1 ? () => {
            setCurrentPlanningId(-1);
            setVueError(null);
            setAvailableVues(null);
          } : undefined}
        />
      );
    }

    // 2.C - S'il y a plusieurs vues, on demande à l'utilisateur
    if (availableVues && availableVues.length > 1) {
      return (
        <SelectionScreen 
          title="Choix de la configuration"
          subtitle="Sélectionnez la vue que vous souhaitez afficher"
          options={availableVues.map(v => ({ 
            id: v.IdPlanningVue, 
            name: v.LibellePlanningVue,
            description: v.DescriptionPlanningVue 
          }))}
          onSelect={(id) => setLastVueForUser(id)}
          onBack={UserPlanning.length > 1 ? () => {
            setCurrentPlanningId(-1);
            setAvailableVues(null);
          } : undefined}
        />
      );
    }
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
        {/* Tu pourras passer initialVueId={currentVueId} à <Calendrier /> s'il a besoin de le savoir au démarrage */}
        <Calendrier onThemeChange={handleThemeChange} />
      </ErrorBoundary>
    );
  }
}