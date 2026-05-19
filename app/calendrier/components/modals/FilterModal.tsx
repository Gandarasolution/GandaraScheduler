import { memo, useEffect, useState } from "react";
import Modal from "./Modal";
import { FilterCategory, FilterConfigWithActive, ActiveFilters } from "../../utils/searchAndFilterUtils";
import { Combobox } from "../ui/Combobox";
import ressourceService from "@/app/service/ressource.service";

// Cache pour stocker les options des filtres (évite de recharger pendant 1h)
const filterOptionsCache: Record<string, { timestamp: number, data: any }> = {};
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 heure

type FilterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (filters: ActiveFilters) => void;
  filterConfig: FilterConfigWithActive;
  onClearAll: () => void;
  title?: string;
  viewType?: string;
};

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  filterConfig,
  onClearAll,
  title,
  viewType
}) => {
    
  // On gère localement la config pour pouvoir la mettre à jour via l'API
  const [localFilterConfig, setLocalFilterConfig] = useState<FilterConfigWithActive>(filterConfig);
  const [isLoading, setIsLoading] = useState(false);

  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(
    filterConfig.activeFilters  || {}
  );


  const toggleFilter = (categoryKey: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [categoryKey]: (prev[categoryKey] || []).includes(value)
        ? (prev[categoryKey] || []).filter(item => item !== value)
        : [...(prev[categoryKey] || []), value]
    }));
  };

  const setSelectFilter = (categoryKey: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [categoryKey]: [value]
    }));
  };

  const getBadgeClass = (option: string, category: FilterCategory) => {
    // Si des couleurs personnalisées sont définies pour ce badge
    if (category.badgeColors && category.badgeColors[option]) {
      return category.badgeColors[option];
    }

    // Couleur par défaut
    return 'bg-gray-100 text-gray-800';
  };

  const renderFilterInput = (categoryKey: string, category: FilterCategory) => {
    switch (category.type) {
      case 'checkbox':
        return (
          <div className={category.options.length > 4 ? "space-y-1" : "grid grid-cols-2 gap-2"}>
            {category.options.map(option => (
              <label key={option} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded">
                <input
                  type="checkbox"
                  checked={activeFilters[categoryKey]?.includes(option) ?? false}
                  onChange={() => toggleFilter(categoryKey, option)}
                  className="rounded"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'badge':
        return (
          <div className="flex flex-wrap gap-4">
            {category.options.map(option => {
              const isSelected = activeFilters[categoryKey]?.includes(option) ?? false;
              const badgeClass = getBadgeClass(option, category);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleFilter(categoryKey, option)}
                  className={`
                    inline-flex items-center px-3 py-1.5 rounded-3xl text-xs font-medium
                    transition-all duration-200
                    ${badgeClass}
                    ${isSelected 
                      ? 'ring-1 ring-primary ring-offset-2 scale-105' 
                      : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }
                  `}
                >
                  {option}
                  {isSelected && (
                    <svg className="ml-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              );
            })}
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
                  checked={activeFilters[categoryKey]?.includes(option) ?? false}
                  onChange={() => setSelectFilter(categoryKey, option)}
                  className="rounded-full"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );
      case 'combobox':
        return (
          <Combobox
            options={category.options.map(option => ({ label: option, value: option }))}
            value={activeFilters[categoryKey] || []}
            onValueChange={(newValues) =>
              setActiveFilters(prev => ({
                ...prev,
                [categoryKey]: newValues
              }))
            }
            placeholder="Sélectionner..."
          />
        );

      default:
        return null;
    }
  };

  useEffect(() => {
    setActiveFilters(filterConfig.activeFilters || {});
  }, [filterConfig.activeFilters]);

  // Récupérer les options dynamiquement depuis l'API à l'ouverture
  useEffect(() => {
    if (isOpen) {
      const keys = Object.keys(filterConfig).filter(k => k !== 'activeFilters');
      if (keys.length === 0) return;

      const cacheKey = (viewType || '') + '_' + keys.join(',');
      const now = Date.now();

      // Vérifier si on a des données en cache valides (moins de 1h)
      if (filterOptionsCache[cacheKey] && (now - filterOptionsCache[cacheKey].timestamp < CACHE_DURATION_MS)) {
        const cachedData = filterOptionsCache[cacheKey].data;
        setLocalFilterConfig(prev => {
          const updatedConfig = { ...prev };
          for (const key of Object.keys(cachedData)) {
            if (updatedConfig[key] && typeof updatedConfig[key] === 'object' && 'options' in updatedConfig[key]!) {
              updatedConfig[key] = {
                ...updatedConfig[key],
                options: cachedData[key]
              } as FilterCategory;
            }
          }
          return updatedConfig;
        });
        return; // On ne fait pas l'appel API si on utilise le cache
      }

      setIsLoading(true);

      ressourceService.getFilterOptionsDynamic(viewType || '', keys)
        .then(response => {
          if (response?.error === 0 && response.data) {
            // Mettre en cache la réponse
            filterOptionsCache[cacheKey] = {
              timestamp: Date.now(),
              data: response.data
            };

            setLocalFilterConfig(prev => {
              const updatedConfig = { ...prev };
              for (const key of Object.keys(response.data)) {
                if (updatedConfig[key] && typeof updatedConfig[key] === 'object' && 'options' in updatedConfig[key]!) {
                  updatedConfig[key] = {
                    ...updatedConfig[key],
                    options: response.data[key]
                  } as FilterCategory;
                }
              }
              return updatedConfig;
            });
          }
        })
        .catch(err => console.error("Erreur lors de la récupération des options de filtres :", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, filterConfig, viewType]);

  return (
    <Modal 
      isOpen={isOpen}
      onClose={() => {
        onClose();
        onSubmit(activeFilters);
      }} 
      title={title} 
      className="max-w-lg w-full" 
      classNameContent="px-4"
    >
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6 poppins text-primary py-4">
            {/* Rendu dynamique des filtres */}
            {Object.entries(localFilterConfig)
              .filter(([key]) => key !== 'activeFilters') // Exclure la propriété activeFilters
              .map(([key, category]) => {
                // Type guard pour assurer que category est bien FilterCategory
                if (typeof category !== 'object' || !('label' in category)) return null;
                const filterCategory = category as FilterCategory;
                
                return (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between w-full">
                      <h3 className="font-semibold">{filterCategory.label}</h3>
                      <button 
                        onClick={() => {
                          setActiveFilters(prev => ({
                            ...prev,
                            [key]: []
                          }));
                        }}
                        className="mr-3 p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors duration-200  cursor-pointer"
                        title="Réinitialiser ce filtre"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-trash3-fill" viewBox="0 0 16 16">
                          <path d="M11 1.5v1h3.5a.5.5 0 0 1 0 1h-.538l-.853 10.66A2 2 0 0 1 11.115 16h-6.23a2 2 0 0 1-1.994-1.84L2.038 3.5H1.5a.5.5 0 0 1 0-1H5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5m-5 0v1h4v-1a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5M4.5 5.029l.5 8.5a.5.5 0 1 0 .998-.06l-.5-8.5a.5.5 0 1 0-.998.06m6.53-.528a.5.5 0 0 0-.528.47l-.5 8.5a.5.5 0 0 0 .998.058l.5-8.5a.5.5 0 0 0-.47-.528M8 4.5a.5.5 0 0 0-.5.5v8.5a.5.5 0 0 0 1 0V5a.5.5 0 0 0-.5-.5"/>
                        </svg>
                      </button>
                    </div>
                    {renderFilterInput(key, filterCategory)}
                  </div>
                );
              })}
          </div>
          <div className="py-4 flex items-center justify-between">
            <button
              onClick={onClearAll}
              className="text-primary-500 rounded-lg cursor-pointer hover:bg-gray-100 px-4 py-2"
            >
              Réinitialiser
            </button>
            <button
              onClick={
                () => {
                  onSubmit(activeFilters);
                  onClose();
              }
            }
              className="px-4 py-2 cursor-pointer bg-primary text-white rounded hover:bg-primary-600 transition rounded-lg"
            >
              Appliquer les filtres
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default memo(FilterModal);