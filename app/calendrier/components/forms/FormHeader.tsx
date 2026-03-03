/**
 * @fileoverview Composant générique pour l'en-tête de formulaire
 * Gère l'icône, les couleurs et les champs de création/édition de ressource
 * 
 * @component FormHeader
 * @version 1.0.0
 * @remarks Composant agnostique du métier, réutilisable dans n'importe quel contexte
 */

"use client";
import React from 'react';

/**
 * Configuration des couleurs personnalisables
 */
export interface ColorConfig {
  /** Couleur de fond */
  background?: string;
  /** Couleur de bordure */
  border?: string;
  /** Couleur de texte */
  text?: string;
}

/**
 * Champ de ressource générique
 */
export interface ResourceField {
  /** Nom du champ */
  name: string;
  /** Label affiché */
  label: string;
  /** Type de champ (text, checkbox, etc.) */
  type: 'text' | 'checkbox';
  /** Valeur actuelle */
  value: string | boolean;
  /** Placeholder pour les inputs texte */
  placeholder?: string;
  /** Contrainte required */
  required?: boolean;
  /** Largeur en fraction (1/2, 1/3, etc.) */
  width?: string;
  /** Message d'erreur */
  error?: string;
}

export interface FormHeaderProps {
  /** Configuration de l'icône */
  icon?: {
    /** Source de l'image */
    src?: string;
    /** Alt text */
    alt: string;
  };
  /** Callback pour ouvrir la modal d'image */
  onIconClick?: () => void;
  /** Configuration des couleurs */
  colors: ColorConfig;
  /** Callback pour changement de couleur */
  onColorChange: (colorType: 'background' | 'border' | 'text', value: string) => void;
  /** Champs de ressource (uniquement si mode création/édition) */
  resourceFields?: ResourceField[];
  /** Callback pour changement de champ ressource */
  onResourceFieldChange?: (fieldName: string, value: string | boolean) => void;
  /** Mode mobile (affecte le comportement du clic sur l'icône) */
  isMobile?: boolean;
}

/**
 * Normalise une couleur en format hexadécimal court (#RRGGBB)
 */
const normalizeColorForInput = (color: string | undefined, fallback: string = '#1E40AF'): string => {
  if (!color) return fallback;
  // Si la couleur a 9 caractères (#RRGGBBAA), on retire les 2 derniers (canal alpha)
  if (color.length === 9 && color.startsWith('#')) {
    return color.substring(0, 7);
  }
  return color;
};

/**
 * Composant FormHeader - En-tête de formulaire avec icône et couleurs
 * 
 * Ce composant est complètement agnostique du métier et peut être utilisé
 * dans n'importe quel contexte nécessitant une gestion d'icône, de couleurs
 * et de champs personnalisés.
 * 
 * @example
 * ```tsx
 * <FormHeader
 *   icon={{ src: imageUrl, alt: "Icône" }}
 *   onIconClick={() => openImageModal()}
 *   colors={{ background: '#1E40AF', border: '#1E40AF', text: '#FFFFFF' }}
 *   onColorChange={(type, value) => updateColor(type, value)}
 *   resourceFields={[
 *     { name: 'code', label: 'Code', type: 'text', value: 'CH', width: '1/3' },
 *     { name: 'active', label: 'Actif', type: 'checkbox', value: true, width: '1/6' }
 *   ]}
 *   onResourceFieldChange={(name, value) => updateField(name, value)}
 * />
 * ```
 */
export const FormHeader: React.FC<FormHeaderProps> = ({
  icon,
  onIconClick,
  colors,
  onColorChange,
  resourceFields,
  onResourceFieldChange,
  isMobile = false,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Champs de ressource (si présents) */}
      {resourceFields && resourceFields.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            {resourceFields.map((field) => (
              <div key={field.name} className={`w-${field.width || 'full'}`}>
                <label htmlFor={field.name} className="block text-xs font-medium text-gray-500 mb-1">
                  {field.label}
                </label>
                {field.type === 'text' ? (
                  <>
                    <input
                      type="text"
                      name={field.name}
                      id={field.name}
                      value={field.value as string}
                      onChange={(e) => onResourceFieldChange?.(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className={`w-full p-2 border rounded-xl focus:outline-none focus:ring-2 text-sm ${
                        field.error ? 'border-red-500 focus:ring-red-500' : 'border-default focus:ring-primary'
                      }`}
                      required={field.required}
                    />
                    {field.error && (
                      <p className="text-xs text-red-500 mt-1">{field.error}</p>
                    )}
                  </>
                ) : field.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    name={field.name}
                    id={field.name}
                    checked={field.value as boolean}
                    onChange={(e) => onResourceFieldChange?.(field.name, e.target.checked)}
                    className="w-5 h-5 cursor-pointer accent-primary"
                    title={field.label}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Icône et Couleurs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mr-2">
        <div className="flex items-start w-full sm:w-[68px]">Icône</div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
          {/* Container pour l'image */}
          <div 
            className="relative group"
            onClick={() => {
              if (isMobile && onIconClick) onIconClick();
            }}
          >
            {icon?.src ? (
              <img 
                src={icon.src} 
                alt={icon.alt} 
                className="w-12 h-12 rounded border border-default object-cover" 
              />
            ) : (
              <div className="w-12 h-12 rounded border border-default bg-gray-200 flex items-center justify-center text-gray-400">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={2} 
                  stroke="currentColor" 
                  className="w-6 h-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (!isMobile && onIconClick) onIconClick();
              }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full flex items-center justify-center text-[10px] hover:bg-primary transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm cursor-pointer"
              title="Modifier l'image"
            >
              <svg width="8" height="8" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708L10.5 8.207l-3-3L12.146.146zM11.207 9L8 5.793 1.146 12.646a.5.5 0 0 0-.146.354v2.5a.5.5 0 0 0 .5.5h2.5a.5.5 0 0 0 .354-.146L11.207 9zM4 15.5a.5.5 0 0 1-.5-.5v-2.293l8.5-8.5L14.293 6.5 5.793 15H4z"/>
              </svg>
            </button>
          </div>

          {/* Sélecteurs de couleur */}
          <div className="flex flex-col gap-2 w-full">
            {/* Couleur de fond */}
            <div className="relative group flex items-center gap-2">
              <label 
                htmlFor="color-fond"
                className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                style={{ backgroundColor: colors.background || '#1E40AF' }}
                title="Couleur de fond"
              />
              <input
                id="color-fond"
                type="color"
                value={normalizeColorForInput(colors.background)}
                onChange={(e) => onColorChange('background', e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                title="Couleur de fond"
              />
              <label htmlFor="color-fond" className="cursor-pointer text-sm flex-1">
                Couleur de fond
              </label>
            </div>

            {/* Couleur de bordure */}
            <div className="relative group flex items-center gap-2">
              <label 
                htmlFor="color-bordure"
                className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                style={{ backgroundColor: colors.border || '#1E40AF' }}
                title="Couleur de bordure"
              />
              <input
                id="color-bordure"
                type="color"
                value={normalizeColorForInput(colors.border)}
                onChange={(e) => onColorChange('border', e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                title="Couleur de bordure"
              />
              <label htmlFor="color-bordure" className="cursor-pointer text-sm flex-1">
                Couleur de bordure
              </label>
            </div>

            {/* Couleur de texte */}
            <div className="relative group flex items-center gap-2">
              <label 
                htmlFor="color-texte"
                className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                style={{ backgroundColor: colors.text || '#FFFFFF' }}
                title="Couleur de texte"
              />
              <input
                id="color-texte"
                type="color"
                value={normalizeColorForInput(colors.text, '#FFFFFF')}
                onChange={(e) => onColorChange('text', e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                title="Couleur de texte"
              />
              <label htmlFor="color-texte" className="cursor-pointer text-sm flex-1">
                Couleur de texte
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormHeader;
