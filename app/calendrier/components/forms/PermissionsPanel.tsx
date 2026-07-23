/**
 * @fileoverview Composant de gestion des permissions par utilisateur (niveaux exclusifs)
 * * @component PermissionsPanel
 * @version 1.1.0
 */

"use client";
import React, { useState, useMemo } from 'react';

/**
 * Définition d'un niveau de permission (ex: 21, 22, 23)
 */
export interface Permission {
  /** ID unique du niveau de permission */
  IdDroit: number | string;
  /** Label affiché dans le tableau */
  LibelleDroit: string;
  /** Icône SVG (optionnel) */
  Icon?: React.ReactNode;
  /** Description tooltip (optionnel) */
  Description?: string;
}

/**
 * Utilisateur avec son niveau de permission actuel
 */
export interface UserWithPermission {
  /** ID unique de l'utilisateur */
  IdPersonnel: number;

  NomPersonnel: string;
  PrenomPersonnel: string;
  /** Initiales (optionnel, pour avatar) */
  Initials?: string;
  /** ID du niveau de permission actuel */
  IdDroit: number | string;
}

export interface PermissionsPanelProps {
  /** Liste des utilisateurs avec leur niveau de permission */
  usersWithPermission: UserWithPermission[];
  /** Liste des niveaux de permission disponibles */
  permissions: Permission[];
  /** Callback pour changement de permission */
  onPermissionChange: (IdPersonnel: number, IdDroit: number | string) => void;
  /** Titre du panel */
  title?: string;
  /** Sous-titre ou description */
  subtitle?: string;
  /** Afficher le panel ouvert par défaut */
  defaultOpen?: boolean;
  /** Placeholder pour la recherche */
  searchPlaceholder?: string;
}

/**
 * Composant PermissionsPanel
 * Affiche une liste d'utilisateurs avec des boutons radio pour sélectionner un niveau d'accès.
 */
export function PermissionsPanel({
  usersWithPermission,
  permissions,
  onPermissionChange,
  title = "Gestion des permissions",
  subtitle,
  defaultOpen = false,
  searchPlaceholder = "Rechercher un utilisateur...",
}: PermissionsPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Filtrage des utilisateurs selon la recherche
   */
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return usersWithPermission;
    
    const query = searchQuery.toLowerCase();
    return usersWithPermission.filter(user => 
      user.NomPersonnel.toLowerCase().includes(query) ||
      user.PrenomPersonnel.toLowerCase().includes(query) ||
      (user.Initials && user.Initials.toLowerCase().includes(query))
    );
  }, [usersWithPermission, searchQuery]);

  return (
    <div className="mt-4 border border-primary rounded-xl overflow-hidden bg-secondary-bg">
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-primary-50 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-primary">
              <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
            </svg>
          </div>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" className="text-primary">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
          </svg>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-primary">{title}</h3>
            {subtitle && <p className="text-xs text-tertiary">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-tertiary">{filteredUsers.length} utilisateur(s)</span>
          <span className="text-xs px-2 py-1 rounded-full bg-primary-50 text-primary font-medium">
            {isOpen ? 'Masquer' : 'Afficher'}
          </span>
        </div>
      </button>

      {/* Contenu dépliable */}
      {isOpen && (
        <div className="px-4 pb-4 animate-in slide-in-from-top duration-200">
          {/* Barre de recherche */}
          <div className="relative mb-3">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-sm border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 20 20">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Tableau des permissions */}
          <div className="max-h-[350px] overflow-y-auto border border-default rounded-lg shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-primary-bg sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="text-left py-3 px-3 font-semibold text-primary border-b border-default">
                    Utilisateur
                  </th>
                  {permissions.map(level => (
                    <th 
                      key={level.IdDroit}
                      className="text-center py-3 px-2 font-semibold text-primary border-b border-default"
                      title={level.Description || ''}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {level.Icon || (
                          <div className="w-4 h-4" /> /* Placeholder si pas d'icône */
                        )}
                        <span className="text-[10px] font-normal">{level.LibelleDroit}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr 
                    key={user.IdPersonnel} 
                    className={`hover:bg-primary-50 transition-colors border-b border-default ${
                      index % 2 === 0 ? 'bg-white' : 'bg-secondary-bg'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-primary font-medium">
                      <div className="flex items-center gap-2">
                        {user.Initials && (
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                            {user.Initials}
                          </div>
                        )}
                        {user.NomPersonnel} {user.PrenomPersonnel}
                      </div>
                    </td>
                    {permissions.map(level => {
                      // Vérifie si l'utilisateur possède CE niveau spécifique
                      const isChecked = user.IdDroit === level.IdDroit;
                      return (
                        <td key={level.IdDroit} className="text-center py-2.5 px-2">
                          <label className="inline-flex items-center justify-center cursor-pointer w-full h-full">
                            <input
                              type="radio"
                              name={`perm-${user.IdPersonnel}`}
                              checked={isChecked}
                              onChange={() => onPermissionChange(user.IdPersonnel, level.IdDroit)}
                              className="w-4 h-4 cursor-pointer accent-primary"
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={permissions.length + 1} className="py-8 text-center text-tertiary">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
                        </svg>
                        <span className="text-sm">Aucun utilisateur trouvé</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PermissionsPanel;