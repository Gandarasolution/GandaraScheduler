"use client";

import { authService, calendarConfigService } from '@/app/service';
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User } from '../../types';
import { axiosAgent } from '@/app/service/axios.service';


export type PlanningOption = {
  IdPlanning: number;
  NomPlanning: string;
  IdPlanningImage: number | null;
};


interface AuthContextType {
  user: User | undefined;
  UserPlanning:PlanningOption[];
  setUser: React.Dispatch<React.SetStateAction<User | undefined>>;
  currentPlanningId: number;
  setCurrentPlanningId: React.Dispatch<React.SetStateAction<number>>;  permissions: number;
  currentVueId: number | null;
  setCurrentVueId: React.Dispatch<React.SetStateAction<number | null>>;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permissionId: number) => boolean; // La fonction magique pour ton UI
  setLastVueForUser: (idVue: number) => void; // Nouvelle fonction pour définir la dernière vue
}

// 2. Création du contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Le composant Provider qui va envelopper l'application
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User>();
  const [UserPlanning, setUserPlanning] = useState<PlanningOption[]>([]);
  const [permissions, setPermissions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user;  
  const [currentPlanningId, setCurrentPlanningId] = useState<number>(-1);
  const [currentVueId, setCurrentVueId] = useState<number | null>(null);

  

  const login = async (login: string, password: string): Promise<{ success: boolean; message?: string }> => {

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
        console.error('Aucun planning valide trouvé pour l\'utilisateur.');
        return { success: false, message: 'Aucun planning valide trouvé pour l\'utilisateur.' };
      }
      setCurrentVueId(null);
      setUserPlanning(response.planning || []);
      setUser(response.user);
      setPermissions(response.permissions || 0);
      localStorage.setItem('isAuthenticated', 'true'); // Sauvegarde du token dans le localStorage
      return { success: true };
    } 

    return { success: false, message: response?.data || response?.message || 'Identifiants incorrects' };
  };

  const logout = () => {
    localStorage.removeItem('isAuthenticated');
    setUser(undefined);
    setPermissions(0);
    setUserPlanning([]);
    setCurrentPlanningId(-1);
    setCurrentVueId(null);
    axiosAgent.defaults.headers.common['X-Planning-Id'] = '';
  };

  // Fonction d'aide pour vérifier un droit partout dans l'application
  const hasPermission = (permissionId: number): boolean => {
    return Number(permissions) === Number(permissionId);
  };

  const setLastVueForUser = async (idVue: number) => {
    setCurrentVueId(idVue);
    calendarConfigService.setLastVueForUser(idVue)
      .then(response => {
        if (response.error === 0) {
          console.log(`✅ Vue ${idVue} enregistrée comme dernière vue pour l'utilisateur.`);
          axiosAgent.defaults.headers.common['X-PlanningVue-Id'] = idVue;
        } else {
          console.error(`❌ Erreur lors de l'enregistrement de la dernière vue :`, response.message);
        }
      })
      .catch(error => {
        console.error(`❌ Erreur lors de l'appel à l'API pour enregistrer la dernière vue :`, error);
      });
  };

  useEffect(() => {
    const checkAuth = async () => {
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
        localStorage.setItem('isAuthenticated', 'true'); // Sauvegarde du token dans le localStorage
        console.log("✅ AuthProvider: Utilisateur connecté via cookie", response.user);
      } catch (error) {
        console.log("❌ AuthProvider: Aucun cookie valide trouvé (401). L'utilisateur doit se connecter.", error);
        setUser(undefined);
        // Si on a une erreur 401, c'est qu'il n'y a pas de cookie valide
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);


  return (
    <AuthContext.Provider value={{ 
        user, 
        permissions, 
        isAuthenticated, 
        isLoading, 
        login, 
        logout, 
        hasPermission, 
        setUser, 
        UserPlanning, 
        currentPlanningId, 
        setCurrentPlanningId,
        currentVueId,
        setCurrentVueId,
        setLastVueForUser
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

// 4. Custom Hook pour utiliser le contexte facilement
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};


export const useCurrentUser = (): User => {
  const { user } = useAuth();
  
  if (!user) {
    throw new Error("useCurrentUser a été appelé mais l'utilisateur n'est pas connecté.");
  }
  
  return user;
};