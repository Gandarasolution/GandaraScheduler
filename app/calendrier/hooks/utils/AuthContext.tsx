"use client";

import { authService } from '@/app/service';
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User } from '../../types';



interface AuthContextType {
  user: User | undefined;
  setUser: React.Dispatch<React.SetStateAction<User | undefined>>;
  permissions: number;
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
  const [permissions, setPermissions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = useRef(false);

  

  const login = async (login: string, password: string): Promise<{ success: boolean; message?: string }> => {

    const response = await authService.login({
        login: login,
        password: password,
    });
    console.log(response);
        
    if (response?.error === 0 && response.user) {
        localStorage.setItem('jwt_token', response.token);

        setUser(response.user);
        setPermissions(response.permissions || 0);
        isAuthenticated.current = true;
        return { success: true };
    } 
    return { success: false, message: response?.message || 'Identifiants incorrects' };
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setUser(undefined);
    setPermissions(0);
    isAuthenticated.current = false;
  };

  // Fonction d'aide pour vérifier un droit partout dans l'application
  const hasPermission = (permissionId: number): boolean => {
    return Number(permissions) === Number(permissionId);
  };

  // Au démarrage, on vérifie si un token valide existe déjà
  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      console.log("Token trouvé, vérification en cours...");
      setIsLoading(true);
      authService.me().then(response => {
        if (response?.error === 0 && response.user) {
            setUser(response.user);
            setPermissions(response.permissions || 0);
            isAuthenticated.current = true;
        }
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, permissions, isAuthenticated: isAuthenticated.current, isLoading, login, logout, hasPermission, setUser }}>
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