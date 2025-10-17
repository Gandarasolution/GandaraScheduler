/**
 * @fileoverview Gestionnaire de Thèmes - Changement dynamique de thème
 * 
 * Ce module permet de:
 * - Changer le thème de l'application (clair/sombre/client)
 * - Sauvegarder les préférences utilisateur
 * - Détecter automatiquement le thème système
 * - Appliquer les thèmes personnalisés par client
 * 
 * @author Gandara Solutions
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type ThemeType = 
  | 'light'           // Thème clair par défaut
  | 'dark'            // Thème sombre
  | 'auto'            // Automatique (suit le système)
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

const THEME_STORAGE_KEY = 'gandara-scheduler-theme';

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
  auto: {
    name: 'auto',
    displayName: 'Automatique',
    description: 'Suit les préférences système',
    preview: {
      primary: 'bg-primary',
      background: '#ffffff',
      text: '#111827',
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

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  /**
   * Initialise le gestionnaire de thème
   */
  private initialize(): void {
    // Charger le thème sauvegardé ou utiliser 'auto'
    const savedTheme = this.getSavedTheme();
    this.applyTheme(savedTheme);

    // Écouter les changements du thème système
    this.setupSystemThemeListener();
  }

  /**
   * Configure l'écoute des changements du thème système
   */
  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemThemeListener = mediaQuery;

    mediaQuery.addEventListener('change', (e) => {
      if (this.currentTheme === 'auto') {
        this.applySystemTheme(e.matches);
      }
    });
  }

  /**
   * Récupère le thème sauvegardé dans le localStorage
   */
  private getSavedTheme(): ThemeType {
    if (typeof window === 'undefined') return 'light';

    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && this.isValidTheme(saved)) {
      return saved as ThemeType;
    }
    return 'auto';
  }

  /**
   * Sauvegarde le thème dans le localStorage
   */
  private saveTheme(theme: ThemeType): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
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
   */
  public applyTheme(theme: ThemeType): void {
    this.currentTheme = theme;
    this.saveTheme(theme);

    if (theme === 'auto') {
      // Détecter et appliquer le thème système
      const isDark = this.systemThemeListener?.matches ?? false;
      this.applySystemTheme(isDark);
    } else {
      this.applyThemeToDOM(theme);
    }
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
    if (this.currentTheme === 'auto') {
      const isDark = this.systemThemeListener?.matches ?? false;
      return isDark ? 'dark' : 'light';
    }
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

export const themeManager = new ThemeManager();

// ============================================================================
// HOOKS POUR REACT
// ============================================================================

import { useEffect, useState } from 'react';

/**
 * Hook React pour utiliser le thème actuel
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeType>(() => {
    if (typeof window !== 'undefined') {
      return themeManager.getCurrentTheme();
    }
    return 'light';
  });

  useEffect(() => {
    // S'abonner aux changements de thème
    const unsubscribe = themeManager.subscribe((newTheme) => {
      setTheme(newTheme);
    });

    return unsubscribe;
  }, []);

  return {
    theme,
    effectiveTheme: themeManager.getEffectiveTheme(),
    setTheme: (newTheme: ThemeType) => themeManager.applyTheme(newTheme),
    toggleTheme: () => themeManager.toggleTheme(),
    availableThemes: themeManager.getAllThemes(),
  };
}

/**
 * Hook pour vérifier si le thème actuel est sombre
 */
export function useIsDarkTheme(): boolean {
  const { effectiveTheme } = useTheme();
  return effectiveTheme === 'dark';
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Change le thème de l'application
 */
export function setTheme(theme: ThemeType): void {
  themeManager.applyTheme(theme);
}

/**
 * Récupère le thème actuel
 */
export function getCurrentTheme(): ThemeType {
  return themeManager.getCurrentTheme();
}

/**
 * Bascule entre clair et sombre
 */
export function toggleTheme(): void {
  themeManager.toggleTheme();
}

/**
 * Vérifie si le thème actuel est sombre
 */
export function isDarkTheme(): boolean {
  const effectiveTheme = themeManager.getEffectiveTheme();
  return effectiveTheme === 'dark';
}
