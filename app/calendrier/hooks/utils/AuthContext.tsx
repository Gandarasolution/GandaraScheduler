"use client";

import { authService, calendarConfigService } from '@/app/service';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../../types';
import Loader from '../../components/ui/Loader';
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
  logout: (reason?: 'inactive') => void;
  hasPermission: (permissionId: number) => boolean;
  setLastVueForUser: (idVue: number) => void;
  checkEnvironment: () => Promise<{ error?: string; success: boolean }>;
  resolveCompanyCode: (codeEntreprise: string) => Promise<{ error?: string; success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STATE_KEY = 'isAuthenticated';
const SESSION_EXPIRED_KEY = 'session_expired';
const PAGE_CLOSED_KEY = 'page_closed';
const LOGIN_COOKIE_NAME = 'is_logged_in';
const SESSION_EXPIRED_MESSAGE = 'Vous avez été déconnecté à cause de votre inactivité.';

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
    //console.log('login response:', response);
        
    if (response?.success && response.user) {
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
      localStorage.setItem(AUTH_STATE_KEY, 'true');
      localStorage.removeItem(SESSION_EXPIRED_KEY);
      return { success: true };
    } 

    return { success: false, message: response?.data || response?.message || 'Identifiants incorrects' };
  };

  const logout = useCallback((reason?: 'inactive') => {
    localStorage.removeItem(AUTH_STATE_KEY);
    if (reason === 'inactive') {
      localStorage.setItem(SESSION_EXPIRED_KEY, SESSION_EXPIRED_MESSAGE);
    }

    Cookies.remove(LOGIN_COOKIE_NAME, {
      path: '/',
    });

    // On ne supprime pas forcément le cookie 'client_api_url' ici, 
    // pour que le client reste sur son environnement s'il veut juste se reconnecter.
    setUser(undefined);
    setPermissions(0);
    setUserPlanning([]);
    setCurrentPlanningId(-1);
    setCurrentVueId(null);
    axiosAgent.defaults.headers.common['X-Planning-Id'] = '';
  }, []);

  const hasPermission = useCallback((permissionId: number) => {
    return Number(permissions) === Number(permissionId);
  }, [permissions]);

  const setLastVueForUser = async (idVue: number) => {
    setCurrentVueId(idVue);
    calendarConfigService.setLastVueForUser(idVue)
      .then(response => {
        if (response.success) {
          axiosAgent.defaults.headers.common['X-PlanningVue-Id'] = idVue;
        }
      })
      .catch(error => {
        console.error(`❌ Erreur lors de l'appel à l'API pour enregistrer la dernière vue :`, error);
      });
  };


  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      // Si pas de session en local, on arrête TOUT de suite
      if (localStorage.getItem(AUTH_STATE_KEY) !== 'true') {
        if (isMounted) {
          setUser(undefined);
          setIsLoading(false);
        }
        return;
      }

      if (Cookies.get(LOGIN_COOKIE_NAME) !== 'true') {
        const pageWasClosed = localStorage.getItem(PAGE_CLOSED_KEY) === 'true';
        localStorage.removeItem(PAGE_CLOSED_KEY);
        logout(pageWasClosed ? undefined : 'inactive');
        if (isMounted) setIsLoading(false);
        return;
      }

      const clientApiUrl = Cookies.get('client_api_url');
      if (!clientApiUrl) {
        if (isMounted) {
          setUser(undefined);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await authService.me();
        if (!isMounted) return;

        const id = response.planning[0]?.IdPlanning || -1;
        if (id >= 0) {
          axiosAgent.defaults.headers.common['X-Planning-Id'] = id;
          setCurrentPlanningId(response.planning.length === 1 ? id : -1);
        }
        setUserPlanning(response.planning || []);
        setUser(response.user);
        setPermissions(response.permissions || 0);
        setCurrentVueId(null);
        localStorage.setItem(AUTH_STATE_KEY, 'true');
      } catch (error) {
        if (isMounted) {
          setUser(undefined);
          localStorage.removeItem(AUTH_STATE_KEY);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    const check = async () => {
      try {
        const result = await checkEnvironment();
        if (!isMounted) return;

        if (result.success) {
          const host = window.location.host;
          const resolveResult = await resolveCompanyCode(host);
          
          if (!isMounted) return;

          if (resolveResult.success) {
            await checkAuth();
          } else {
            setIsLoading(false);
          }
        } else {
          setIsLoading(false);
        }
      } catch (e) {
        if (isMounted) setIsLoading(false);
      }
    };

    check();


    const checkLoginCookie = () => {
      if (
        localStorage.getItem(AUTH_STATE_KEY) === 'true' &&
        Cookies.get(LOGIN_COOKIE_NAME) !== 'true'
      ) {
        logout('inactive');
      }
    };

    const markPageClosed = () => {
      localStorage.setItem(PAGE_CLOSED_KEY, 'true');
    };

    window.addEventListener('pagehide', markPageClosed);

    const intervalId = window.setInterval(checkLoginCookie, 1000);
    return () => {
      isMounted = false;
      window.removeEventListener('pagehide', markPageClosed);
      window.clearInterval(intervalId);
    };
  }, []);

  const checkEnvironment = async () : Promise<{ success: boolean; error?: string}> => {
    const host = window.location.host;


    const isCanonical =
      await authService.SchedulerIsURICannonical('gandara-scheduler.vercel.app');

    if (isCanonical) {
      
      return { success: true };

    } else {
      return { success: false };
    }
  };

  const resolveCompanyCode = async (codeEntreprise: string): Promise<{ error?: string; success: boolean }> => {
    
    try {
      const response = await authService.SchedulerGetAPI('gandara-scheduler.vercel.app');

      if (!response) {
        return { error: "Impossible de récupérer les informations de l'entreprise. Veuillez vérifier l'adresse ou contacter le support.", success: false };
      }

      const resolvedEnvironment = await authService.resolveApiEnvironment(response);

      if (!resolvedEnvironment) {
        return { error: "Aucune URL d'API accessible. Vérifiez le réseau ou votre environnement.", success: false };
      }

      Cookies.set('client_api_url', resolvedEnvironment.apiUrl, { expires: 1 / 24 });

      if (resolvedEnvironment.mercureUrl) {
        Cookies.set(
          'client_mercure_url',
          resolvedEnvironment.mercureUrl,

          { expires: 1 / 24 }
        );
      } else {
        Cookies.remove('client_mercure_url');
      }

      if (resolvedEnvironment.logoClient) {
        localStorage.setItem(
          'client_logo_url',
          resolvedEnvironment.logoClient
        );
      } else {
        localStorage.removeItem('client_logo_url');
      }

      

      return { success: true };
    }catch (error) {
      console.error("Erreur lors de la résolution du code entreprise :", error);
      return { error: "Erreur lors de la résolution du code entreprise. Veuillez vérifier l'adresse ou contacter le support.", success: false };
    }
  }


  return (
    <AuthContext.Provider value={{ 
        user, permissions, isAuthenticated, isLoading, login, logout, 
        hasPermission, setUser, UserPlanning, currentPlanningId, 
        setCurrentPlanningId, currentVueId, setCurrentVueId, setLastVueForUser, checkEnvironment, resolveCompanyCode
    }}>
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-ultra-light via-white to-primary-lighter">
          <Loader size="lg" />
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