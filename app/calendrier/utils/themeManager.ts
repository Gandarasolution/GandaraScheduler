/**
 * @fileoverview Gestionnaire de Thèmes - Changement dynamique de thème
 * 
 * Ce module permet de:
 * - Détecter automatiquement le thème du navigateur (clair/sombre)
 * - Synchroniser avec les changements de préférence système
 * - Changer le thème de l'application (clair/sombre/client)
 * - Appliquer les thèmes personnalisés par client
 * - Utiliser le thème de l'utilisateur (user.theme) comme source de vérité
 * 
 * ORDRE DE PRIORITÉ :
 * 1. NAVIGATEUR (prefers-color-scheme) - TOUJOURS EN PREMIER
 *    - Si dark → forcer dark (fin, pas de choix utilisateur)
 *    - Si light → continuer à l'étape 2
 * 
 * 2. USER.THEME (si navigateur light uniquement)
 *    - Utiliser user.theme si valide ET différent de 'dark'
 *    - Si user.theme est 'dark' → ignorer et continuer à l'étape 3
 * 
 * 3. LOCALSTORAGE (fallback si user.theme absent/invalide)
 *    - Utiliser localStorage si valide ET différent de 'dark'
 * 
 * 4. LIGHT PAR DÉFAUT (si rien trouvé)
 * 
 * @author Gandara Solutions
 * @version 2.3.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type ThemeType = 
  | 'light'           // Thème clair par défaut
  | 'dark'            // Thème sombre
  | 'client-blue'     // Thème personnalisé bleu
  | 'client-purple'   // Thème personnalisé violet
  | 'client-orange';  // Thème personnalisé orange

export interface ThemeConfig {
  name: string;
  displayName: string;
  description: string;
  preview: {
    primary: string;
    background: string;
    text: string;
  };
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STORAGE_KEY = 'gandara-theme-preference';

export const AVAILABLE_THEMES: Record<ThemeType, ThemeConfig> = {
  light: {
    name: 'light',
    displayName: 'Clair',
    description: 'Thème clair par défaut de Gandara Scheduler',
    preview: {
      primary: 'bg-primary',
      background: '#ffffff',
      text: '#111827',
    },
  },
  dark: {
    name: 'dark',
    displayName: 'Sombre',
    description: 'Thème sombre pour une utilisation de nuit',
    preview: {
      primary: '#00b597',
      background: '#18181b',
      text: '#fafafa',
    },
  },
  'client-blue': {
    name: 'client-blue',
    displayName: 'Bleu Entreprise',
    description: 'Thème bleu professionnel',
    preview: {
      primary: '#3b82f6',
      background: '#ffffff',
      text: '#111827',
    },
  },
  'client-purple': {
    name: 'client-purple',
    displayName: 'Violet Créatif',
    description: 'Thème violet moderne',
    preview: {
      primary: '#8b5cf6',
      background: '#ffffff',
      text: '#111827',
    },
  },
  'client-orange': {
    name: 'client-orange',
    displayName: 'Orange Dynamique',
    description: 'Thème orange énergique',
    preview: {
      primary: '#f97316',
      background: '#ffffff',
      text: '#111827',
    },
  },
};

// ============================================================================
// GESTIONNAIRE DE THÈME
// ============================================================================

class ThemeManager {
  private currentTheme: ThemeType = 'light';
  private systemThemeListener: MediaQueryList | null = null;
  private observers: Set<(theme: ThemeType) => void> = new Set();
  private user: User | undefined;

  constructor(user?: User) {
    this.user = user;
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialise le gestionnaire de thème
   * 
   * ORDRE DE PRIORITÉ :
   * 1. NAVIGATEUR (prefers-color-scheme) - Vérifié en premier
   * 2. USER.THEME - Si navigateur light
   * 3. LOCALSTORAGE - Fallback
   * 4. LIGHT - Par défaut
   * 
   * OPTIMISATION: Synchronise avec le thème déjà appliqué par le script inline (pas de re-render)
   */
  private initialize(): void {
    // PRIORITÉ 1 : Vérifier la config du navigateur EN PREMIER
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Lire le thème déjà appliqué au DOM par le script inline
    const currentDataTheme = document.documentElement.getAttribute('data-theme');
    
    if (prefersDark) {
      // Navigateur en dark → FORCER dark, ignorer toute autre logique
      this.currentTheme = 'dark';
      if (currentDataTheme !== 'dark') {
        this.applyThemeToDOM('dark');
      }
    } else {
      // Navigateur en light → Appliquer la logique user.theme / localStorage
      // PRIORITÉ 2, 3, 4 : user.theme > localStorage > 'light'
      const userPref = this.getUserPreference();
      const theme = (userPref && userPref !== 'dark') ? userPref : 'light';
      this.currentTheme = theme;
      
      // Vérifier que le DOM est cohérent avec la préférence
      const expectedDataTheme = theme === 'light' ? null : theme;
      if (currentDataTheme !== expectedDataTheme) {
        this.applyThemeToDOM(theme);
      }
    }

    // Écouter les changements du thème système
    this.setupSystemThemeListener();
  }

  /**
   * Configure l'écoute des changements du thème système
   * 
   * PRIORITÉ NAVIGATEUR : Quand le navigateur change de thème, on réapplique la hiérarchie complète
   * 1. Si changement vers dark → forcer dark
   * 2. Si changement vers light → appliquer logique (user.theme > localStorage > light)
   */
  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemThemeListener = mediaQuery;
    
    // Écouter les changements de préférence système
    const handler = (e: MediaQueryListEvent) => {
      // PRIORITÉ 1 : Vérifier le navigateur
      if (e.matches) {
        // Changement vers dark → forcer dark (ignorer user.theme)
        this.applyTheme('dark');
      } else {
        // Changement vers light → charger la logique user.theme / localStorage
        const userPref = this.getUserPreference();
        const theme = (userPref && userPref !== 'dark') ? userPref : 'light';
        this.applyTheme(theme);
      }
    };
    
    // Support pour les anciennes et nouvelles API
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback pour les anciens navigateurs
      mediaQuery.addListener(handler);
    }
  }

  /**
   * Récupère la préférence thème selon la hiérarchie
   * 
   * ORDRE (appelé UNIQUEMENT si navigateur en light) :
   * 1. user.theme - Source de vérité principale
   * 2. localStorage - Fallback pour persistance
   * 3. null - Aucune préférence (utilisera 'light' par défaut)
   * 
   * Note: Cette fonction n'est jamais appelée si navigateur en dark
   */
  private getUserPreference(): ThemeType | null {
    // Priorité 2 (après navigateur) : Thème de l'utilisateur
    if (this.user && this.user.theme) {
      const userTheme = this.user.theme as string;
      if (this.isValidTheme(userTheme)) {
        return userTheme as ThemeType;
      }
    }
    
    // Priorité 3 : LocalStorage (fallback)
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && this.isValidTheme(stored)) {
        return stored as ThemeType;
      }
    } catch (error) {
      console.warn('Impossible de lire la préférence de thème:', error);
    }
    
    // Priorité 4 : Aucune préférence (light par défaut)
    return null;
  }

  /**
   * Sauvegarde la préférence utilisateur dans localStorage
   */
  private saveUserPreference(theme: ThemeType): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Impossible de sauvegarder la préférence de thème:', error);
    }
  }

  /**
   * Vérifie si le thème est valide
   */
  private isValidTheme(theme: string): boolean {
    return theme in AVAILABLE_THEMES;
  }

  /**
   * Applique le thème système (clair ou sombre)
   */
  private applySystemTheme(isDark: boolean): void {
    const theme = isDark ? 'dark' : 'light';
    this.applyThemeToDOM(theme);
  }

  /**
   * Applique le thème au DOM
   */
  private applyThemeToDOM(theme: Exclude<ThemeType, 'auto'>): void {
    if (typeof window === 'undefined') return;

    // Retirer tous les attributs de thème existants
    document.documentElement.removeAttribute('data-theme');

    // Appliquer le nouveau thème si ce n'est pas 'light' (défaut)
    if (theme !== 'light') {
      document.documentElement.setAttribute('data-theme', theme);
    }

    // Notifier les observateurs
    this.notifyObservers(theme);
  }

  /**
   * Applique un thème spécifique
   * 
   * IMPORTANT : Vérifie toujours la config navigateur avant d'appliquer
   * - Si navigateur dark → ignore la demande et force dark
   * - Si navigateur light → applique et sauvegarde (sauf si dark demandé)
   */
  public applyTheme(theme: ThemeType): void {
    // Vérifier la config navigateur avant tout
    const prefersDark = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (prefersDark) {
      // Navigateur en dark → forcer dark, ignorer la demande
      this.currentTheme = 'dark';
      this.applyThemeToDOM('dark');
      return;
    }
    
    // Navigateur en light → appliquer le thème demandé (sauf dark)
    const finalTheme = theme === 'dark' ? 'light' : theme;
    this.currentTheme = finalTheme;
    this.applyThemeToDOM(finalTheme);
    
    // Sauvegarder dans localStorage pour persistance
    this.saveUserPreference(finalTheme);
  }

  /**
   * Récupère le thème actuel
   */
  public getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  /**
   * Récupère le thème effectif (résolution de 'auto')
   */
  public getEffectiveTheme(): Exclude<ThemeType, 'auto'> {
    return this.currentTheme;
  }

  /**
   * Ajoute un observateur pour les changements de thème
   */
  public subscribe(callback: (theme: ThemeType) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  /**
   * Notifie tous les observateurs
   */
  private notifyObservers(theme: ThemeType): void {
    this.observers.forEach(callback => callback(theme));
  }

  /**
   * Bascule entre clair et sombre
   */
  public toggleTheme(): void {
    const effectiveTheme = this.getEffectiveTheme();
    const newTheme = effectiveTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  /**
   * Récupère la configuration d'un thème
   */
  public getThemeConfig(theme: ThemeType): ThemeConfig {
    return AVAILABLE_THEMES[theme];
  }

  /**
   * Récupère tous les thèmes disponibles
   */
  public getAllThemes(): ThemeConfig[] {
    return Object.values(AVAILABLE_THEMES);
  }
}

// ============================================================================
// EXPORT DE L'INSTANCE SINGLETON
// ============================================================================
 

// ============================================================================
// HOOKS POUR REACT
// ============================================================================

import { useEffect, useState } from 'react';
import { User } from '../types';

/**
 * Hook React pour utiliser le thème actuel
 */
export function useTheme(user?: User) {
  const [themeManager] = useState(() => new ThemeManager(user));

  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window !== 'undefined') {
      return themeManager.getCurrentTheme();
    }
    return 'light';
  });

  useEffect(() => {
    // S'abonner aux changements de thème
    const unsubscribe = themeManager.subscribe((newTheme) => {
      setThemeState(newTheme);
    });

    return unsubscribe;
  }, [themeManager]);

  return {
    theme,
    effectiveTheme: themeManager.getEffectiveTheme(),
    setTheme: (newTheme: ThemeType) => themeManager.applyTheme(newTheme),
    toggleTheme: () => themeManager.toggleTheme(),
    availableThemes: themeManager.getAllThemes(),
  };
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

