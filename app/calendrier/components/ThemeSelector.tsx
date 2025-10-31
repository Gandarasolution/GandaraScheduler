/**
 * @fileoverview Sélecteur de Thème - Composant UI pour changer de thème
 * 
 * Permet aux utilisateurs de:
 * - Voir tous les thèmes disponibles
 * - Prévisualiser les couleurs de chaque thème
 * - Changer facilement le thème avec un clic
 * - Sauvegarder automatiquement les préférences
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, ThemeType, AVAILABLE_THEMES } from '../utils/themeManager';

// ============================================================================
// TYPES
// ============================================================================

interface ThemeSelectorProps {
  
  /** Position du sélecteur (défaut: 'bottom-left') */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Taille du bouton (défaut: 'medium') */
  size?: 'small' | 'medium' | 'large';
  /** Afficher les labels (défaut: true) */
  showLabels?: boolean;
  /** Classe CSS personnalisée */
  className?: string;
  /** Callback appelé lors du changement de thème */
  onThemeChange?: (theme: ThemeType) => void;
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  position = 'bottom-left',
  size = 'medium',
  showLabels = true,
  className = '',
  onThemeChange,
}) => {
  const { theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le menu si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Classes de position
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  // Classes de taille
  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-10 h-10 text-base',
    large: 'w-12 h-12 text-lg',
  };

  // Direction verticale du menu déroulant
  const dropdownDirection = position.startsWith('bottom') ? 'bottom-full mb-2' : 'top-full mt-2';
  
  // Direction horizontale du menu déroulant
  const dropdownHorizontal = position.endsWith('left') ? 'left-0' : 'right-0';

  // Récupérer le thème actuel
  const currentThemeConfig = AVAILABLE_THEMES[theme];

  return (
    <div 
      ref={dropdownRef}
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
    >
      {/* Bouton d'ouverture */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          ${sizeClasses[size]}
          flex items-center justify-center
          rounded-lg shadow-lg
          transition-all duration-200
          hover:scale-110
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          bg-primary text-white
          hover:bg-primary-dark
        `}
        aria-label="Changer le thème"
        title={`Thème actuel: ${currentThemeConfig.displayName}`}
      >
        {/* Icône de palette */}
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" 
          />
        </svg>
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div 
          className={`
            absolute ${dropdownDirection} ${dropdownHorizontal}
            w-64 p-2
            bg-white dark:bg-gray-800
            rounded-lg shadow-xl
            border border-gray-200 dark:border-gray-700
            animate-fadeIn
          `}
        >
          {showLabels && (
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 mb-2">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Choisir un thème
              </p>
            </div>
          )}

          <div className="space-y-1">
            {availableThemes.map((themeConfig) => {
              const isActive = theme === themeConfig.name;
              
              return (
                <button
                  key={themeConfig.name}
                  onClick={() => {
                    const newTheme = themeConfig.name as ThemeType;
                    setTheme(newTheme);
                    setIsOpen(false);
                    // Notifier le parent du changement
                    if (onThemeChange) {
                      onThemeChange(newTheme);
                    }
                  }}
                  className={`
                    w-full px-3 py-2.5 
                    flex items-center gap-3
                    rounded-md
                    transition-all duration-150
                    ${isActive 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }
                  `}
                >
                  {/* Prévisualisation des couleurs */}
                  <div className="flex gap-1.5">
                    <div 
                      className="w-5 h-5 rounded-full border border-white/30 shadow-sm"
                      style={{ backgroundColor: themeConfig.preview.primary }}
                      title="Couleur principale"
                    />
                    <div 
                      className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
                      style={{ backgroundColor: themeConfig.preview.background }}
                      title="Couleur de fond"
                    />
                  </div>

                  {/* Informations du thème */}
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                      {themeConfig.displayName}
                    </p>
                    {showLabels && (
                      <p className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                        {themeConfig.description}
                      </p>
                    )}
                  </div>

                  {/* Icône de sélection */}
                  {isActive && (
                    <svg 
                      className="w-5 h-5 text-white" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer avec info */}
          {showLabels && (
            <div className="px-3 py-2 mt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Le thème est lié à votre profil utilisateur
              </p>
            </div>
          )}
        </div>
      )}

      {/* Styles pour l'animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// COMPOSANT BOUTON SIMPLE (Alternative légère)
// ============================================================================

interface ThemeToggleButtonProps {
  /** Classe CSS personnalisée */
  className?: string;
  /** Afficher le label (défaut: false) */
  showLabel?: boolean;
}

/**
 * Bouton simple pour basculer entre clair et sombre
 */
export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { effectiveTheme, toggleTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`
        flex items-center gap-2 px-3 py-2
        rounded-lg
        transition-all duration-200
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-primary
        ${className}
      `}
      aria-label={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
      title={isDark ? 'Passer au thème clair' : 'Passer au thème sombre'}
    >
      {/* Icône soleil/lune */}
      {isDark ? (
        <svg 
          className="w-5 h-5 text-yellow-500" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            fillRule="evenodd" 
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" 
            clipRule="evenodd" 
          />
        </svg>
      ) : (
        <svg 
          className="w-5 h-5 text-gray-700" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path 
            d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" 
          />
        </svg>
      )}

      {/* Label optionnel */}
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {isDark ? 'Clair' : 'Sombre'}
        </span>
      )}
    </button>
  );
};

// ============================================================================
// EXPORT PAR DÉFAUT
// ============================================================================

export default ThemeSelector;
