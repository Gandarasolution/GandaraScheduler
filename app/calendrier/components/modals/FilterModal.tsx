import { memo } from "react";
import Modal from "./Modal";

// Modal de filtres pour les chantiers
type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: {
    etat: string[];
    chargeAffaire: string[];
    chefChantier: string[];
  };
  setActiveFilters: React.Dispatch<React.SetStateAction<{
    etat: string[];
    chargeAffaire: string[];
    chefChantier: string[];
  }>>;
  filterOptions: {
    etats: string[];
    chargeAffaires: string[];
    chefChantiers: string[];
  };
  onClearAll: () => void;
};

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  activeFilters,
  setActiveFilters,
  filterOptions,
  onClearAll
}) => {
  const toggleFilter = (category: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const activeFilterCount = Object.values(activeFilters).reduce((count, arr) => count + arr.length, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filtres des chantiers">
      <div className="flex flex-col gap-6 poppins max-h-96 overflow-y-auto text-primary">
        {/* En-tête avec compteur et bouton reset */}
        <div className="flex items-center justify-between pb-4 border-b border-light">
          <div className="flex items-center gap-2">
            <span className="text-sm">Filtres actifs:</span>
            <span className="bg-primary-ultra-light text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={onClearAll}
              className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              Tout supprimer
            </button>
          )}
        </div>

        {/* Filtre par état */}
        <div className="space-y-3">
          <h3 className="font-semibold ">État</h3>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.etats.map(etat => (
              <label key={etat} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded">
                <input
                  type="checkbox"
                  checked={activeFilters.etat.includes(etat)}
                  onChange={() => toggleFilter('etat', etat)}
                  className="rounded"
                />
                <span className="text-sm">{etat}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Filtre par chargé d'affaire */}
        <div className="space-y-3">
          <h3 className="font-semibold ">Chargé d'affaire</h3>
          <div className="space-y-1">
            {filterOptions.chargeAffaires.map(chargeAffaire => (
              <label key={chargeAffaire} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded">
                <input
                  type="checkbox"
                  checked={activeFilters.chargeAffaire.includes(chargeAffaire)}
                  onChange={() => toggleFilter('chargeAffaire', chargeAffaire)}
                  className="rounded"
                />
                <span className="text-sm ">{chargeAffaire}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Filtre par chef de chantier */}
        <div className="space-y-3">
          <h3 className="font-semibold">Chef de chantier</h3>
          <div className="space-y-1">
            {filterOptions.chefChantiers.map(chefChantier => (
              <label key={chefChantier} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded">
                <input
                  type="checkbox"
                  checked={activeFilters.chefChantier.includes(chefChantier)}
                  onChange={() => toggleFilter('chefChantier', chefChantier)}
                  className="rounded"
                />
                <span className="text-sm">{chefChantier}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};


export default memo(FilterModal);