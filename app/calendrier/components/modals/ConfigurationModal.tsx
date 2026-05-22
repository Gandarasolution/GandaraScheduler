
import { memo, useEffect, useState } from "react";
import { CalendarConfig, Filter, ImageType, GroupingLevel, FilterCategories, User } from "../../types";
import Modal from "./Modal";
import { Group } from "lucide-react";

// Modal de gestion des configurations
type ConfigurationModalProps = {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  availablesImages: ImageType[];
  availableConfigs: CalendarConfig[];
  currentConfig: CalendarConfig | null;
  onConfigChange: (config: CalendarConfig) => void;
  onSaveConfig: (config: Omit<CalendarConfig, 'id'>) => Promise<CalendarConfig | void> | CalendarConfig | void;
  onUpdateConfig: (config: CalendarConfig) => void;
  onDeleteConfig: (configId: number) => void;
  onDuplicateConfig: (config: CalendarConfig) => Promise<CalendarConfig | void> | CalendarConfig | void;
  editingConfig: CalendarConfig | null;
  setEditingConfig: (config: CalendarConfig | null) => void;
  isCreatingConfig: boolean;
  setIsCreatingConfig: (isCreating: boolean) => void;
};

const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  user,
  isOpen,
  onClose,
  availablesImages,
  availableConfigs,
  currentConfig,
  onConfigChange,
  onSaveConfig,
  onUpdateConfig,
  onDeleteConfig,
  onDuplicateConfig,
  editingConfig,
  setEditingConfig,
  isCreatingConfig,
  setIsCreatingConfig
}) => {
  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [configImage, setConfigImage] = useState<ImageType | undefined>(undefined);
  const [groupingLevel1, setGroupingLevel1] = useState<GroupingLevel | undefined>(undefined);
  const [groupingLevel2, setGroupingLevel2] = useState<GroupingLevel | undefined>(undefined);
  const [configFilters, setConfigFilters] = useState<Filter[]>([]);
  const [filterCategories, setFilterCategories] = useState<FilterCategories>({
    personnel: [],
    evenements: []
  });
  const [selectedRdvTypes, setSelectedRdvTypes] = useState<string[]>(['Chantier', 'Absence', 'Autre']);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setConfigName('');
    setConfigDescription('');
    setConfigImage(undefined);
    setGroupingLevel1(undefined);
    setGroupingLevel2(undefined);
    setConfigFilters([]);
    setFilterCategories({
      personnel: [],
      evenements: []
    });
    setSelectedRdvTypes(['Chantier', 'Absence', 'Autre']);
  };

  // Charger les données pour l'édition
  useEffect(() => {
    if (editingConfig) {
      setConfigName(editingConfig.LibellePlanningVue);
      setConfigDescription(editingConfig.DescriptionPlanningVue || '');
      setConfigImage(editingConfig.IdPlanningImage ? availablesImages.find(img => img.id === editingConfig.IdPlanningImage) : undefined);
      setGroupingLevel1(editingConfig.Group?.ChampsPremierGroupePlanningVue);
      setGroupingLevel2(editingConfig.Group?.ChampsDeuxiemeGroupePlanningVue);
      setFilterCategories(editingConfig.filterCategories || {
        personnel: [],
        evenements: {
          filters: [],
          selectedRdvTypes: ['Chantier', 'Absence', 'Autre']
        }
      });
      // Mettre à jour configFilters pour compatibilité
      const allFilters = [
        ...(editingConfig.filterCategories?.personnel || []),
        ...(typeof editingConfig.filterCategories?.evenements === 'object' && 'filters' in editingConfig.filterCategories.evenements 
          ? editingConfig.filterCategories.evenements.filters 
          : [])
      ];
      setConfigFilters(allFilters);
      setSelectedRdvTypes(
        (typeof editingConfig.filterCategories?.evenements === 'object' && 'selectedRdvTypes' in editingConfig.filterCategories.evenements
          ? editingConfig.filterCategories.evenements.selectedRdvTypes
          : ['Chantier', 'Absence', 'Autre'])
      );
    } else {
      resetForm();
    }
  }, [editingConfig]);

  const handleSave = async () => {
    if (!configName.trim()) return;

    const newConfig = {
      IdPlanningVue: editingConfig?.IdPlanningVue || 0,
      LibellePlanningVue: configName.trim(),
      DescriptionPlanningVue: configDescription.trim() || undefined,
      IdPlanningImage: configImage?.id,
      Group: (groupingLevel1 || groupingLevel2) ? {
        ChampsPremierGroupePlanningVue: groupingLevel1,
        ChampsDeuxiemeGroupePlanningVue: groupingLevel2
      } : undefined,
      filterCategories: {
        personnel: filterCategories.personnel,
        evenements: {
          filters: typeof filterCategories.evenements === 'object' && 'filters' in filterCategories.evenements 
            ? filterCategories.evenements.filters 
            : [],
          selectedRdvTypes: selectedRdvTypes
        }
      },
    };

    if (editingConfig) {
      // Si on modifie une configuration prédéfinie (ID <= 10), créer une nouvelle config personnalisée
      if (editingConfig.IdPlanningVue <= 10) {
        const savedConfig = await onSaveConfig(newConfig);
        if (savedConfig) onConfigChange(savedConfig as CalendarConfig);
      } else {
        // Sinon, mettre à jour la configuration existante
        onUpdateConfig({ ...editingConfig, ...newConfig });
      }
      setEditingConfig(null);
    } else {
      const savedConfig = await onSaveConfig(newConfig);
      if (savedConfig) onConfigChange(savedConfig as CalendarConfig);
    }

    resetForm();
    setIsCreatingConfig(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestion des configurations" className="px-4 py-4">
      <div className={`flex gap-6 poppins w-full mx-auto transition-all duration-300 ${
        (isCreatingConfig || editingConfig) ? 'max-w-6xl flex-row' : 'max-w-2xl flex-col'
      }`}>
        
        {/* Section principale - Liste des configurations */}
        <div className={`${(isCreatingConfig || editingConfig) ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-hide space-y-6">
        
        {/* Configuration actuelle */}
        <div className="bg-gradient-to-r from-primary-ultra-light to-primary-light p-4 rounded-xl border border-primary/20">
          <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            Configuration active
          </h3>
          
          {currentConfig ? (
            <div className="flex items-start gap-3">
              {currentConfig.IdPlanningImage && (
                <img 
                  src={availablesImages.find(img => img.id === currentConfig.IdPlanningImage)?.image || 'https://placehold.co/64x64/eeeeee/666666?text=No+Image'} 
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-primary mb-1">
                  {currentConfig.LibellePlanningVue}
                </p>
                {currentConfig.DescriptionPlanningVue && (
                  <p className="text-xs text-secondary mb-2">
                    {currentConfig.DescriptionPlanningVue}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {currentConfig.Group && (
                    <span className="text-xs bg-blue-50 px-2 py-1 rounded-full text-blue-600 font-medium">
                      {currentConfig.Group.ChampsPremierGroupePlanningVue && `Niv.1: ${currentConfig.Group.ChampsPremierGroupePlanningVue}`}
                      {currentConfig.Group.ChampsDeuxiemeGroupePlanningVue && ` | Niv.2: ${currentConfig.Group.ChampsDeuxiemeGroupePlanningVue}`}
                    </span>
                  )}
                  {currentConfig.filterCategories?.evenements && 
                   typeof currentConfig.filterCategories.evenements === 'object' &&
                   'selectedRdvTypes' in currentConfig.filterCategories.evenements &&
                   currentConfig.filterCategories.evenements.selectedRdvTypes.length < 3 && (
                    <span className="text-xs bg-purple-50 px-2 py-1 rounded-full text-purple-600 font-medium">
                      {currentConfig.filterCategories.evenements.selectedRdvTypes.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary">Aucune configuration sélectionnée</p>
          )}
        </div>

        {/* Liste des configurations */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="font-semibold text-primary text-lg">Configurations disponibles</h3>
            {user.role === 'admin' && (
              <button
                onClick={() => setIsCreatingConfig(true)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-dark transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Nouvelle configuration
              </button>
            )}
          </div>

          <div className="space-y-3">
            {availableConfigs.map((config) => (
              <div
                key={config.IdPlanningVue}
                className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                  currentConfig?.IdPlanningVue === config.IdPlanningVue 
                    ? 'border-primary bg-gradient-to-r from-primary-ultra-light to-primary-light shadow-lg' 
                    : 'border-ultra-light hover:border-primary/30 hover:bg-secondary-bg/50'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  {config.IdPlanningImage && (
                    <img 
                      src={availablesImages.find(img => img.id === config.IdPlanningImage)?.image || 'https://placehold.co/64x64/eeeeee/666666?text=No+Image'} 
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <button
                      onClick={() => onConfigChange(config)}
                      className="w-full text-left group"
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-primary group-hover:text-primary-dark transition-colors">
                          {config.LibellePlanningVue}
                        </span>
                        {currentConfig?.IdPlanningVue === config.IdPlanningVue && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        )}
                      </div>
                      {config.DescriptionPlanningVue && (
                        <p className="text-xs text-secondary mb-2">{config.DescriptionPlanningVue}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {config.Group && (
                          <span className="text-xs bg-blue-50 px-3 py-1 rounded-full text-blue-600 font-medium">
                            {config.Group.ChampsPremierGroupePlanningVue && `Niv.1: ${config.Group.ChampsPremierGroupePlanningVue}`}
                            {config.Group.ChampsDeuxiemeGroupePlanningVue && ` | Niv.2: ${config.Group.ChampsDeuxiemeGroupePlanningVue}`}
                          </span>
                        )}
                        {config.filterCategories && (
                          (() => {
                            const evenementsFiltersCount = !Array.isArray(config.filterCategories.evenements) 
                              ? config.filterCategories.evenements?.filters?.length || 0 
                              : 0;
                            const totalFilters = (config.filterCategories.personnel?.length || 0) + evenementsFiltersCount;
                            return totalFilters > 0 && (
                              <span className="text-xs bg-orange-50 px-3 py-1 rounded-full text-orange-600 font-medium">
                                {totalFilters} filtre{totalFilters > 1 ? 's' : ''}
                              </span>
                            );
                          })()
                        )}
                        {config.filterCategories?.evenements &&
                         typeof config.filterCategories.evenements === 'object' &&
                         'selectedRdvTypes' in config.filterCategories.evenements &&
                         config.filterCategories.evenements.selectedRdvTypes.length < 3 && (
                          <span className="text-xs bg-purple-50 px-2 py-1 rounded-full text-purple-600 font-medium">
                            {config.filterCategories.evenements.selectedRdvTypes.join(', ')}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingConfig(config)}
                    className="p-2 text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200"
                    title="Modifier"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={async () => {
                      const duplicated = await onDuplicateConfig(config);
                      if (duplicated) onConfigChange(duplicated as CalendarConfig);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Dupliquer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {config.IdPlanningVue > 10 && ( // Seules les configs personnalisées peuvent être supprimées
                    <button
                      onClick={() => onDeleteConfig(config.IdPlanningVue)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Supprimer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
        </div>

        {/* Section de droite - Formulaire de création/édition */}
        {(isCreatingConfig || editingConfig) && (
          <div className="w-1/2 border-l pl-6">
            <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
              <div className="sticky top-0 bg-primary-bg pb-4 border-b mb-6">
                <h3 className="font-semibold text-primary text-lg">
                  {editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration'}
                </h3>
              </div>
            
            <div className="space-y-4">
              {/* Nom de la configuration */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Nom de la configuration
                </label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="w-full px-3 py-2 border border-default rounded-lg focus:ring-primary focus:border-primary bg-transparent"
                  placeholder="Ex: Vue Technique par contrats"
                />
              </div>

              {/* Description de la configuration */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Description
                </label>
                <textarea
                  value={configDescription}
                  onChange={(e) => setConfigDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-default rounded-lg focus:ring-primary focus:border-primary bg-transparent"
                  placeholder="Description de la vue (optionnel)"
                  rows={3}
                />
              </div>

              {/* Image de la configuration (optionnel) */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Image de la vue (optionnel)
                </label>
                <div className="border-2 border-dashed border-default rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer">
                  {configImage ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={configImage.image} 
                          alt={"Image de la configuration"} 
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      </div>
                      <button
                        onClick={() => setConfigImage(undefined)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="text-secondary">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm">Cliquez pour sélectionner une image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Niveaux de groupement */}
              <div>
                <label className="block text-sm font-medium text-primary mb-3">
                  Niveaux de groupement
                </label>
                <div className="space-y-3 bg-secondary-bg p-4 rounded-lg">
                  {/* Niveau 1 */}
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">
                      Niveau 1
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newValue = groupingLevel1 === 'equipe' ? undefined : 'equipe';
                          setGroupingLevel1(newValue);
                          // Si on sélectionne le même que niveau 2, désélectionner niveau 2
                          if (newValue === groupingLevel2) {
                            setGroupingLevel2(undefined);
                          }
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          groupingLevel1 === 'equipe'
                            ? 'border-primary bg-primary-ultra-light text-primary'
                            : 'border-default bg-secondary-bg text-primary hover:border-light'
                        }`}
                      >
                        Équipe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newValue = groupingLevel1 === 'pole' ? undefined : 'pole';
                          setGroupingLevel1(newValue);
                          // Si on sélectionne le même que niveau 2, désélectionner niveau 2
                          if (newValue === groupingLevel2) {
                            setGroupingLevel2(undefined);
                          }
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          groupingLevel1 === 'pole'
                            ? 'border-primary bg-primary-ultra-light text-primary'
                            : 'border-default bg-secondary-bg text-primary hover:border-light'
                        }`}
                      >
                        Pôle
                      </button>
                    </div>
                  </div>

                  {/* Niveau 2 */}
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">
                      Niveau 2
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newValue = groupingLevel2 === 'equipe' ? undefined : 'equipe';
                          // Ne peut pas être le même que niveau 1
                          if (groupingLevel1 !== 'equipe') {
                            setGroupingLevel2(newValue);
                          }
                        }}
                        disabled={groupingLevel1 === 'equipe'}
                        className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          groupingLevel2 === 'equipe'
                            ? 'border-primary bg-primary-ultra-light text-primary'
                            : groupingLevel1 === 'equipe'
                            ? 'border-ultra-light bg-secondary-bg text-secondary cursor-not-allowed'
                            : 'border-default bg-secondary-bg text-primary hover:border-light'
                        }`}
                      >
                        Équipe
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newValue = groupingLevel2 === 'pole' ? undefined : 'pole';
                          // Ne peut pas être le même que niveau 1
                          if (groupingLevel1 !== 'pole') {
                            setGroupingLevel2(newValue);
                          }
                        }}
                        disabled={groupingLevel1 === 'pole'}
                        className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                          groupingLevel2 === 'pole'
                            ? 'border-primary bg-primary-ultra-light text-primary'
                            : groupingLevel1 === 'pole'
                            ? 'border-ultra-light bg-secondary-bg text-secondary cursor-not-allowed'
                            : 'border-default bg-secondary-bg text-primary hover:border-light'
                        }`}
                      >
                        Pôle
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-secondary mt-2">
                    Définissez comment regrouper les données dans la vue (seulement équipe et pôle). Les deux niveaux ne peuvent pas être identiques.
                  </p>
                </div>
              </div>

              {/* Section Filtres catégorisés */}
              <div>
                <label className="block text-sm font-medium text-primary mb-3">
                  Filtres
                </label>
                
                <div className="space-y-4">
                  {/* Filtres Personnel */}
                  <div className="border border-ultra-light rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-primary flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Filtres Personnel
                      </h4>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        {filterCategories.personnel.length} filtre{filterCategories.personnel.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mb-3">
                      Filtres appliqués au personnel (pôle, équipe, contrat, etc.)
                    </p>
                    
                    {filterCategories.personnel.length > 0 ? (
                      <div className="space-y-2">
                        {filterCategories.personnel.map((filter) => (
                          <div key={filter.value + filter.field} className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                            <button
                              onClick={() => {
                                setFilterCategories({
                                  ...filterCategories,
                                  personnel: filterCategories.personnel.filter(f => f.value !== filter.value || f.field !== filter.field)
                                });
                                setConfigFilters(configFilters.filter(f => f.value !== filter.value || f.field !== filter.field));
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 bg-secondary-bg rounded-lg">
                        <p className="text-sm text-secondary">Aucun filtre personnel</p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        // Logique pour ajouter un filtre personnel
                        const newFilter: Filter = {
                          field: 'pole',
                          type: 'equals',
                          value: '',
                        };
                        setFilterCategories({
                          ...filterCategories,
                          personnel: [...filterCategories.personnel, newFilter]
                        });
                        setConfigFilters([...configFilters, newFilter]);
                      }}
                      className="mt-3 w-full px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium transition-colors"
                    >
                      + Ajouter un filtre personnel
                    </button>
                  </div>

                  {/* Filtres Événements */}
                  <div className="border border-ultra-light rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-primary flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Filtres Événements
                      </h4>
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded-full">
                        {selectedRdvTypes.length} type{selectedRdvTypes.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mb-3">
                      Types d'événements à afficher dans cette vue
                    </p>
                    
                    {/* Types de RDV sous forme de checkboxes */}
                    <div className="space-y-2 mb-3">
                      {/* Chantier */}
                      <div className="flex items-center space-x-3 p-2 border border-ultra-light rounded-lg hover:bg-primary-ultra-light/30 transition-colors">
                        <input
                          type="checkbox"
                          id="rdv-chantier"
                          checked={selectedRdvTypes.includes('Chantier')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRdvTypes([...selectedRdvTypes, 'Chantier']);
                            } else {
                              setSelectedRdvTypes(selectedRdvTypes.filter(type => type !== 'Chantier'));
                            }
                          }}
                          className="h-4 w-4 text-primary focus:ring-primary border-default rounded"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="w-6 h-6 bg-[#FF6B6B] rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <label htmlFor="rdv-chantier" className="text-sm font-medium text-primary cursor-pointer">
                            Chantiers
                          </label>
                        </div>
                      </div>

                      {/* Absence */}
                      <div className="flex items-center space-x-3 p-2 border border-ultra-light rounded-lg hover:bg-primary-ultra-light/30 transition-colors">
                        <input
                          type="checkbox"
                          id="rdv-absence"
                          checked={selectedRdvTypes.includes('Absence')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRdvTypes([...selectedRdvTypes, 'Absence']);
                            } else {
                              setSelectedRdvTypes(selectedRdvTypes.filter(type => type !== 'Absence'));
                            }
                          }}
                          className="h-4 w-4 text-primary focus:ring-primary border-default rounded"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="w-6 h-6 bg-[#FFC107] rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <label htmlFor="rdv-absence" className="text-sm font-medium text-primary cursor-pointer">
                            Absences / Social
                          </label>
                        </div>
                      </div>

                      {/* Autre */}
                      <div className="flex items-center space-x-3 p-2 border border-ultra-light rounded-lg hover:bg-primary-ultra-light/30 transition-colors">
                        <input
                          type="checkbox"
                          id="rdv-autre"
                          checked={selectedRdvTypes.includes('Autre')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRdvTypes([...selectedRdvTypes, 'Autre']);
                            } else {
                              setSelectedRdvTypes(selectedRdvTypes.filter(type => type !== 'Autre'));
                            }
                          }}
                          className="h-4 w-4 text-primary focus:ring-primary border-default rounded"
                        />
                        <div className="flex items-center space-x-2 flex-1">
                          <div className="w-6 h-6 bg-[#6C5CE7] rounded flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <label htmlFor="rdv-autre" className="text-sm font-medium text-primary cursor-pointer">
                            Autres événements
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Autres filtres événements personnalisés */}
                    {!Array.isArray(filterCategories.evenements) && filterCategories.evenements.filters.length > 0 && (
                      <>  <hr className="my-3" />
                        <p className="text-xs text-secondary mb-2 font-medium">Filtres personnalisés</p>
                        <div className="space-y-2">
                          {filterCategories.evenements.filters.map((filter, index) => (
                            <div key={index} className="flex items-center justify-between bg-primary-ultra-light p-2 rounded-lg">
                              <span className="text-sm text-primary">{filter.field}: {filter.value}</span>
                              <button
                                onClick={() => {
                                  if (!Array.isArray(filterCategories.evenements)) {
                                    setFilterCategories({
                                      ...filterCategories,
                                      evenements: {
                                        ...filterCategories.evenements,
                                        filters: filterCategories.evenements.filters.filter((_, i) => i !== index)
                                      }
                                    });
                                  }
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    
                    <button
                      onClick={() => {
                        // Logique pour ajouter un filtre événement
                        const newFilter: Filter = {
                          field: 'type',
                          type: 'equals',
                          value: 'chantier'
                        };
                        if (!Array.isArray(filterCategories.evenements)) {
                          setFilterCategories({
                            ...filterCategories,
                            evenements: {
                              ...filterCategories.evenements,
                              filters: [...filterCategories.evenements.filters, newFilter]
                            }
                          });
                        }
                      }}
                      className="mt-3 w-full px-3 py-2 border border-purple-300 text-purple-600 rounded-lg hover:bg-purple-50 text-sm font-medium transition-colors"
                    >
                      + Ajouter un filtre personnalisé
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsCreatingConfig(false);
                  setEditingConfig(null);
                  resetForm();
                }}
                className="px-4 py-2 text-secondary hover:text-primary font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!configName.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingConfig ? 'Modifier' : 'Créer'}
              </button>
            </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};


export default memo(ConfigurationModal);