"use client";

import { authService } from '@/app/service';
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User } from '../../types';
import { PlanningOption } from '@/app/login/PlanningSelection';
import { axiosAgent } from '@/app/service/axios.service';



interface AuthContextType {
  user: User | undefined;
  UserPlanning:PlanningOption[];
  setUser: React.Dispatch<React.SetStateAction<User | undefined>>;
  currentPlanningId: number;
  setCurrentPlanningId: React.Dispatch<React.SetStateAction<number>>;  permissions: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permissionId: number) => boolean; // La fonction magique pour ton UI
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
        setCurrentPlanningId(id);
      }else {
        console.error('Aucun planning valide trouvé pour l\'utilisateur.');
        return { success: false, message: 'Aucun planning valide trouvé pour l\'utilisateur.' };
      }

      setUserPlanning(response.user?.planning || []);
      setUser(response.user);
      setPermissions(response.permissions || 0);
      return { success: true };
    } 
    return { success: false, message: response?.message || 'Identifiants incorrects' };
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setUser(undefined);
    setPermissions(0);
  };

  // Fonction d'aide pour vérifier un droit partout dans l'application
  const hasPermission = (permissionId: number): boolean => {
    return Number(permissions) === Number(permissionId);
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authService.me();
        
        const id = response.planning[0]?.IdPlanning || -1;

        if (id >= 0) {
          axiosAgent.defaults.headers.common['X-Planning-Id'] = id;
          setCurrentPlanningId(id); 
        }
        setUserPlanning(response.user?.planning || []);
        setUser(response.user);
        setPermissions(response.permissions || 0);

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
        setCurrentPlanningId 
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