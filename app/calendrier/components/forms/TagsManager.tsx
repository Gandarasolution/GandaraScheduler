/**
 * @fileoverview Composant générique pour la gestion d'étiquettes (tags)
 * 
 * @component TagsManager
 * @version 1.0.0
 * @remarks Composant agnostique du métier, réutilisable pour tout système d'étiquetage
 */

"use client";
import React from 'react';
import TagCreationForm from './TagCreationForm';
import DeleteModal from '../modals/DeleteModal';

/**
 * Définition d'une étiquette
 */
export interface Tag {
  /** ID unique de l'étiquette */
  id: number;
  /** Nom complet de l'étiquette */
  name: string;
  /** Nom court (optionnel) */
  shortName?: string;
}

export interface TagsManagerProps {
  /** Liste des étiquettes disponibles */
  tags: Tag[];
  /** Étiquette sélectionnée (optionnel) */
  selectedTag?: Tag;
  /** Callback pour sélection d'étiquette */
  onSelectTag?: (tag: Tag | undefined) => void;
  /** Callback pour ajout d'étiquette */
  onAddTag: (tag: Tag) => void;
  /** Callback pour suppression d'étiquette */
  onRemoveTag: (tagId: number) => void;
  /** Fonction pour vérifier si une étiquette es utilisée */
  isTagUsed?: (tagId: number) => { used: boolean; count: number };
  /** Mode d'affichage: 'compact' (liste seule) ou 'extended' (avec sélecteur) */
  variant?: 'compact' | 'extended';
  /** Titre de la section (pour mode extended) */
  title?: string;
  /** Placeholder pour la recherche/sélection */
  placeholder?: string;
}

interface TagsManagerState {
  showCreation: boolean;
  newTag: Tag;
  duplicateError: boolean;
  deleteModal: {
    isOpen: boolean;
    tagId: number | null;
    tagName: string;
    affectedCount: number;
  };
}

/**
 * Composant TagsManager - Gestion complète des étiquettes
 * 
 * Ce composant gère la création, l'affichage, la sélection et la suppression
 * d'étiquettes de manière totalement agnostique du métier.
 * 
 * @example
 * ```tsx
 * // Mode compact (liste d'étiquettes)
 * <TagsManager
 *   tags={availableTags}
 *   onAddTag={(tag) => addTag(tag)}
 *   onRemoveTag={(id) => removeTag(id)}
 *   isTagUsed={(id) => ({ used: true, count: 5 })}
 *   variant="compact"
 * />
 * 
 * // Mode extended (avec sélecteur)
 * <TagsManager
 *   tags={availableTags}
 *   selectedTag={currentTag}
 *   onSelectTag={(tag) => setCurrentTag(tag)}
 *   onAddTag={(tag) => addTag(tag)}
 *   onRemoveTag={(id) => removeTag(id)}
 *   variant="extended"
 *   title="Étiquette associée"
 * />
 * ```
 */
export const TagsManager: React.FC<TagsManagerProps> = ({
  tags,
  selectedTag,
  onSelectTag,
  onAddTag,
  onRemoveTag,
  isTagUsed,
  variant = 'extended',
  title = "Étiquettes",
  placeholder = "Aucune étiquette",
}) => {
  const [state, setState] = React.useState<TagsManagerState>({
    showCreation: false,
    newTag: { id: 0, name: '', shortName: '' },
    duplicateError: false,
    deleteModal: {
      isOpen: false,
      tagId: null,
      tagName: '',
      affectedCount: 0,
    },
  });

  /**
   * Gère l'ajout d'une nouvelle étiquette
   */
  const handleAddTag = () => {
    if (!state.newTag.name.trim()) return;
    
    // Vérifier si l'étiquette existe déjà
    if (tags.some(tag => tag.name.toLowerCase() === state.newTag.name.trim().toLowerCase())) {
      setState(prev => ({ ...prev, duplicateError: true }));
      return;
    }
    
    // Ajouter la nouvelle étiquette
    onAddTag({
      id: Date.now(),
      name: state.newTag.name.trim(),
      shortName: state.newTag.shortName?.trim() || undefined,
    });
    
    // Réinitialiser le formulaire
    setState(prev => ({
      ...prev,
      newTag: { id: 0, name: '', shortName: '' },
      showCreation: false,
      duplicateError: false,
    }));
  };

  /**
   * Gère la suppression d'une étiquette
   */
  const handleRemoveTag = (tagId: number) => {
    const tagInfo = isTagUsed ? isTagUsed(tagId) : { used: false, count: 0 };
    
    if (tagInfo.used) {
      // Ouvrir la modale de confirmation
      const tagToDelete = tags.find(tag => tag.id === tagId);
      setState(prev => ({
        ...prev,
        deleteModal: {
          isOpen: true,
          tagId: tagId,
          tagName: tagToDelete?.name || '',
          affectedCount: tagInfo.count,
        },
      }));
    } else {
      // Supprimer directement si non utilisée
      onRemoveTag(tagId);
    }
  };

  /**
   * Confirme la suppression d'une étiquette utilisée
   */
  const confirmRemoveTag = () => {
    if (!state.deleteModal.tagId) return;
    
    onRemoveTag(state.deleteModal.tagId);
    
    // Fermer la modale
    setState(prev => ({
      ...prev,
      deleteModal: {
        isOpen: false,
        tagId: null,
        tagName: '',
        affectedCount: 0,
      },
    }));
  };

  /**
   * Gère l'entrée clavier (Enter pour ajouter)
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  /**
   * Gère le changement de l'étiquette en cours de création
   */
  const handleTagChange = (tag: Tag) => {
    setState(prev => ({
      ...prev,
      newTag: tag,
      duplicateError: false,
    }));
  };

  /**
   * Toggle l'affichage du formulaire de création
   */
  const handleToggleCreation = () => {
    setState(prev => ({
      ...prev,
      showCreation: !prev.showCreation,
      duplicateError: false,
      newTag: { id: 0, name: '', shortName: '' },
    }));
  };

  // Rendu mode compact (liste d'étiquettes uniquement)
  if (variant === 'compact') {
    return (
      <>
        <div className="w-full flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-primary">{title}</h3>
          
          {/* Formulaire d'ajout */}
          <TagCreationForm
            newTag={state.newTag}
            onTagChange={handleTagChange}
            onAdd={handleAddTag}
            onKeyPress={handleKeyPress}
            duplicateError={state.duplicateError}
            variant="compact"
          />

          {/* Liste des étiquettes */}
          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
            {tags.map((tag) => {
              const tagInfo = isTagUsed ? isTagUsed(tag.id) : { used: false, count: 0 };
              return (
                <div
                  key={tag.id}
                  className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs group transition-colors hover:bg-red-50 hover:text-red-600
                    ${tagInfo.used ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}
                  `}
                  title={tagInfo.used ? `Utilisée ${tagInfo.count} fois` : 'Non utilisée - suppression directe'}
                >
                  <span>{tag.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag.id)}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 hidden group-hover:block"
                    title={tagInfo.used ? 'Supprimer l\'étiquette (confirmation requise)' : 'Supprimer l\'étiquette'}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modale de confirmation */}
        <DeleteModal
          isOpen={state.deleteModal.isOpen}
          onClose={() => setState(prev => ({
            ...prev,
            deleteModal: { isOpen: false, tagId: null, tagName: '', affectedCount: 0 }
          }))}
          title="Supprimer l'étiquette"
          scenario={{
            title: "Étiquette utilisée",
            description: (
              <>
                L'étiquette <strong>{state.deleteModal.tagName}</strong> est actuellement utilisée{' '}
                <strong>{state.deleteModal.affectedCount}</strong> fois.
                <br />
                <br />
                Si vous supprimez cette étiquette, elle sera retirée de tous les éléments associés.
              </>
            ),
            iconColor: "orange",
            iconType: "warning",
            infoMessages: [
              { text: "⚠️ Cette action ne peut pas être annulée.", type: "warning" }
            ],
            actions: [
              { 
                label: "Supprimer de tous les éléments", 
                onClick: confirmRemoveTag, 
                variant: "primary",
                requiresConfirm: false
              },
              { 
                label: "Annuler", 
                onClick: () => setState(prev => ({
                  ...prev,
                  deleteModal: { isOpen: false, tagId: null, tagName: '', affectedCount: 0 }
                })),
                variant: "cancel" 
              }
            ]
          }}
        />
      </>
    );
  }

  // Rendu mode extended (sélecteur + création)
  return (
    <>
      <div className="flex flex-col gap-4">
        <label className="text-sm font-medium">{title}</label>
        
        {/* Ligne avec le select et le bouton d'ajout */}
        <div className="flex items-center gap-2">
          <select
            value={selectedTag?.id || ''}
            onChange={(e) => {
              const tagId = e.target.value ? Number(e.target.value) : undefined;
              const tag = tagId ? tags.find(t => t.id === tagId) : undefined;
              onSelectTag?.(tag);
            }}
            className="flex-1 p-3 border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-color text-sm bg-secondary-bg"
          >
            <option value="">{placeholder}</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name} {tag.shortName ? `(${tag.shortName})` : ''}
              </option>
            ))}
          </select>
          
          {/* Bouton pour créer une étiquette */}
          <button
            type="button"
            onClick={handleToggleCreation}
            className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors shadow-sm"
            title={state.showCreation ? "Annuler" : "Créer une étiquette"}
          >
            {state.showCreation ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
            )}
          </button>
        </div>
      
        {/* Aperçu de l'étiquette sélectionnée */}
        {selectedTag && !state.showCreation && (
          <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-xl">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-primary">
              <path d="M2 2a1 1 0 0 1 1-1h4.586a1 1 0 0 1 .707.293l7 7a1 1 0 0 1 0 1.414l-4.586 4.586a1 1 0 0 1-1.414 0l-7-7A1 1 0 0 1 2 6.586V2zm3.5 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>
            </svg>
            <div className="flex flex-col">
              <span className="text-sm text-primary font-medium">
                {selectedTag.name}
              </span>
              {selectedTag.shortName && (
                <span className="text-xs text-gray-500">
                  Version courte : {selectedTag.shortName}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Formulaire de création d'étiquette */}
        {state.showCreation && (
          <TagCreationForm
            newTag={state.newTag}
            onTagChange={handleTagChange}
            onAdd={handleAddTag}
            duplicateError={state.duplicateError}
            variant="extended"
          />
        )}
      </div>
    </>
  );
};

export default TagsManager;
