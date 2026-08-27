"use client";

import { authService, calendarConfigService } from '@/app/service';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../../types';
import { axiosAgent } from '@/app/service/axios.service';
import Cookies from 'js-cookie';

export type PlanningOption = {
  IdPlanning: number;
  NomPlanning: string;
  IdPlanningImage: number | null;
};

interface AuthContextType {
  user: User | undefined;
  UserPlanning: PlanningOption[];
  setUser: React.Dispatch<React.SetStateAction<User | undefined>>;
  currentPlanningId: number;
  setCurrentPlanningId: React.Dispatch<React.SetStateAction<number>>;  
  permissions: number;
  currentVueId: number | null;
  setCurrentVueId: React.Dispatch<React.SetStateAction<number | null>>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permissionId: number) => boolean;
  setLastVueForUser: (idVue: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>();
  const [UserPlanning, setUserPlanning] = useState<PlanningOption[]>([]);
  const [permissions, setPermissions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;  
  const [currentPlanningId, setCurrentPlanningId] = useState<number>(-1);
  const [currentVueId, setCurrentVueId] = useState<number | null>(null);

  const login = async (login: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // Note : À ce stade, le composant LoginPage aura DÉJÀ renseigné le cookie 'client_api_url' 
    // et mis à jour l'axiosAgent, donc l'appel authService.login partira vers le bon serveur !
    const response = await authService.login({
        login: login,
        password: password,
    });
    console.log('login response:', response);
        
    if (response?.error === 0 && response.user) {
      const id = response.planning[0]?.IdPlanning || -1;
      if (id >= 0) {
        axiosAgent.defaults.headers.common['X-Planning-Id'] = id;

        if(response.planning.length === 1) {
          setCurrentPlanningId(id); 
        }else {
          setCurrentPlanningId(-1); 
        }
      }else {
        return { success: false, message: 'Aucun planning valide trouvé pour l\'utilisateur.' };
      }
      setCurrentVueId(null);
      setUserPlanning(response.planning || []);
      setUser(response.user);
      setPermissions(response.permissions || 0);
      localStorage.setItem('isAuthenticated', 'true');
      return { success: true };
    } 

    return { success: false, message: response?.data || response?.message || 'Identifiants incorrects' };
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    // On ne supprime pas forcément le cookie 'client_api_url' ici, 
    // pour que le client reste sur son environnement s'il veut juste se reconnecter.
    setUser(undefined);
    setPermissions(0);
    setUserPlanning([]);
    setCurrentPlanningId(-1);
    setCurrentVueId(null);
    axiosAgent.defaults.headers.common['X-Planning-Id'] = '';
  };

  const hasPermission = useCallback((permissionId: number) => {
    return Number(permissions) === Number(permissionId);
  }, [permissions]);

  const setLastVueForUser = async (idVue: number) => {
    setCurrentVueId(idVue);
    calendarConfigService.setLastVueForUser(idVue)
      .then(response => {
        if (response.error === 0) {
          axiosAgent.defaults.headers.common['X-PlanningVue-Id'] = idVue;
        }
      })
      .catch(error => {
        console.error(`❌ Erreur lors de l'appel à l'API pour enregistrer la dernière vue :`, error);
      });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const clientApiUrl = Cookies.get('client_api_url');
      
      if (!clientApiUrl) {
        console.log("⚠️ Aucune URL d'API connue. Redirection vers le LoginPage (Résolution requise).");
        setIsLoading(false);
        setUser(undefined);
        return; // On arrête tout, l'utilisateur n'est pas authentifié.
      }

      if (localStorage.getItem('isAuthenticated') !== 'true') {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authService.me();
        const id = response.planning[0]?.IdPlanning || -1;

        if (id >= 0) {
          axiosAgent.defaults.headers.common['X-Planning-Id'] = id;
          if(response.planning.length === 1) {
            setCurrentPlanningId(id); 
          }else {
            setCurrentPlanningId(-1); 
          }
        }
        setUserPlanning(response.planning || []);
        setUser(response.user);
        setPermissions(response.permissions || 0);
        setCurrentVueId(null);
        localStorage.setItem('isAuthenticated', 'true');
      } catch (error) {
        setUser(undefined);
        localStorage.removeItem('isAuthenticated'); // Sécurité en cas de token expiré
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ 
        user, permissions, isAuthenticated, isLoading, login, logout, 
        hasPermission, setUser, UserPlanning, currentPlanningId, 
        setCurrentPlanningId, currentVueId, setCurrentVueId, setLastVueForUser
    }}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-ultra-light via-white to-primary-lighter">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

export const useCurrentUser = (): User => {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser a été appelé mais l'utilisateur n'est pas connecté.");
  return user;
};