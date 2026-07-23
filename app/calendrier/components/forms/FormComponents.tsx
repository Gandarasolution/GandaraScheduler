/**
 * @fileoverview Composants simples et réutilisables pour formulaires
 * 
 * @version 1.0.0
 * @remarks Composants agnostiques du métier
 */

"use client";
import React from 'react';

/**
 * ========================================
 * FormPreview - Aperçu d'un élément
 * ========================================
 */
export interface FormPreviewProps {
  /** Contenu à afficher dans l'aperçu */
  children: React.ReactNode;
  /** Titre de la section preview (optionnel) */
  title?: string;
  /** Classe CSS personnalisée */
  className?: string;
}

/**
 * Composant FormPreview - Affiche un aperçu d'un élément
 */
export const FormPreview: React.FC<FormPreviewProps> = ({
  children,
  title,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {title && <p className="text-xs font-medium text-gray-500 mb-2">{title}</p>}
      {children}
    </div>
  );
};

/**
 * ========================================
 * EmployeeSelector - Sélecteur d'employé
 * ========================================
 */
export interface Employee {
  /** ID unique */
  id: number;
  /** Nom complet ou identifiant */
  displayName: string;
}

export interface EmployeeSelectorProps {
  /** Liste des employés */
  employees: Employee[];
  /** ID de l'employé sélectionné */
  selectedEmployeeId: number;
  /** Callback pour changement de sélection */
  onEmployeeChange: (employeeId: number) => void;
  /** Label du sélecteur */
  label?: string;
  /** Placeholder */
  placeholder?: string;
  /** Disabled */
  disabled?: boolean;
}

/**
 * Composant EmployeeSelector - Sélecteur générique d'employé/utilisateur
 */
export const EmployeeSelector: React.FC<EmployeeSelectorProps> = ({
  employees,
  selectedEmployeeId,
  onEmployeeChange,
  label = "Affecté",
  placeholder = "Sélectionner...",
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {label && <label htmlFor="employeeId" className="block text-sm font-medium">{label}</label>}
      <select
        id="employeeId"
        name="employeeId"
        value={selectedEmployeeId || ''}
        onChange={(e) => onEmployeeChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full p-2 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color bg-secondary-bg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!selectedEmployeeId && <option value="">{placeholder}</option>}
        {employees.map(employee => (
          <option key={employee.id} value={employee.id}>
            {employee.displayName}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * ========================================
 * AnnotationsField - Champ annotations/notes
 * ========================================
 */
export interface AnnotationsFieldProps {
  /** Valeur actuelle */
  value: string;
  /** Callback pour changement */
  onChange: (value: string) => void;
  /** Label du champ */
  label?: string;
  /** Placeholder */
  placeholder?: string;
  /** Hauteur en pixels */
  height?: number;
  /** Nombre de caractères max (optionnel) */
  maxLength?: number;
  /** Disabled */
  disabled?: boolean;
}

/**
 * Composant AnnotationsField - Champ de texte multiligne pour annotations
 */
export const AnnotationsField: React.FC<AnnotationsFieldProps> = ({
  value,
  onChange,
  label = "Annotations",
  placeholder = "Ajoutez des annotations...",
  height = 96,
  maxLength,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col gap-6">
      {label && <label className="text-sm font-medium">{label}</label>}
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        style={{ height: `${height}px` }}
        className="w-full p-3 border border-default rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-color text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {maxLength && (
        <div className="text-xs text-gray-500 text-right">
          {value?.length || 0} / {maxLength}
        </div>
      )}
    </div>
  );
};

/**
 * ========================================
 * ExpandButton - Bouton d'expansion/réduction
 * ========================================
 */
export interface ExpandButtonProps {
  /** État d'expansion */
  isExpanded: boolean;
  /** Callback pour toggle */
  onToggle: () => void;
  /** Position (optionnel) */
  position?: 'top-right' | 'top-left';
}

/**
 * Composant ExpandButton - Bouton pour étendre/réduire une section
 */
export const ExpandButton: React.FC<ExpandButtonProps> = ({
  isExpanded,
  onToggle,
  position = 'top-right',
}) => {
  const positionClasses = position === 'top-right' ? 'top-4 right-2' : 'top-4 left-2';
  
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`absolute ${positionClasses} w-6 h-6 rounded-full flex items-center justify-center transition-colors z-10 cursor-pointer`}
      title={isExpanded ? "Réduire" : "Options avancées"}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        fill="currentColor" 
        className={`transition-transform duration-300 bi bi-chevron-right text-[#84818a] ${isExpanded ? 'rotate-180' : ''}`} 
        viewBox="0 0 16 16"
      >
        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
      </svg>
    </button>
  );
};

/**
 * ========================================
 * ActionButtons - Boutons d'action (Enregistrer/Annuler)
 * ========================================
 */
export interface ActionButtonsProps {
  /** Label du bouton primaire */
  primaryLabel?: string | React.ReactNode;
  /** Label du bouton secondaire */
  secondaryLabel?: string;
  /** Callback pour action primaire */
  onPrimary?: () => void;
  /** Callback pour action secondaire */
  onSecondary?: () => void;
  /** Type du bouton primaire (pour formulaire) */
  primaryType?: 'submit' | 'button';
  /** Disabled */
  disabled?: boolean;
}

/**
 * Composant ActionButtons - Boutons d'action standardisés
 */
export const ActionButtons: React.FC<ActionButtonsProps> = ({
  primaryLabel = "Enregistrer",
  secondaryLabel = "Annuler",
  onPrimary,
  onSecondary,
  primaryType = 'submit',
  disabled = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between gap-3 mt-auto pt-5">
      <button
        type={primaryType}
        className="px-4 py-3 bg-primary cursor-pointer text-white rounded-xl flex-1 sm:flex-none sm:w-[110px] flex items-center poppins text-sm justify-center font-medium touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        {primaryLabel}
      </button>
    
      <button
        type="button"
        onClick={onSecondary}
        disabled={disabled}
        className="px-4 py-3 bg-primary cursor-pointer text-white rounded-xl flex-1 sm:flex-none sm:w-[110px] flex items-center poppins text-sm justify-center font-medium touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {secondaryLabel}
      </button>
    </div>
  );
};

export default {
  FormPreview,
  EmployeeSelector,
  AnnotationsField,
  ExpandButton,
  ActionButtons,
};
