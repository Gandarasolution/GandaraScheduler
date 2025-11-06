import { memo } from "react";
import Modal from "./Modal";
import { FilterCategory, FilterConfig, ActiveFilters } from "../../utils/searchAndFilterUtils";

type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  filterConfig: FilterConfig;
  activeFilters: ActiveFilters;
  setActiveFilters: React.Dispatch<React.SetStateAction<ActiveFilters>>;
  onClearAll: () => void;
};

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  filterConfig,
  activeFilters,
  setActiveFilters,
  onClearAll
}) => {
  const toggleFilter = (categoryKey: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [categoryKey]: prev[categoryKey].includes(value)
        ? prev[categoryKey].filter(item => item !== value)
        : [...prev[categoryKey], value]
    }));
  };

  const setSelectFilter = (categoryKey: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [categoryKey]: [value]
    }));
  };

  const activeFilterCount = Object.values(activeFilters).reduce(
    (count, category) => count + category.length, 
    0
  );

  const renderFilterInput = (categoryKey: string, category: FilterCategory) => {
    switch (category.type) {
      case 'checkbox':
        return (
          <div className={category.options.length > 4 ? "space-y-1" : "grid grid-cols-2 gap-2"}>
            {category.options.map(option => (
              <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded">
                <input
                  type="checkbox"
                  checked={activeFilters[categoryKey].includes(option)}
                  onChange={() => toggleFilter(categoryKey, option)}
                  className="rounded"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'select':
        return (
          <select
            value={activeFilters[categoryKey][0] || ''}
            onChange={(e) => setSelectFilter(categoryKey, e.target.value)}
            className="w-full p-2 border border-light rounded focus:outline-none focus:border-primary"
          >
            <option value="">Tous</option>
            {category.options.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-1">
            {category.options.map(option => (
              <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded">
                <input
                  type="radio"
                  name={categoryKey}
                  checked={activeFilters[categoryKey].includes(option)}
                  onChange={() => setSelectFilter(categoryKey, option)}
                  className="rounded-full"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

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

        {/* Rendu dynamique des filtres */}
        {Object.entries(filterConfig).map(([key, category]) => (
          <div key={key} className="space-y-3">
            <h3 className="font-semibold">{category.label}</h3>
            {renderFilterInput(key, category)}
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default memo(FilterModal);