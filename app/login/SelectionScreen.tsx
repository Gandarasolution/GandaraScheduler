"use client";

import { useState } from 'react';

export type SelectionOption = {
  id: number;
  name: string;
  description?: string;
};

type SelectionScreenProps = {
  title: string;
  subtitle: string;
  options: SelectionOption[];
  onSelect: (id: number) => void;
  isLoading?: boolean;
  error?: string | null;
  onBack?: () => void;
};

export default function SelectionScreen({ 
  title, 
  subtitle, 
  options, 
  onSelect, 
  isLoading, 
  error, 
  onBack 
}: SelectionScreenProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleSelect = (id: number) => {
    setLoadingId(id);
    onSelect(id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-ultra-light via-white to-primary-lighter">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-light relative">
        
        {/* Bouton retour (utile si on s'est trompé de planning) */}
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute top-6 left-6 text-secondary hover:text-primary transition-colors"
            title="Retour"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}

        {/* En-tête */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-sm">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2 poppins">{title}</h1>
          <p className="text-secondary poppins text-sm">{subtitle}</p>
        </div>

        {/* Gestion des Erreurs */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm text-center">
            {error}
          </div>
        )}

        {/* Loader ou Liste */}
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option.id)}
                disabled={loadingId !== null}
                className="w-full flex items-center justify-between p-4 border border-default rounded-xl hover:border-primary hover:shadow-md transition-all group bg-white disabled:opacity-50 disabled:cursor-not-allowed text-left cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-primary poppins group-hover:text-primary-600">
                    {option.name}
                  </span>
                  {option.description && (
                    <span className="text-xs text-secondary mt-1 line-clamp-1">{option.description}</span>
                  )}
                </div>
                
                {loadingId === option.id ? (
                  <svg className="animate-spin h-5 w-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-secondary group-hover:text-primary transition-colors transform group-hover:translate-x-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}