/**
 * @fileoverview Composant de création d'étiquette réutilisable
 */

"use client";
import React from 'react';
import { Tags } from '../../types';

const MAX_LENGTH_TAG = 20;
const MAX_LENGTH_SHORT_TAG = 6;

interface TagCreationFormProps {
  newTag: Tags;
  onTagChange: (tag: Tags) => void;
  onAdd: () => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  duplicateError?: boolean;
  variant?: 'compact' | 'extended';
}

const TagCreationForm: React.FC<TagCreationFormProps> = ({
  newTag,
  onTagChange,
  onAdd,
  onKeyPress,
  duplicateError = false,
  variant = 'compact'
}) => {
  const isExtended = variant === 'extended';

  return (
    <div className={isExtended ? "p-4 border border-primary rounded-xl bg-primary-50 space-y-3 animate-in slide-in-from-top duration-200" : "flex flex-col gap-3"}>
      {isExtended && <h4 className="text-sm font-semibold text-primary">Nouvelle étiquette</h4>}
      
      {/* Version longue */}
      <div className="relative flex-1">
        <label className="text-xs text-gray-600 mb-1 block">
          {isExtended ? 'Version longue' : 'Nom complet'}
        </label>
        <input
          type="text"
          value={newTag.name}
          onChange={(e) => onTagChange({ ...newTag, name: e.target.value })}
          onKeyPress={onKeyPress}
          placeholder="Ex: Béton coulé"
          className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 ${
            duplicateError 
              ? 'border-red-500 focus:ring-red-500' 
              : 'border-default focus:ring-primary'
          } ${isExtended ? 'bg-white' : ''}`}
          maxLength={MAX_LENGTH_TAG}
        />
        <span className="absolute right-3 top-8 text-xs text-gray-400">
          {newTag.name.length}/{MAX_LENGTH_TAG}
        </span>
        {duplicateError && (
          <p className="text-xs text-red-500 mt-1">Cette étiquette existe déjà</p>
        )}
      </div>
      
      {/* Version courte (optionnelle) */}
      <div className="relative flex-1">
        <label className="text-xs text-gray-600 mb-1 block">
          Version courte <span className="text-gray-400 italic">(pour RDV ≤ 2 jours)</span>
        </label>
        <input
          type="text"
          value={newTag.shortName || ''}
          onChange={(e) => onTagChange({ ...newTag, shortName: e.target.value })}
          onKeyPress={onKeyPress}
          placeholder="Ex: BÉT"
          className={`w-full px-3 py-2 text-sm border border-default rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${isExtended ? 'bg-white' : ''}`}
          maxLength={MAX_LENGTH_SHORT_TAG}
        />
        <span className="absolute right-3 top-8 text-xs text-gray-400">
          {(newTag.shortName?.length || 0)}/{MAX_LENGTH_SHORT_TAG}
        </span>
      </div>
      
      <button
        type="button"
        onClick={onAdd}
        disabled={!newTag.name.trim()}
        className={`w-full px-3 py-2 bg-primary text-white rounded-xl hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
          isExtended ? '' : ''
        }`}
        title="Ajouter l'étiquette"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
        </svg>
        <span>Ajouter</span>
      </button>
    </div>
  );
};

export default TagCreationForm;
