import { memo, useEffect, useState } from "react";
import { CalendarConfig, ImageType, GroupingLevel, User } from "../../types";
import Modal from "./Modal";
import { calendarConfigService } from "@/app/service";
import { useAuth } from "../../hooks/utils/AuthContext";

// Modal de gestion des configurations
type ConfigurationModalProps = {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  availablesImages: ImageType[];
  availableConfigs: CalendarConfig[];
  currentConfig: CalendarConfig | null;
  onConfigChange: (config: CalendarConfig) => void;
  onSaveConfig: (config: { planningVue: any; filtrePerso: any }) => Promise<{error: number, data: any} | {error: number, message: string} | void> | void;
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
  onDeleteConfig,
  onDuplicateConfig,
  editingConfig,
  setEditingConfig,
  isCreatingConfig,
  setIsCreatingConfig
}) => {
  const { hasPermission } = useAuth();

  const [configName, setConfigName] = useState('');
  const [configDescription, setConfigDescription] = useState('');
  const [configImage, setConfigImage] = useState<ImageType | undefined>(undefined);
  const [groupingLevel1, setGroupingLevel1] = useState<GroupingLevel | undefined>(undefined);
  const [groupingLevel2, setGroupingLevel2] = useState<GroupingLevel | undefined>(undefined);
  
  // Nouveaux états pour la gestion API
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [filtresPerso, setFiltresPerso] = useState<
  {
    IdFiltre: number; 
    LibelleFiltre: string; 
    EstFiltreGandara: boolean; 
    Valeurs: {Selection: number; Id: string, Nom: string}[] | [];
    isDeleted?: boolean;
  }[]>([]);

  const [editingFilterId, setEditingFilterId] = useState<number | null>(null);
  const [isAddingFilter, setIsAddingFilter] = useState(false);

  const [selectedRdvTypes, setSelectedRdvTypes] = useState<string[]>(['Chantier', 'Absence', 'Perso']);

  // Dérivation des filtres actifs et disponibles
  const activeFilters = filtresPerso.filter(f => Array.isArray(f.Valeurs) && f.Valeurs.some(v => v.Selection === 1));
  const availableFilters = filtresPerso.filter(f => !Array.isArray(f.Valeurs) || !f.Valeurs.some(v => v.Selection === 1));

  // Réinitialiser le formulaire
  const resetForm = () => {
    setConfigName('');
    setConfigDescription('');
    setConfigImage(undefined);
    setGroupingLevel1(undefined);
    setGroupingLevel2(undefined);
    setFiltresPerso([]);
    setEditingFilterId(null);
    setIsAddingFilter(false);
    setSelectedRdvTypes(['Chantier', 'Absence', 'Perso']);
    setSaveError(null);
  };

  // Vider complètement un filtre de ses valeurs sélectionnées
  const handleRemoveFilter = (e: React.MouseEvent, idFiltre: number) => {
    e.stopPropagation();
    setFiltresPerso(prev => prev.map(f => {
      if (f.IdFiltre === idFiltre) {
        return {
          ...f,
          Valeurs: f.Valeurs.map((v: any) => ({ ...v, Selection: 0 })),
          isDeleted: true
        };
      }
      return f;
    }));
    
    // Si on était en train de l'éditer, on referme l'édition
    if (editingFilterId === idFiltre) {
      setEditingFilterId(null);
    }
  };

  // Charger les données pour l'édition OU LA CRÉATION via API
  useEffect(() => {
    if (editingConfig || isCreatingConfig) {
      setIsLoadingForm(true);
      setSaveError(null);

      // On utilise 0 comme ID pour récupérer le squelette des filtres lors d'une création
      const fetchId = editingConfig ? editingConfig.IdPlanningVue : 0;

      if (editingConfig) {
        calendarConfigService.lockCalendarConfig(fetchId).then((response) => {
          if (response?.error !== 0) {
            console.error('Erreur lors du verrouillage de la configuration :', response?.message);
          }
        }).catch(console.error);
      }

      // Récupération des données de la vue depuis l'API
      calendarConfigService.getVueDetails(fetchId)
        .then((response: any) => {
          const apiData = response.data || response;
          const { planningVue, filtrePerso } = apiData;

          // Si on est en mode édition, on peuple les champs avec les données existantes
          if (planningVue) {
            setConfigName(planningVue.LibellePlanningVue || '');
            setConfigDescription(planningVue.DescriptionPlanningVue || '');
            setConfigImage(
              planningVue.IdPlanningImage 
                ? availablesImages.find(img => img.id === planningVue.IdPlanningImage) 
                : undefined
            );
            
            if (planningVue.Group) {
              setGroupingLevel1(planningVue.Group.ChampsPremierGroupePlanningVue);
              setGroupingLevel2(planningVue.Group.ChampsDeuxiemeGroupePlanningVue);
            }

            const types = [];
            if (planningVue.chantierEvenement) types.push('Chantier');
            if (planningVue.paieEvenement) types.push('Absence'); 
            if (planningVue.persoEvenement) types.push('Perso');
            setSelectedRdvTypes(types.length > 0 ? types : ['Chantier', 'Absence', 'Perso']);
          }

          // Initialisation des filtres disponibles (édition et création)
          if (filtrePerso) {
            const normalizedFiltres = filtrePerso.map((fp: any) => ({
              ...fp,
              LibelleFiltre: fp.LibelleFiltre || fp.NomFiltre || fp.Nom,
              Valeurs: fp.Valeurs || fp.Valeur || []
            }));
            
            // Si c'est une création, on force la sélection à 0 pour s'assurer d'avoir un canevas vierge
            if (isCreatingConfig) {
              normalizedFiltres.forEach((f: any) => {
                if (Array.isArray(f.Valeurs)) {
                  f.Valeurs.forEach((v: any) => v.Selection = 0);
                }
              });
            }
            setFiltresPerso(normalizedFiltres);
          }

          setIsLoadingForm(false);
        })
        .catch((error: any) => {
          console.error('Erreur lors de la récupération des détails de la vue :', error);
          setIsLoadingForm(false);
        });
        
    } else {
      resetForm();
    }
  }, [editingConfig, isCreatingConfig, availablesImages]);

  const handleSave = async () => {
    if (!configName.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    const planningVue = {
      IdPlanningVue: editingConfig?.IdPlanningVue || 0,
      LibellePlanningVue: configName.trim(),
      DescriptionPlanningVue: configDescription.trim() || undefined,
      IdPlanningImage: configImage?.id,
      Group: (groupingLevel1 || groupingLevel2) ? {
        ChampsPremierGroupePlanningVue: groupingLevel1,
        ChampsDeuxiemeGroupePlanningVue: groupingLevel2
      } : undefined,
      chantierEvenement: selectedRdvTypes.includes('Chantier'),
      paieEvenement: selectedRdvTypes.includes('Absence'),
      persoEvenement: selectedRdvTypes.includes('Perso'),
    };


    const filtre = filtresPerso
      .filter(f => Array.isArray(f.Valeurs) && (f.Valeurs.some(v => v.Selection === 1) || f.isDeleted))
      .map(f => {
        const valeursSelectionnees = f.Valeurs
          .filter(v => v.Selection === 1)
          .map(v => v.Id);

        return {
        'IdFiltre': f.IdFiltre,
        'EstFiltreGandara': f.EstFiltreGandara,
        'Valeurs': f.isDeleted ? null : valeursSelectionnees
        };
      });
    try {
      const response = await onSaveConfig({ planningVue, filtrePerso: filtre });
      
      // Gestion de l'erreur explicite renvoyée par le backend
      if (response && response.error === 1) {
        setSaveError((response as any).message || "Une erreur s'est produite lors de l'enregistrement de la vue.");
        setIsSaving(false);
        return; 
      }

      resetForm();
      setIsCreatingConfig(false);
      setEditingConfig(null);
    } catch (error) {
      setSaveError("Erreur réseau ou erreur inattendue lors de la sauvegarde.");
      console.error("Erreur de sauvegarde:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gestion des configurations" className="px-4 py-4">
      <div className={`flex gap-6 poppins w-full mx-auto transition-all duration-300 ${
        (isCreatingConfig || editingConfig) ? 'max-w-6xl flex-row' : 'max-w-2xl flex-col'
      }`}>
        
        {/* Section principale - Liste des configurations */}
        <div className={`${(isCreatingConfig || editingConfig) ? 'w-1/2' : 'w-full'} transition-all duration-300`}>
          <div className="max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pr-2 space-y-6">
        
        {/* Configuration actuelle */}
        <div className="bg-gradient-to-br from-primary-ultra-light/50 to-primary-light/50 p-5 rounded-2xl border border-primary/20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <h3 className="font-semibold text-primary mb-3 flex items-center gap-2 relative z-10">
            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
              </svg>
            </div>
            Vue active
          </h3>
          
          {currentConfig ? (
            <div className="flex items-start gap-4 relative z-10">
              {currentConfig.IdPlanningImage && (
                <div className="relative">
                  <img 
                    src={availablesImages.find(img => img.id === currentConfig.IdPlanningImage)?.image || 'https://placehold.co/64x64/eeeeee/666666?text=No+Image'} 
                    className="w-16 h-16 object-cover rounded-xl shadow-sm flex-shrink-0 border border-white"
                    alt="Config image"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
              )}
              <div className="flex-1">
                <p className="text-base font-bold text-primary mb-1 flex items-center gap-2">
                  {currentConfig.LibellePlanningVue}
                  {currentConfig.isLocked && (
                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-red-100 text-red-600 shadow-sm">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                      Verrouillé
                    </span>
                  )}
                </p>
                {currentConfig.DescriptionPlanningVue && (
                  <p className="text-sm text-secondary/80 mb-3 line-clamp-2">
                    {currentConfig.DescriptionPlanningVue}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {currentConfig.Group && (
                    <span className="text-xs bg-white text-primary px-2.5 py-1 rounded-md shadow-sm border border-primary/10 font-medium">
                      {currentConfig.Group.ChampsPremierGroupePlanningVue && `Niv.1: ${currentConfig.Group.ChampsPremierGroupePlanningVue}`}
                      {currentConfig.Group.ChampsDeuxiemeGroupePlanningVue && ` | Niv.2: ${currentConfig.Group.ChampsDeuxiemeGroupePlanningVue}`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary italic">Aucune configuration sélectionnée</p>
          )}
        </div>

        {/* Liste des configurations */}
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 sticky top-0 backdrop-blur-md py-2 z-10">
            <h3 className="font-semibold text-primary text-lg">Vues disponibles</h3>
            {hasPermission(23) && (
              <button
                onClick={() => {
                  setEditingConfig(null);
                  setIsCreatingConfig(true);
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-sm hover:bg-primary-dark transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Nouvelle vue
              </button>
            )}
          </div>

          <div className="space-y-3 pb-4">
            {availableConfigs.map((config: CalendarConfig) => (
              <div
                key={config.IdPlanningVue}
                className={`p-4 rounded-xl border transition-all duration-200 group ${
                  currentConfig?.IdPlanningVue === config.IdPlanningVue 
                    ? 'border-primary bg-primary-ultra-light/20 shadow-md ring-1 ring-primary/20' 
                    : config.isLocked 
                      ? 'border-red-100 bg-red-50/30 opacity-75'
                      : 'border-ultra-light hover:border-primary/40 hover:bg-secondary-bg/30 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-4 mb-2">
                  {config.IdPlanningImage && (
                    <img 
                      src={availablesImages.find(img => img.id === config.IdPlanningImage)?.image || 'https://placehold.co/64x64/eeeeee/666666?text=No+Image'} 
                      className="w-12 h-12 object-cover rounded-lg flex-shrink-0 border border-gray-100"
                      alt="Config image"
                    />
                  )}
                  <div className="flex-1">
                    <button
                      onClick={() => onConfigChange(config)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-primary group-hover:text-primary-dark transition-colors">
                          {config.LibellePlanningVue}
                        </span>
                        {currentConfig?.IdPlanningVue === config.IdPlanningVue && (
                          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-sm"></div>
                        )}
                        {config.isLocked && (
                          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
                          </span>
                        )}
                      </div>
                      {config.DescriptionPlanningVue && (
                        <p className="text-xs text-secondary/70 line-clamp-1 mb-2">{config.DescriptionPlanningVue}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {config.Group && (
                          <span className="text-[11px] bg-secondary-bg px-2 py-0.5 rounded border border-ultra-light text-secondary font-medium">
                            {config.Group.ChampsPremierGroupePlanningVue && `Niv.1: ${config.Group.ChampsPremierGroupePlanningVue}`}
                            {config.Group.ChampsDeuxiemeGroupePlanningVue && ` | Niv.2: ${config.Group.ChampsDeuxiemeGroupePlanningVue}`}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 mt-2 border-t border-ultra-light/50 pt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      if (!config.isLocked) {
                        setIsCreatingConfig(false);
                        setEditingConfig(config);
                      }
                    }}
                    disabled={config.isLocked}
                    className={`p-1.5 rounded-md transition-all duration-200 ${
                      config.isLocked ? 'text-red-300 cursor-not-allowed' : 'text-secondary hover:text-primary hover:bg-primary-ultra-light'
                    }`}
                    title={config.isLocked ? "Verrouillé" : "Modifier"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  
                  <button
                    onClick={async () => {
                      const duplicated = await onDuplicateConfig(config);
                      if (duplicated) onConfigChange(duplicated as CalendarConfig);
                    }}
                    className="p-1.5 text-secondary hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all duration-200"
                    title="Dupliquer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </button>

                  {config.IdPlanningVue > 10 && (
                    <button
                      onClick={() => {
                        if (!config.isLocked) onDeleteConfig(config.IdPlanningVue);
                      }}
                      disabled={config.isLocked}
                      className={`p-1.5 rounded-md transition-all duration-200 ${
                        config.isLocked ? 'text-red-300 cursor-not-allowed' : 'text-secondary hover:text-red-500 hover:bg-red-50'
                      }`}
                      title="Supprimer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
          <div className="w-1/2 border-l border-ultra-light pl-6">
            <div className="max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pr-2 relative">
              <div className="sticky top-0 backdrop-blur-md pb-4 border-b border-ultra-light mb-6 z-20">
                <h3 className="font-bold text-primary text-xl flex items-center gap-2 pt-2">
                  {editingConfig ? (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> Modifier la vue</>
                  ) : (
                    <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg> Nouvelle vue</>
                  )}
                </h3>
              </div>
            
            {/* Loading Overlay */}
            {isLoadingForm ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-5">
                <div className="relative w-12 h-12">
                   <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                   <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-primary font-medium animate-pulse">Chargement des données...</p>
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                
                {saveError && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200 shadow-sm flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span className="font-medium">{saveError}</span>
                  </div>
                )}

                {/* Nom & Description */}
                <div className="space-y-4 bg-secondary-bg/30 p-5 rounded-2xl border border-ultra-light/50">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-1.5">Nom de la configuration <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={configName}
                      onChange={(e) => setConfigName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
                      placeholder="Ex: Vue Technique par contrats"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-1.5">Description</label>
                    <textarea
                      value={configDescription}
                      onChange={(e) => setConfigDescription(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
                      placeholder="Donnez un contexte à cette vue..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Image & Groupement */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Image */}
                  <div className="bg-secondary-bg/30 p-5 rounded-2xl border border-ultra-light/50 flex flex-col">
                    <label className="block text-sm font-semibold text-primary mb-3">Icône de la vue</label>
                    <div className="flex-1 border-2 border-dashed border-gray-300 bg-white rounded-xl p-3 flex flex-col items-center justify-center hover:border-primary hover:bg-primary-ultra-light/20 transition-all cursor-pointer group">
                      {configImage ? (
                        <div className="flex items-center gap-3 w-full justify-between">
                          <img src={configImage.image} alt="Config" className="w-10 h-10 object-cover rounded-lg shadow-sm" />
                          <button onClick={(e) => { e.stopPropagation(); setConfigImage(undefined); }} className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="text-secondary/70 flex flex-col items-center">
                          <svg className="w-6 h-6 mb-1 text-gray-400 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <span className="text-xs font-medium">Choisir</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Niveaux de groupement */}
                  <div className="bg-secondary-bg/30 p-5 rounded-2xl border border-ultra-light/50">
                    <label className="block text-sm font-semibold text-primary mb-3">Arborescence</label>
                    
                    <div className="space-y-3">
                      <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-secondary my-auto px-2 w-14">Niv 1</span>
                        <button
                          type="button"
                          onClick={() => {
                            const val = groupingLevel1 === 'equipe' ? undefined : 'equipe';
                            setGroupingLevel1(val);
                            if (val === groupingLevel2) setGroupingLevel2(undefined);
                          }}
                          className={`flex-1 py-1 text-xs rounded-md font-medium transition-all ${groupingLevel1 === 'equipe' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:bg-gray-50'}`}
                        >Équipe</button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = groupingLevel1 === 'pole' ? undefined : 'pole';
                            setGroupingLevel1(val);
                            if (val === groupingLevel2) setGroupingLevel2(undefined);
                          }}
                          className={`flex-1 py-1 text-xs rounded-md font-medium transition-all ${groupingLevel1 === 'pole' ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:bg-gray-50'}`}
                        >Pôle</button>
                      </div>

                      <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-secondary my-auto px-2 w-14">Niv 2</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (groupingLevel1 !== 'equipe') setGroupingLevel2(groupingLevel2 === 'equipe' ? undefined : 'equipe');
                          }}
                          disabled={groupingLevel1 === 'equipe'}
                          className={`flex-1 py-1 text-xs rounded-md font-medium transition-all ${groupingLevel2 === 'equipe' ? 'bg-primary text-white shadow-sm' : groupingLevel1 === 'equipe' ? 'opacity-30 cursor-not-allowed' : 'text-secondary hover:bg-gray-50'}`}
                        >Équipe</button>
                        <button
                          type="button"
                          onClick={() => {
                            if (groupingLevel1 !== 'pole') setGroupingLevel2(groupingLevel2 === 'pole' ? undefined : 'pole');
                          }}
                          disabled={groupingLevel1 === 'pole'}
                          className={`flex-1 py-1 text-xs rounded-md font-medium transition-all ${groupingLevel2 === 'pole' ? 'bg-primary text-white shadow-sm' : groupingLevel1 === 'pole' ? 'opacity-30 cursor-not-allowed' : 'text-secondary hover:bg-gray-50'}`}
                        >Pôle</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filtres Personnels */}
                <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 text-blue-500 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                      </div>
                      Ressources ciblées
                    </h4>
                    <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
                      {activeFilters.length} actif{activeFilters.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {editingFilterId !== null ? (
                    <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 mb-4 ring-1 ring-blue-100 shadow-inner">
                      {(() => {
                        const filterToEdit = filtresPerso.find(f => f.IdFiltre === editingFilterId);
                        if (!filterToEdit) return null;
                        const isSingleSelect = [3, 6, 7].includes(Number(filterToEdit.IdFiltre));
                        
                        return (
                          <>
                            <div className="flex items-center justify-between mb-4 border-b border-blue-200/50 pb-2">
                              <h5 className="text-sm font-bold text-blue-900">{filterToEdit.LibelleFiltre}</h5>
                              <button onClick={() => setEditingFilterId(null)} className="p-1 text-blue-400 hover:text-blue-700 hover:bg-blue-100 rounded-md transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 pr-1 mb-4">
                              {filterToEdit.Valeurs.map((val: any) => (
                                <label key={val.Id} className="flex items-center gap-3 cursor-pointer p-2 bg-white hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-lg shadow-sm transition-all">
                                  <input 
                                    type={isSingleSelect ? "radio" : "checkbox"} 
                                    name={`filter-${filterToEdit.IdFiltre}`}
                                    checked={val.Selection === 1}
                                    onChange={() => {
                                      setFiltresPerso(prev => prev.map(f => {
                                        if (f.IdFiltre === filterToEdit.IdFiltre) {
                                          return {
                                            ...f,
                                            Valeurs: f.Valeurs.map((v: any) => {
                                              if (isSingleSelect) {
                                                return { ...v, Selection: v.Id === val.Id ? 1 : 0 };
                                              } else {
                                                if (v.Id === val.Id) return { ...v, Selection: v.Selection === 1 ? 0 : 1 };
                                                return v;
                                              }
                                            }),
                                            isDeleted: false
                                          };
                                        }
                                        return f;
                                      }));
                                    }}
                                    className="text-blue-600 focus:ring-blue-500 rounded border-gray-300"
                                  />
                                  <span className="text-sm font-medium text-gray-700">{val.Nom}</span>
                                </label>
                              ))}
                            </div>
                            <button onClick={() => setEditingFilterId(null)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold shadow-md transition-colors">
                              Terminer la sélection
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  ) : isAddingFilter ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg ring-1 ring-gray-100 mb-4 absolute z-30 left-6 right-6 top-1/2 -translate-y-1/2 backdrop-blur-xl bg-white/90">
                      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                        <h5 className="text-sm font-bold text-gray-800">Ajouter un critère</h5>
                        <button onClick={() => setIsAddingFilter(false)} className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-md transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      {availableFilters.length > 0 ? (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 pr-1">
                          {availableFilters.map(filtre => (
                            <button 
                              key={filtre.IdFiltre}
                              onClick={() => {
                                setEditingFilterId(filtre.IdFiltre);
                                setIsAddingFilter(false);
                              }}
                              className="w-full text-left px-3 py-2.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-sm font-medium text-gray-700 transition-colors flex justify-between items-center group"
                            >
                              <span>{filtre.LibelleFiltre}</span>
                              <div className="w-6 h-6 rounded bg-white flex items-center justify-center shadow-sm group-hover:text-blue-600">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic p-4 text-center">Tous les filtres disponibles sont déjà utilisés.</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {activeFilters.length > 0 ? (
                        <div className="space-y-3 mb-4">
                          {activeFilters.map(filtre => {
                            const selectedValues = filtre.Valeurs.filter(v => v.Selection === 1);
                            return (
                              <div 
                                key={filtre.IdFiltre} 
                                className="bg-white border border-gray-200 p-3.5 rounded-xl cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group relative flex flex-col gap-2"
                                onClick={() => setEditingFilterId(filtre.IdFiltre)}
                              >
                                <div className="flex justify-between items-center">
                                  <h5 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                    {filtre.LibelleFiltre}
                                    {filtre.EstFiltreGandara && (
                                      <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wider">Gandara</span>
                                    )}
                                  </h5>
                                  {/* BOUTONS ACTIONS */}
                                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md shadow-sm transition-colors"
                                      onClick={(e) => { e.stopPropagation(); setEditingFilterId(filtre.IdFiltre); }}
                                      title="Modifier"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    </button>
                                    <button 
                                      className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-md shadow-sm transition-colors"
                                      onClick={(e) => handleRemoveFilter(e, filtre.IdFiltre)}
                                      title="Supprimer"
                                    >
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedValues.map(val => (
                                    <span key={val.Id} className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2 py-1 rounded-md border border-gray-200">
                                      {val.Nom}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl mb-4">
                          <p className="text-sm font-medium text-gray-400">Aucun filtre ciblé. <br/>Toutes les ressources seront affichées.</p>
                        </div>
                      )}

                      <button
                        onClick={() => setIsAddingFilter(true)}
                        disabled={availableFilters.length === 0}
                        className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        Ajouter un critère
                      </button>
                    </>
                  )}
                </div>

                {/* Filtres Événements */}
                <div className="bg-white border border-purple-100 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                      <div className="p-1.5 bg-purple-50 text-purple-500 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      Événements affichés
                    </h4>
                    <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full border border-purple-200">
                      {selectedRdvTypes.length} type{selectedRdvTypes.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: 'Chantier', label: 'Chantiers', color: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200' },
                      { id: 'Absence', label: 'Absences & Social', color: 'bg-amber-400', bg: 'bg-amber-50', border: 'border-amber-200' },
                      { id: 'Perso', label: 'Autres (Perso)', color: 'bg-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-200' }
                    ].map(type => (
                      <label key={type.id} className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${selectedRdvTypes.includes(type.id) ? `${type.bg} ${type.border} shadow-sm` : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm text-white ${selectedRdvTypes.includes(type.id) ? type.color : 'bg-gray-300'}`}>
                          {type.id === 'Chantier' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                          {type.id === 'Absence' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                          {type.id === 'Perso' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                        </div>
                        <span className={`text-sm flex-1 font-semibold ${selectedRdvTypes.includes(type.id) ? 'text-gray-900' : 'text-gray-500'}`}>{type.label}</span>
                        <div className="relative flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={selectedRdvTypes.includes(type.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRdvTypes([...selectedRdvTypes, type.id]);
                              else setSelectedRdvTypes(selectedRdvTypes.filter(t => t !== type.id));
                            }}
                          />
                          <div className={`w-10 h-5 bg-gray-200 rounded-full transition-colors ${selectedRdvTypes.includes(type.id) ? 'bg-green-500' : ''}`}></div>
                          <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${selectedRdvTypes.includes(type.id) ? 'translate-x-5' : ''}`}></div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Actions Sticky au fond */}
            <div className="sticky bottom-0 left-0 right-0  backdrop-blur-md p-4 border-t border-gray-100 flex justify-end gap-3 z-20 mt-4 rounded-b-lg">
              <button
                onClick={() => {
                  setIsCreatingConfig(false);
                  setEditingConfig(null);
                  resetForm();
                }}
                disabled={isLoadingForm || isSaving}
                className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!configName.trim() || isLoadingForm || isSaving}
                className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold min-w-[140px] flex justify-center items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    {editingConfig ? 'Enregistrer les modifications' : 'Créer la vue'}
                  </>
                )}
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