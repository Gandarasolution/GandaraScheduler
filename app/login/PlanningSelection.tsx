"use client";

import { useState } from 'react';

export type PlanningOption = {
  IdPlanning: number;
  NomPlanning: string;
  IdPlanningImage: number | null;
};

type PlanningSelectionProps = {
  plannings: PlanningOption[];
  onSelectPlanning: (planningId: number) => void;
};

export default function PlanningSelection({ plannings, onSelectPlanning }: PlanningSelectionProps) {
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleSelect = (id: number) => {
    setLoadingId(id);
    // On appelle la fonction parente (qui va mettre à jour le contexte)
    onSelectPlanning(id);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-ultra-light via-white to-primary-lighter">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-light">
        
        {/* En-tête (Même style que le login) */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-sm">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2 poppins">Espaces de travail</h1>
          <p className="text-secondary poppins">Sélectionnez le planning auquel vous souhaitez accéder</p>
        </div>

        {/* Liste des plannings */}
        <div className="space-y-3">
          {plannings.map((planning) => (
            <button
              key={planning.IdPlanning}
              onClick={() => handleSelect(planning.IdPlanning)}
              disabled={loadingId !== null}
              className="w-full flex items-center justify-between p-4 border border-default rounded-xl hover:border-primary hover:shadow-md transition-all group bg-white disabled:opacity-50 disabled:cursor-not-allowed text-left cursor-pointer"
            >
              <span className="font-medium text-primary poppins group-hover:text-primary-600">
                {planning.NomPlanning}
              </span>
              
              {/* Spinner si on a cliqué sur CE planning, sinon petite flèche */}
              {loadingId === planning.IdPlanning ? (
                <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-secondary group-hover:text-primary transition-colors transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}