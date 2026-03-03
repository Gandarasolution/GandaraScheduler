/**
 * @fileoverview Composant générique pour la gestion des permissions par utilisateur
 * 
 * @component PermissionsPanel
 * @version 1.0.0
 * @remarks Composant agnostique du métier, réutilisable pour tout système de permissions
 */

"use client";
import React, { useState, useMemo } from 'react';

/**
 * Définition d'une permission
 */
export interface Permission {
  /** Identifiant unique de la permission */
  id: string;
  /** Label affiché dans le tableau */
  label: string;
  /** Icône SVG (optionnel) */
  icon?: React.ReactNode;
  /** Description tooltip (optionnel) */
  description?: string;
}

/**
 * Utilisateur avec permissions
 */
export interface UserWithPermissions<T = Record<string, boolean>> {
  /** ID unique de l'utilisateur */
  id: number;
  /** Nom complet ou identifiant affiché */
  displayName: string;
  /** Initiales (optionnel, pour avatar) */
  initials?: string;
  /** Permissions de cet utilisateur */
  permissions: T;
}

export interface PermissionsPanelProps<T = Record<string, boolean>> {
  /** Liste des utilisateurs avec leurs permissions */
  users: UserWithPermissions<T>[];
  /** Liste des permissions disponibles */
  availablePermissions: Permission[];
  /** Callback pour changement de permission */
  onPermissionChange: (userId: number, permissionId: string, value: boolean) => void;
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
 * Composant PermissionsPanel - Gestion des permissions par utilisateur
 * 
 * Ce composant est complètement générique et peut gérer n'importe quel type
 * de permissions pour n'importe quel type d'utilisateurs.
 * 
 * @example
 * ```tsx
 * const permissions = [
 *   { id: 'canView', label: 'Voir', icon: <EyeIcon /> },
 *   { id: 'canEdit', label: 'Éditer', icon: <EditIcon /> },
 * ];
 * 
 * const users = [
 *   { 
 *     id: 1, 
 *     displayName: 'Jean Dupont', 
 *     initials: 'JD',
 *     permissions: { canView: true, canEdit: false }
 *   }
 * ];
 * 
 * <PermissionsPanel
 *   users={users}
 *   availablePermissions={permissions}
 *   onPermissionChange={(userId, permId, value) => updatePerm(userId, permId, value)}
 *   title="Gestion des permissions"
 *   defaultOpen={false}
 * />
 * ```
 */
export function PermissionsPanel<T = Record<string, boolean>>({
  users,
  availablePermissions,
  onPermissionChange,
  title = "Gestion des permissions",
  subtitle,
  defaultOpen = false,
  searchPlaceholder = "Rechercher un utilisateur...",
}: PermissionsPanelProps<T>) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * Filtrage des utilisateurs selon la recherche
   */
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.displayName.toLowerCase().includes(query) ||
      (user.initials && user.initials.toLowerCase().includes(query))
    );
  }, [users, searchQuery]);

  return (
    <div className="mt-4 border border-primary rounded-xl overflow-hidden bg-secondary-bg">
      {/* En-tête cliquable */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-primary-50 transition-colors"
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
          <span className="text-xs text-tertiary">{users.length} utilisateur(s)</span>
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
                  {availablePermissions.map(permission => (
                    <th 
                      key={permission.id}
                      className="text-center py-3 px-2 font-semibold text-primary border-b border-default"
                      title={permission.description}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {permission.icon || (
                          <div className="w-4 h-4" /> /* Placeholder si pas d'icône */
                        )}
                        <span className="text-[10px] font-normal">{permission.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr 
                    key={user.id} 
                    className={`hover:bg-primary-50 transition-colors border-b border-default ${
                      index % 2 === 0 ? 'bg-white' : 'bg-secondary-bg'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-primary font-medium">
                      <div className="flex items-center gap-2">
                        {user.initials && (
                          <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                            {user.initials}
                          </div>
                        )}
                        {user.displayName}
                      </div>
                    </td>
                    {availablePermissions.map(permission => {
                      const isChecked = (user.permissions as Record<string, boolean>)[permission.id] || false;
                      return (
                        <td key={permission.id} className="text-center py-2.5 px-2">
                          <label className="inline-flex items-center justify-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => onPermissionChange(user.id, permission.id, e.target.checked)}
                              className="w-4 h-4 cursor-pointer accent-primary rounded"
                            />
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={availablePermissions.length + 1} className="py-8 text-center text-tertiary">
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
