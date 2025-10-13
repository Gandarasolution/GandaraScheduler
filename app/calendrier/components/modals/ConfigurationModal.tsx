
import { memo, useEffect, useState } from "react";
import { CalendarConfig, DimensionType, Filter } from "../../types";
import Modal from "./Modal";

// Modal de gestion des configurations
type ConfigurationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  availableConfigs: CalendarConfig[];
  currentConfig: CalendarConfig | null;
  onConfigChange: (config: CalendarConfig) => void;
  onSaveConfig: (config: Omit<CalendarConfig, 'id'>) => CalendarConfig;
  onUpdateConfig: (config: CalendarConfig) => void;
  onDeleteConfig: (configId: number) => void;
  onDuplicateConfig: (config: CalendarConfig) => CalendarConfig;
  editingConfig: CalendarConfig | null;
  setEditingConfig: (config: CalendarConfig | null) => void;
  isCreatingConfig: boolean;
  setIsCreatingConfig: (isCreating: boolean) => void;
};

const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  isOpen,
  onClose,
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
  const [selectedDimension, setSelectedDimension] = useState<DimensionType>('employee');
  const [configFilters, setConfigFilters] = useState<Filter[]>([]);
  const [selectedRdvTypes, setSelectedRdvTypes] = useState<string[]>(['Chantier', 'Absence', 'Autre']);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setConfigName('');
    setSelectedDimension('employee');
    setConfigFilters([]);
    setSelectedRdvTypes(['Chantier', 'Absence', 'Autre']);
  };

  // Charger les données pour l'édition
  useEffect(() => {
    if (editingConfig) {
      setConfigName(editingConfig.name);
      setSelectedDimension(editingConfig.dimension);
      setConfigFilters(editingConfig.filters);
      setSelectedRdvTypes(editingConfig.selectedRdvTypes || ['Chantier', 'Absence', 'Autre']);
    } else {
      resetForm();
    }
  }, [editingConfig]);

  const handleSave = () => {
    if (!configName.trim()) return;

    const newConfig = {
      name: configName.trim(),
      dimension: selectedDimension,
      filters: configFilters,
      selectedRdvTypes: selectedRdvTypes
    };

    if (editingConfig) {
      // Si on modifie une configuration prédéfinie (ID <= 10), créer une nouvelle config personnalisée
      if (editingConfig.id <= 10) {
        const savedConfig = onSaveConfig(newConfig);
        onConfigChange(savedConfig);
      } else {
        // Sinon, mettre à jour la configuration existante
        onUpdateConfig({ ...editingConfig, ...newConfig });
      }
      setEditingConfig(null);
    } else {
      const savedConfig = onSaveConfig(newConfig);
      onConfigChange(savedConfig);
    }

    resetForm();
    setIsCreatingConfig(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestion des configurations">
      <div className={`flex gap-6 poppins w-full mx-auto transition-all duration-300 ${
        (isCreatingConfig || editingConfig) ? 'max-w-6xl flex-row' : 'max-w-2xl flex-col'
      }`}>
        
        {/* Section principale - Liste des configurations */}
        <div className={`${(isCreatingConfig || editingConfig) ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          <div className="max-h-[70vh] overflow-y-auto scrollbar-hide space-y-6">
        
        {/* Configuration actuelle */}
        <div className="bg-gradient-to-r from-[#e7f4f2] to-[#f0f9f7] p-4 rounded-xl border border-[#009580]/20">
          <h3 className="font-semibold text-[#16302C] mb-2 flex items-center gap-2">
            <div className="w-5 h-5 bg-[#009580] rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            Configuration active
          </h3>
          <p className="text-sm text-[#16302C]/70">
            {currentConfig ? currentConfig.name : 'Aucune configuration sélectionnée'}
          </p>
          {currentConfig && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-[#009580]/10 px-2 py-1 rounded-full text-[#009580] font-medium">
                {currentConfig.dimension}
              </span>
              {currentConfig.selectedRdvTypes && currentConfig.selectedRdvTypes.length < 3 && (
                <span className="text-xs bg-blue-50 px-2 py-1 rounded-full text-blue-600 font-medium">
                  {currentConfig.selectedRdvTypes.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Liste des configurations */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <h3 className="font-semibold text-[#16302C] text-lg">Configurations disponibles</h3>
            <button
              onClick={() => setIsCreatingConfig(true)}
              className="px-4 py-2 bg-[#009580] text-white rounded-xl text-sm hover:bg-[#007a6b] transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nouvelle configuration
            </button>
          </div>

          <div className="space-y-3">
            {availableConfigs.map((config) => (
              <div
                key={config.id}
                className={`p-4 border-2 rounded-xl transition-all duration-200 ${
                  currentConfig?.id === config.id 
                    ? 'border-[#009580] bg-gradient-to-r from-[#e7f4f2] to-[#f0f9f7] shadow-lg' 
                    : 'border-gray-200 hover:border-[#009580]/30 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => onConfigChange(config)}
                      className="flex-1 text-left group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-[#16302C] group-hover:text-[#009580] transition-colors">
                          {config.name}
                        </span>
                        {currentConfig?.id === config.id && (
                          <div className="w-2 h-2 bg-[#009580] rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600 font-medium">
                          {config.dimension === 'employee' ? 'Par employé' :
                           config.dimension === 'group' ? 'Par équipe' :
                           config.dimension === 'pole' ? 'Par pôle' :
                           config.dimension === 'contract' ? 'Par type de contrat' :
                           config.dimension === 'type' ? 'Par type de contrat' : config.dimension}
                        </span>
                        {config.filters.length > 0 && (
                          <span className="text-xs bg-blue-50 px-3 py-1 rounded-full text-blue-600 font-medium">
                            {config.filters.length} filtre{config.filters.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {config.selectedRdvTypes && config.selectedRdvTypes.length < 3 && (
                          <span className="text-xs bg-purple-50 px-3 py-1 rounded-full text-purple-600 font-medium">
                            {config.selectedRdvTypes.join(', ')}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingConfig(config)}
                    className="p-2 text-gray-400 hover:text-[#009580] hover:bg-[#009580]/10 rounded-lg transition-all duration-200"
                    title="Modifier"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => onDuplicateConfig(config)}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Dupliquer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>

                  {config.id > 10 && ( // Seules les configs personnalisées peuvent être supprimées
                    <button
                      onClick={() => onDeleteConfig(config.id)}
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
              <div className="sticky top-0 bg-white pb-4 border-b mb-6">
                <h3 className="font-semibold text-[#16302C] text-lg">
                  {editingConfig ? 'Modifier la configuration' : 'Nouvelle configuration'}
                </h3>
              </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la configuration
                </label>
                <input
                  type="text"
                  value={configName}
                  onChange={(e) => setConfigName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-[#009580] focus:border-[#009580]"
                  placeholder="Ex: Vue Technique par contrats"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Organisation d'affichage
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Par employé */}
                  <div 
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDimension === 'employee' 
                        ? 'border-[#009580] bg-[#e7f4f2]' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDimension('employee')}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="dim-employee"
                        name="dimension"
                        checked={selectedDimension === 'employee'}
                        onChange={() => setSelectedDimension('employee')}
                        className="text-[#009580] focus:ring-[#009580]"
                      />
                      <div>
                        <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <label htmlFor="dim-employee" className="font-medium text-gray-900 cursor-pointer">
                          Par employé
                        </label>
                        <p className="text-xs text-gray-500">Vue individuelle</p>
                      </div>
                    </div>
                  </div>

                  {/* Par équipe */}
                  <div 
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDimension === 'group' 
                        ? 'border-[#009580] bg-[#e7f4f2]' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDimension('group')}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="dim-group"
                        name="dimension"
                        checked={selectedDimension === 'group'}
                        onChange={() => setSelectedDimension('group')}
                        className="text-[#009580] focus:ring-[#009580]"
                      />
                      <div>
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <label htmlFor="dim-group" className="font-medium text-gray-900 cursor-pointer">
                          Par équipe
                        </label>
                        <p className="text-xs text-gray-500">Vue collective</p>
                      </div>
                    </div>
                  </div>

                  {/* Par pôle */}
                  <div 
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDimension === 'pole' 
                        ? 'border-[#009580] bg-[#e7f4f2]' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDimension('pole')}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="dim-pole"
                        name="dimension"
                        checked={selectedDimension === 'pole'}
                        onChange={() => setSelectedDimension('pole')}
                        className="text-[#009580] focus:ring-[#009580]"
                      />
                      <div>
                        <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <label htmlFor="dim-pole" className="font-medium text-gray-900 cursor-pointer">
                          Par pôle
                        </label>
                        <p className="text-xs text-gray-500">Vue département</p>
                      </div>
                    </div>
                  </div>

                  {/* Par contrat */}
                  <div 
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedDimension === 'contract' 
                        ? 'border-[#009580] bg-[#e7f4f2]' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDimension('contract')}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="dim-contract"
                        name="dimension"
                        checked={selectedDimension === 'contract'}
                        onChange={() => setSelectedDimension('contract')}
                        className="text-[#009580] focus:ring-[#009580]"
                      />
                      <div>
                        <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <label htmlFor="dim-contract" className="font-medium text-gray-900 cursor-pointer">
                          Par contrat
                        </label>
                        <p className="text-xs text-gray-500">Employé/Intérim</p>
                      </div>
                    </div>
                  </div>

                  {/* Par type de contrat */}
                  <div 
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all col-span-2 ${
                      selectedDimension === 'type' 
                        ? 'border-[#009580] bg-[#e7f4f2]' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedDimension('type')}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        id="dim-type"
                        name="dimension"
                        checked={selectedDimension === 'type'}
                        onChange={() => setSelectedDimension('type')}
                        className="text-[#009580] focus:ring-[#009580]"
                      />
                      <div>
                        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mb-1">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <label htmlFor="dim-type" className="font-medium text-gray-900 cursor-pointer">
                          Par type de contrat
                        </label>
                        <p className="text-xs text-gray-500">Classification par type de contrat (Employé/Intérim)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Types de rendez-vous à afficher
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-center p-4 border border-gray-200 rounded-lg">
                    <span className="text-sm text-gray-500">Choisissez les types de RDV à inclure dans cette vue</span>
                  </div>

                  {/* Type Chantier */}
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id="type-chantier"
                      checked={selectedRdvTypes.includes('Chantier')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRdvTypes([...selectedRdvTypes, 'Chantier']);
                        } else {
                          setSelectedRdvTypes(selectedRdvTypes.filter(type => type !== 'Chantier'));
                        }
                      }}
                      className="h-4 w-4 text-[#009580] focus:ring-[#009580] border-gray-300 rounded"
                    />
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#FF6B6B] rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        <label htmlFor="type-chantier" className="font-medium text-gray-900 cursor-pointer">
                          Chantiers
                        </label>
                        <p className="text-sm text-gray-500">Projets de construction et travaux</p>
                      </div>
                    </div>
                  </div>

                  {/* Type Absence */}
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id="type-absence"
                      checked={selectedRdvTypes.includes('Absence')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRdvTypes([...selectedRdvTypes, 'Absence']);
                        } else {
                          setSelectedRdvTypes(selectedRdvTypes.filter(type => type !== 'Absence'));
                        }
                      }}
                      className="h-4 w-4 text-[#009580] focus:ring-[#009580] border-gray-300 rounded"
                    />
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#FFC107] rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <label htmlFor="type-absence" className="font-medium text-gray-900 cursor-pointer">
                          Absences
                        </label>
                        <p className="text-sm text-gray-500">Congés, formation, arrêts maladie</p>
                      </div>
                    </div>
                  </div>

                  {/* Type Autre */}
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id="type-autre"
                      checked={selectedRdvTypes.includes('Autre')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRdvTypes([...selectedRdvTypes, 'Autre']);
                        } else {
                          setSelectedRdvTypes(selectedRdvTypes.filter(type => type !== 'Autre'));
                        }
                      }}
                      className="h-4 w-4 text-[#009580] focus:ring-[#009580] border-gray-300 rounded"
                    />
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-[#6C5CE7] rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <label htmlFor="type-autre" className="font-medium text-gray-900 cursor-pointer">
                          Autres événements
                        </label>
                        <p className="text-sm text-gray-500">Réunions, formations, événements divers</p>
                      </div>
                    </div>
                  </div>

                  {/* Bouton Tout sélectionner/désélectionner */}
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => {
                        const allTypesSelected = configFilters.filter(f => f.field === 'type').length === 3;
                        if (allTypesSelected) {
                          // Tout désélectionner
                          setConfigFilters(configFilters.filter(f => f.field !== 'type'));
                        } else {
                          // Tout sélectionner
                          const typeFilters = configFilters.filter(f => f.field !== 'type');
                          const newFilters: Filter[] = [
                            {
                              id: `filter-chantier-${Date.now()}`,
                              field: 'type',
                              type: 'equals',
                              value: 'Chantier',
                              label: 'Chantiers'
                            },
                            {
                              id: `filter-absence-${Date.now() + 1}`,
                              field: 'type',
                              type: 'equals',
                              value: 'Absence',
                              label: 'Absences'
                            },
                            {
                              id: `filter-autre-${Date.now() + 2}`,
                              field: 'type',
                              type: 'equals',
                              value: 'Autre',
                              label: 'Autres événements'
                            }
                          ];
                          setConfigFilters([...typeFilters, ...newFilters]);
                        }
                      }}
                      className="text-sm text-[#009580] hover:text-[#007a6b] font-medium"
                    >
                      {configFilters.filter(f => f.field === 'type').length === 3 ? 'Tout désélectionner' : 'Tout sélectionner'}
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
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!configName.trim()}
                className="px-4 py-2 bg-[#009580] text-white rounded-lg hover:bg-[#007a6b] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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