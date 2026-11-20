import { useAuth } from "@/app/calendrier/hooks/utils/AuthContext";
import { CalendarConfig, ImageType, GroupingLevel } from "@/app/calendrier/types";
import { employeeService, calendarConfigService } from "@/app/service";
import { GroupIcon, Lock } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Combobox } from "../../ui";
import { SaveAction } from "./ControlPanelModal";



const Spinner = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) => {
  const sizes = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };
  return (
    <svg className={`animate-spin ${sizes[size]} ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};


export const CalendarConfigurationsEditor = ({ setting, onFormStateChange, registerSaveAction }: { setting: any; onFormStateChange?: (isOpen: boolean) => void; registerSaveAction: (id: string, action: SaveAction | null) => void; }) => {
  const {
    user,
    availableConfigs = [],
    currentConfig,
    onConfigChange,
    onSaveConfig,
    onDeleteConfig,
    handleOpenImageModal,
    addImage,
  } = setting;

  const { hasPermission } = useAuth();

  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<CalendarConfig | null>(null);
  const [isCreatingConfig, setIsCreatingConfig] = useState(false);

  const [configName, setConfigName] = useState("");
  const [configDescription, setConfigDescription] = useState("");
  const [configImage, setConfigImage] = useState<ImageType | undefined>(undefined);
  const [groupingLevel1, setGroupingLevel1] = useState<GroupingLevel | undefined>(undefined);
  const [groupingLevel2, setGroupingLevel2] = useState<GroupingLevel | undefined>(undefined);

  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<{ Id: number; Nom: string }[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [deletingConfigId, setDeletingConfigId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [filtresPerso, setFiltresPerso] = useState<
    {
      IdFiltre: number;
      LibelleFiltre: string;
      EstFiltreGandara: boolean;
      Valeurs: { Selection: number; Id: string; Nom: string }[] | [];
      isDeleted?: boolean;
    }[]
  >([]);

  const [editingFilterId, setEditingFilterId] = useState<number | null>(null);
  const [isAddingFilter, setIsAddingFilter] = useState(false);
  const [selectedRdvTypes, setSelectedRdvTypes] = useState<string[]>(["Chantier", "Absence", "Perso"]);

  const activeFilters = filtresPerso.filter(
    (f) => Array.isArray(f.Valeurs) && f.Valeurs.some((v) => v.Selection === 1)
  );
  const availableFilters = filtresPerso.filter(
    (f) => !Array.isArray(f.Valeurs) || !f.Valeurs.some((v) => v.Selection === 1)
  );

  const myUserId = Number(user?.IdPersonnel);

  const userOptions = useMemo(() => {
    return allUsers.map((u: any) => {
      const uid = Number(u.IdPersonnel);
      const nom = u.nom || u.Nom || "";
      const prenom = u.prenom || u.Prenom || "";
      const isMe = uid === myUserId;
      return {
        value: String(uid),
        label: `${nom} ${prenom}${isMe ? " (Moi)" : ""}`.trim(),
      };
    });
  }, [allUsers, myUserId]);

  const effectiveSelectedUsers = useMemo(() => {
    if (!myUserId) return selectedUsers.map(String);
    return Array.from(new Set([myUserId, ...selectedUsers])).map(String);
  }, [selectedUsers, myUserId]);


  const resetForm = () => {
    setConfigName("");
    setConfigDescription("");
    setConfigImage(undefined);
    setGroupingLevel1(undefined);
    setGroupingLevel2(undefined);
    setFiltresPerso([]);
    setEditingFilterId(null);
    setIsAddingFilter(false);
    setSelectedRdvTypes(["Chantier", "Absence", "Perso"]);
    setSaveError(null);
    setIsPrivate(false);
    setSelectedUsers([]);
  };

  const buildSnapshot = (data: {
    configName: string;
    configDescription: string;
    configImage?: ImageType;
    groupingLevel1?: GroupingLevel;
    groupingLevel2?: GroupingLevel;
    isPrivate: boolean;
    selectedUsers: number[];
    selectedRdvTypes: string[];
    filtresPerso: {
      IdFiltre: number;
      Valeurs: { Selection: number; Id: string }[];
    }[];
  }) =>
    JSON.stringify({
      configName: data.configName.trim(),
      configDescription: data.configDescription.trim(),
      configImageId: data.configImage?.id ?? null,
      configImageUrl: data.configImage?.image ?? null,
      groupingLevel1: data.groupingLevel1 || null, // <-- || null normalise "" et undefined en null !
      groupingLevel2: data.groupingLevel2 || null,
      isPrivate: data.isPrivate,
      selectedUsers: [...data.selectedUsers].map(Number).sort((a, b) => a - b),
      selectedRdvTypes: [...data.selectedRdvTypes].sort(),
      filtresPerso: data.filtresPerso
        .map((f) => ({
          IdFiltre: Number(f.IdFiltre),
          Valeurs: (f.Valeurs || [])
            .filter((v) => v.Selection === 1)
            .map((v) => String(v.Id))
            .sort(),
        }))
        .sort((a, b) => a.IdFiltre - b.IdFiltre),
  });

  const handleRemoveFilter = (e: React.MouseEvent, idFiltre: number) => {
    e.stopPropagation();
    setFiltresPerso((prev) =>
      prev.map((f) => {
        if (f.IdFiltre === idFiltre) {
          return {
            ...f,
            Valeurs: f.Valeurs.map((v: any) => ({ ...v, Selection: 0 })),
            isDeleted: true,
          };
        }
        return f;
      })
    );

    if (editingFilterId === idFiltre) {
      setEditingFilterId(null);
    }
  };

  const handleDeleteConfig = async (e: React.MouseEvent, configId: number) => {
    e.stopPropagation();
    if (deletingConfigId === configId) return;

    setDeletingConfigId(Number(configId));
    setDeleteError(null);

    try {
      const response = await onDeleteConfig(configId);
      if (response && response.success === false) {
        setDeleteError(response.message || "Impossible de supprimer cette configuration.");
        setDeletingConfigId(null);
      } else {
        if (editingConfig?.IdPlanningVue === configId) {
          setEditingConfig(null);
          resetForm();
        }
        setDeletingConfigId(null);
      }
    } catch (error) {
      setDeletingConfigId(null);
      setDeleteError("Erreur réseau ou inattendue lors de la suppression.");
    }
  };

  useEffect(() => {
    if (editingConfig || isCreatingConfig) {
      setIsLoadingForm(true);
      setInitialSnapshot(null);
      setSaveError(null);
      setIsLoadingUsers(true);

      if (employeeService.getAllUsersActif) {
        employeeService
          .getAllUsersActif()
          .then((res: any) => setAllUsers(res.data || res || []))
          .catch(console.error)
          .finally(() => setIsLoadingUsers(false));
      } else {
        setIsLoadingUsers(false);
      }

      const fetchId = editingConfig ? editingConfig.IdPlanningVue : 0;

      if (editingConfig) {
        calendarConfigService
          .lockCalendarConfig(fetchId)
          .then((response) => {
            if (response?.success === false) {
              console.error("Erreur lors du verrouillage de la configuration :", response?.message);
            }
          })
          .catch(console.error);
      }

      calendarConfigService.getVueDetails(fetchId)
        .then((response: any) => {
          const apiData = response.data || response;
          const { planningVue, filtrePerso, utilisateursAutorises } = apiData;

          const nextName = planningVue?.LibellePlanningVue || "";
          const nextDesc = planningVue?.DescriptionPlanningVue || "";
          const nextImage = planningVue?.PlanningVueImage;
          const nextGroup1 = planningVue?.Group?.ChampsPremierGroupePlanningVue || undefined;
          const nextGroup2 = planningVue?.Group?.ChampsDeuxiemeGroupePlanningVue || undefined;

          const types: string[] = [];
          if (planningVue?.chantierEvenement) types.push("Chantier");
          if (planningVue?.paieEvenement) types.push("Absence");
          if (planningVue?.persoEvenement) types.push("Perso");
          const nextTypes = types.length > 0 ? types : ["Chantier", "Absence", "Perso"];

          const hasAuthorizedUsers = Array.isArray(utilisateursAutorises) && utilisateursAutorises.length > 0;
          const nextIsPrivate = hasAuthorizedUsers;
          const nextUsers = hasAuthorizedUsers
            ? utilisateursAutorises.map((u: any) => Number(u.Id) || Number(u))
            : [];

          const normalizedFiltres = (filtrePerso || []).map((fp: any) => {
            const rawVals = fp.Valeurs || fp.Valeur || [];
            return {
              ...fp,
              LibelleFiltre: fp.LibelleFiltre || fp.NomFiltre || fp.Nom,
              Valeurs: isCreatingConfig
                ? rawVals.map((v: any) => ({ ...v, Selection: 0 }))
                : rawVals,
            };
          });

          // Mise à jour atomique de tous les états + du snapshot initial dans le même batch React
          setConfigName(nextName);
          setConfigDescription(nextDesc);
          setConfigImage(nextImage);
          setGroupingLevel1(nextGroup1);
          setGroupingLevel2(nextGroup2);
          setSelectedRdvTypes(nextTypes);
          setIsPrivate(nextIsPrivate);
          setSelectedUsers(nextUsers);
          setFiltresPerso(normalizedFiltres);

          setInitialSnapshot(
            buildSnapshot({
              configName: nextName,
              configDescription: nextDesc,
              configImage: nextImage,
              groupingLevel1: nextGroup1,
              groupingLevel2: nextGroup2,
              isPrivate: nextIsPrivate,
              selectedUsers: nextUsers,
              selectedRdvTypes: nextTypes,
              filtresPerso: normalizedFiltres,
            })
          );

          setIsLoadingForm(false);
        })
        .catch((error: any) => {
          console.error("Erreur lors de la récupération des détails de la vue :", error);
          setIsLoadingForm(false);
        });
    } else {
      setInitialSnapshot(null);
      resetForm();
    }
  }, [editingConfig, isCreatingConfig]);

  const handleSave =useCallback( async () => {
    if (!configName.trim()) return;

    setIsSaving(true);
    setSaveError(null);

    if (groupingLevel1 && groupingLevel2 && groupingLevel1 === groupingLevel2) {
      setSaveError("Les niveaux de regroupement doivent être différents.");
      setIsSaving(false);
      console.error("Les niveaux de regroupement doivent être différents.");
      throw new Error("Les niveaux de regroupement doivent être différents.");
    }

    if (selectedRdvTypes.length === 0) {
      setSaveError("Au moins un type de rendez-vous doit être sélectionné.");
      setIsSaving(false);
      console.error("Au moins un type de rendez-vous doit être sélectionné.");
      throw new Error("Au moins un type de rendez-vous doit être sélectionné.");
    }

    if (groupingLevel1 === undefined) {
      setSaveError("Le premier niveau de regroupement doit être sélectionné.");
      setIsSaving(false);
      console.error("Le premier niveau de regroupement doit être sélectionné.");
      throw new Error("Le premier niveau de regroupement doit être sélectionné.");
    }

    const planningVue = {
      IdPlanningVue: editingConfig?.IdPlanningVue || 0,
      LibellePlanningVue: configName.trim(),
      DescriptionPlanningVue: configDescription?.trim(),
      IdPlanningImage: configImage?.id,
      Group:
        groupingLevel1 || groupingLevel2
          ? {
              ChampsPremierGroupePlanningVue: groupingLevel1,
              ChampsDeuxiemeGroupePlanningVue: groupingLevel2,
            }
          : undefined,
      chantierEvenement: selectedRdvTypes.includes("Chantier"),
      paieEvenement: selectedRdvTypes.includes("Absence"),
      persoEvenement: selectedRdvTypes.includes("Perso"),
      utilisateursAutorises: isPrivate
        ? Array.from(new Set([user.IdPersonnel, ...selectedUsers]))
        : [],
    };

    const filtre = filtresPerso
      .filter(
        (f) => Array.isArray(f.Valeurs) && (f.Valeurs.some((v) => v.Selection === 1) || f.isDeleted)
      )
      .map((f) => {
        const valeursSelectionnees = f.Valeurs.filter((v) => v.Selection === 1).map((v) => v.Id);
        return {
          IdFiltre: f.IdFiltre,
          EstFiltreGandara: f.EstFiltreGandara,
          Valeurs: valeursSelectionnees.length > 0 ? valeursSelectionnees : [],
        };
      });

    try {
      console.log("Enregistrement de la configuration :")
      if (configImage?.image && planningVue.IdPlanningImage === 0) {
        const result = await addImage(configImage.image);
        if (!result.success || !result.id) {
          setSaveError(result.message || "Erreur lors de l'ajout de l'image.");
          setIsSaving(false);
          return;
        }
        planningVue.IdPlanningImage = result.id;
      }

      const response = await onSaveConfig(
        {
          planningVue,
          filtrePerso: filtre,
          utilisateursAutorises: isPrivate
            ? Array.from(new Set([user.IdPersonnel, ...selectedUsers]))
            : [],
        }, 
        isCreatingConfig ? "create" : "update"
      );
      console.log("Réponse de l'enregistrement :", response);

      if (response && response.success === false || !response) {
        setSaveError(
          (response as any).message || "Une erreur s'est produite lors de l'enregistrement de la vue."
        );
        setIsSaving(false);
        return;
      }

      resetForm();
      setIsCreatingConfig(false);
      setEditingConfig(null);
    } catch (error) {
      setSaveError("Erreur réseau ou erreur inattendue lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  }, [
    configName,
    configDescription,
    configImage,
    groupingLevel1,
    groupingLevel2,
    selectedRdvTypes,
    isPrivate,
    selectedUsers,
    filtresPerso,
    editingConfig,
    user,
    addImage,
    onSaveConfig,
  ]);;


  const isFormActive = isCreatingConfig || Boolean(editingConfig);

  useEffect(() => {
    onFormStateChange?.(isFormActive);
  }, [isFormActive, onFormStateChange]);

  const currentSnapshot = useMemo(() => {
    if (!isFormActive || isLoadingForm) return null;
    return buildSnapshot({
      configName,
      configDescription,
      configImage,
      groupingLevel1,
      groupingLevel2,
      isPrivate,
      selectedUsers,
      selectedRdvTypes,
      filtresPerso,
    });
  }, [
    isFormActive,
    isLoadingForm,
    configName,
    configDescription,
    configImage,
    groupingLevel1,
    groupingLevel2,
    isPrivate,
    selectedUsers,
    selectedRdvTypes,
    filtresPerso,
  ]);


  const isDirty =
    isFormActive &&
    !isLoadingForm &&
    Boolean(configName.trim()) &&
    initialSnapshot !== null &&
    currentSnapshot !== initialSnapshot;

  console.log(isFormActive)
  console.log(!isLoadingForm)
  console.log(Boolean(configName.trim()))
  console.log(initialSnapshot !== null, initialSnapshot)
  console.log(currentSnapshot !== initialSnapshot, currentSnapshot)
  console.log("isDirty:", isDirty);
  console.log("\n\n\n\n\n\n\n\n\n\n\n");


  useEffect(() => {
    registerSaveAction("calendar-configurations", { isDirty, save: handleSave });
    return () => registerSaveAction("calendar-configurations", null);
  }, [isDirty, handleSave, registerSaveAction]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden poppins">
      {/* PANNEAU GAUCHE : Liste des configurations */}
      <div
        className={`${
          isFormActive ? "lg:col-span-5" : "lg:col-span-12"
        } flex flex-col gap-4 min-h-0 overflow-y-auto pr-2 transition-all duration-300`}
      >
        {/* Vue active */}
        <div className="bg-gradient-to-br from-primary-ultra-light/50 to-primary-light/50 p-4 rounded-2xl border border-primary/20 shadow-sm relative overflow-hidden shrink-0">
          <h3 className="font-semibold text-primary text-sm mb-3 flex items-center gap-2">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            Vue active
          </h3>

          {currentConfig ? (
            <div className="flex items-start gap-3">
              {currentConfig.PlanningVueImage?.image && (
                <img
                  src={currentConfig.PlanningVueImage.image}
                  className="w-12 h-12 object-cover rounded-xl shadow-sm shrink-0 border border-white"
                  alt="Config"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-primary mb-0.5 flex items-center gap-2">
                  <span className="truncate">{currentConfig.LibellePlanningVue}</span>
                  {currentConfig.isLocked && (
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600 shrink-0">
                      Verrouillé
                    </span>
                  )}
                </p>
                {currentConfig.DescriptionPlanningVue && (
                  <p className="text-xs text-secondary/80 mb-2 line-clamp-2">
                    {currentConfig.DescriptionPlanningVue}
                  </p>
                )}
                {currentConfig.Group && (
                  <span className="text-[11px] bg-primary-bg text-primary px-2 py-0.5 rounded-md border border-primary/10 font-medium inline-block">
                    {currentConfig.Group.ChampsPremierGroupePlanningVue &&
                      `Niv.1: ${currentConfig.Group.ChampsPremierGroupePlanningVue}`}
                    {currentConfig.Group.ChampsDeuxiemeGroupePlanningVue &&
                      ` | Niv.2: ${currentConfig.Group.ChampsDeuxiemeGroupePlanningVue}`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-secondary italic">Aucune configuration sélectionnée</p>
          )}
        </div>

        {/* En-tête liste + bouton création */}
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-primary">Vues disponibles</h4>
          {hasPermission(214, 23) && (
            <button
              type="button"
              onClick={() => {
                setEditingConfig(null);
                setIsCreatingConfig(true);
              }}
              className="px-3.5 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-600 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nouvelle vue
            </button>
          )}
        </div>

        {deleteError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-200 flex items-center gap-2">
            <span className="font-medium">{deleteError}</span>
          </div>
        )}

        {/* Liste des vues */}
        <div className="space-y-2.5 pb-2">
          {availableConfigs.map((config: CalendarConfig) => (
            <div
              key={config.IdPlanningVue}
              className={`p-3.5 rounded-2xl border transition-all duration-200 group ${
                currentConfig?.IdPlanningVue === config.IdPlanningVue
                  ? "border-primary bg-primary/10 shadow-sm"
                  : config.isLocked
                  ? "border-red-100 bg-red-50/30 opacity-75"
                  : "border-light bg-primary-bg hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-3">
                {config.PlanningVueImage?.image && (
                  <img
                    src={config.PlanningVueImage.image}
                    className="w-10 h-10 object-cover rounded-lg shrink-0 border border-light"
                    alt="Config"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onConfigChange(config)}
                  className="flex-1 text-left cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-primary truncate">
                      {config.LibellePlanningVue}
                    </span>
                    {currentConfig?.IdPlanningVue === config.IdPlanningVue && (
                      <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                    )}
                  </div>
                  {config.DescriptionPlanningVue && (
                    <p className="text-xs text-secondary/70 line-clamp-1 mb-1.5">
                      {config.DescriptionPlanningVue}
                    </p>
                  )}
                  {config.Group && (
                    <span className="text-[11px] bg-secondary-bg px-2 py-0.5 rounded border border-ultra-light text-secondary font-medium inline-block">
                      {config.Group.ChampsPremierGroupePlanningVue &&
                        `Niv.1: ${config.Group.ChampsPremierGroupePlanningVue}`}
                      {config.Group.ChampsDeuxiemeGroupePlanningVue &&
                        ` | Niv.2: ${config.Group.ChampsDeuxiemeGroupePlanningVue}`}
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!config.isLocked) {
                        setIsCreatingConfig(false);
                        setEditingConfig(config);
                      }
                    }}
                    disabled={config.isLocked}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      config.isLocked
                        ? "text-red-300 cursor-not-allowed"
                        : "text-secondary hover:text-primary hover:bg-primary/10"
                    }`}
                    title={config.isLocked ? "Verrouillé" : "Modifier"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteConfig(e, config.IdPlanningVue)}
                    disabled={config.isLocked || deletingConfigId === config.IdPlanningVue}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      config.isLocked || deletingConfigId === config.IdPlanningVue
                        ? "text-red-300 cursor-not-allowed"
                        : "text-secondary hover:text-red-500 hover:bg-red-50"
                    }`}
                    title="Supprimer"
                  >
                    {deletingConfigId === Number(config.IdPlanningVue) ? (
                      <Spinner size="sm" className="text-red-500" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PANNEAU DROIT : Formulaire de création / édition */}
      {isFormActive && (
        <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l border-ultra-light pt-4 lg:pt-0 lg:pl-6 flex flex-col min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-ultra-light mb-4 shrink-0">
            <h4 className="font-bold text-primary text-base flex items-center gap-2">
              {editingConfig ? "Modifier la vue" : "Nouvelle vue"}
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsCreatingConfig(false);
                setEditingConfig(null);
                resetForm();
              }}
              className="text-secondary hover:text-primary p-1 cursor-pointer"
              title="Fermer le formulaire"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {isLoadingForm ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Spinner size="lg" className="text-primary" />
              <p className="text-sm text-primary font-medium">Chargement des données...</p>
            </div>
          ) : (
            <div className="space-y-5 flex-1">
              {saveError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs border border-red-200 font-medium">
                  {saveError}
                </div>
              )}

              {/* Nom & Description */}
              <div className="space-y-3 bg-primary-bg p-4 rounded-2xl border border-light">
                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">
                    Nom de la configuration <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    className="w-full px-3 py-2 bg-primary-bg border border-default rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    placeholder="Ex: Vue Technique par contrats"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-primary mb-1">Description</label>
                  <textarea
                    value={configDescription}
                    onChange={(e) => setConfigDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-primary-bg border border-default rounded-xl text-xs focus:ring-2 focus:ring-primary/40 focus:outline-none"
                    placeholder="Donnez un contexte à cette vue..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Visibilité */}
              <div className="bg-primary-bg border border-light rounded-2xl p-4 space-y-3">
                <h5 className="text-xs font-bold text-primary">Visibilité</h5>
                <div className="flex gap-3">
                  <label
                    className={`flex-1 border p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2.5 ${
                      !isPrivate ? "border-emerald-400 bg-emerald-500/10" : "border-light hover:bg-secondary/10"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={!isPrivate}
                      onChange={() => {
                        setIsPrivate(false);
                        setSelectedUsers([]);
                      }}
                      className="hidden"
                    />
                    <div>
                      <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                      <div className="text-xs font-bold text-primary">Publique</div>
                    </div>
                  </label>

                  <label
                    className={`flex-1 border p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-2.5 ${
                      isPrivate ? "border-primary bg-primary/10" : "border-light hover:bg-secondary/10"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={isPrivate}
                      onChange={() => setIsPrivate(true)}
                      className="hidden"
                    />
                    <div>
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <div className="text-xs font-bold text-primary">Privée</div>            
                    </div>
                  </label>
                </div>

                {isPrivate && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-secondary mb-1.5">
                      Membres autorisés
                    </label>
                    {isLoadingUsers ? (
                      <div className="flex justify-center p-4 border border-light rounded-xl">
                        <Spinner size="sm" className="text-primary" />
                      </div>
                    ) : (
                      <Combobox
                        multiple={true}
                        options={userOptions}
                        value={effectiveSelectedUsers}
                        onValueChange={(nextValues: string[]) => {
                          const numericIds = nextValues.map(Number);
                          const withMe = myUserId
                            ? Array.from(new Set([myUserId, ...numericIds]))
                            : numericIds;
                          setSelectedUsers(withMe);
                        }}
                        placeholder="Rechercher un collaborateur..."
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Icône & Arborescence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-primary-bg p-4 rounded-2xl border border-light flex flex-col">
                  <label className="block text-xs font-semibold text-primary mb-2">Icône de la vue</label>
                  <div
                    onClick={() => handleOpenImageModal(configImage, setConfigImage)}
                    className="flex-1 border-2 border-dashed border-default rounded-xl p-2.5 flex items-center justify-center hover:border-primary transition-all cursor-pointer"
                  >
                    {configImage ? (
                      <div className="flex items-center gap-3 w-full justify-between">
                        <img src={configImage.image} alt="Config" className="w-9 h-9 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfigImage(undefined);
                          }}
                          className="cursor-pointer text-red-500 p-1.5 bg-red-50 rounded-lg"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-secondary font-medium">Choisir une icône</span>
                    )}
                  </div>
                </div>

                <div className="bg-primary-bg p-4 rounded-2xl border border-light space-y-2">
                  <label className="block text-xs font-semibold text-primary">Arborescence</label>
                  <div className="flex bg-secondary-bg p-1 rounded-lg border border-light">
                    <span className="text-[10px] uppercase font-bold text-secondary my-auto px-2 w-12">Niv 1</span>
                    <button
                      type="button"
                      onClick={() => {
                        const val = groupingLevel1 === "equipe" ? undefined : "equipe";
                        setGroupingLevel1(val);
                        if (val === groupingLevel2) setGroupingLevel2(undefined);
                      }}
                      className={`flex-1 py-1 text-xs rounded-md font-medium cursor-pointer ${
                        groupingLevel1 === "equipe" ? "bg-primary text-white" : "text-secondary"
                      }`}
                    >
                      Équipe
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const val = groupingLevel1 === "pole" ? undefined : "pole";
                        setGroupingLevel1(val);
                        if (val === groupingLevel2) setGroupingLevel2(undefined);
                      }}
                      className={`flex-1 py-1 text-xs rounded-md font-medium cursor-pointer ${
                        groupingLevel1 === "pole" ? "bg-primary text-white" : "text-secondary"
                      }`}
                    >
                      Pôle
                    </button>
                  </div>

                  <div className="flex bg-secondary-bg p-1 rounded-lg border border-light">
                    <span className="text-[10px] uppercase font-bold text-secondary my-auto px-2 w-12">Niv 2</span>
                    <button
                      type="button"
                      disabled={groupingLevel1 === "equipe"}
                      onClick={() => {
                        if (groupingLevel1 !== "equipe")
                          setGroupingLevel2(groupingLevel2 === "equipe" ? undefined : "equipe");
                      }}
                      className={`flex-1 py-1 text-xs rounded-md font-medium cursor-pointer ${
                        groupingLevel2 === "equipe"
                          ? "bg-primary text-white"
                          : groupingLevel1 === "equipe"
                          ? "opacity-30 cursor-not-allowed"
                          : "text-secondary"
                      }`}
                    >
                      Équipe
                    </button>
                    <button
                      type="button"
                      disabled={groupingLevel1 === "pole"}
                      onClick={() => {
                        if (groupingLevel1 !== "pole")
                          setGroupingLevel2(groupingLevel2 === "pole" ? undefined : "pole");
                      }}
                      className={`flex-1 py-1 text-xs rounded-md font-medium cursor-pointer ${
                        groupingLevel2 === "pole"
                          ? "bg-primary text-white"
                          : groupingLevel1 === "pole"
                          ? "opacity-30 cursor-not-allowed"
                          : "text-secondary"
                      }`}
                    >
                      Pôle
                    </button>
                  </div>
                </div>
              </div>

              {/* Ressources ciblées */}
              <div className="bg-primary-bg border border-light rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-primary">Ressources ciblées</h5>
                  <span className="text-[11px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {activeFilters.length} actif{activeFilters.length > 1 ? "s" : ""}
                  </span>
                </div>

                {editingFilterId !== null ? (
                  <div className="bg-secondary-bg border border-light rounded-xl p-3 space-y-3 animate-in fade-in duration-150">
                    {(() => {
                      const filterToEdit = filtresPerso.find((f) => f.IdFiltre === editingFilterId);
                      if (!filterToEdit) return null;
                      const isSingleSelect = [3, 6, 7].includes(Number(filterToEdit.IdFiltre));

                      return (
                        <>
                          <div className="flex items-center justify-between border-b border-ultra-light pb-2">
                            <span className="text-xs font-bold text-primary">{filterToEdit.LibelleFiltre}</span>
                            <button
                              type="button"
                              onClick={() => setEditingFilterId(null)}
                              className="text-secondary hover:text-primary cursor-pointer p-1"
                              title="Fermer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {filterToEdit.Valeurs.map((val: any) => {
                              const isSelected = val.Selection === 1;
                              return (
                                <button
                                  key={val.Id}
                                  type="button"
                                  onClick={() => {
                                    setFiltresPerso((prev) =>
                                      prev.map((f) => {
                                        if (f.IdFiltre === filterToEdit.IdFiltre) {
                                          return {
                                            ...f,
                                            Valeurs: f.Valeurs.map((v: any) => {
                                              if (isSingleSelect) {
                                                return { ...v, Selection: v.Id === val.Id ? 1 : 0 };
                                              }
                                              return v.Id === val.Id
                                                ? { ...v, Selection: v.Selection === 1 ? 0 : 1 }
                                                : v;
                                            }),
                                          };
                                        }
                                        return f;
                                      })
                                    );
                                    // Si sélection unique, on ferme automatiquement pour enchaîner plus vite
                                    if (isSingleSelect) {
                                      setEditingFilterId(null);
                                    }
                                  }}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 ${
                                    isSelected
                                      ? "bg-primary text-white border-primary shadow-2xs"
                                      : "bg-primary-bg text-primary border-light hover:border-primary/40"
                                  }`}
                                >
                                  {isSelected && (
                                    <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  <span>{val.Nom}</span>
                                </button>
                              );
                            })}
                          </div>

                          {!isSingleSelect && (
                            <button
                              type="button"
                              onClick={() => setEditingFilterId(null)}
                              className="w-full bg-primary text-white py-1.5 rounded-lg text-xs font-semibold cursor-pointer hover:bg-primary-600 transition-colors"
                            >
                              Terminer la sélection
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : isAddingFilter ? (
                  <div className="bg-secondary-bg border border-light rounded-xl p-3 space-y-2.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-1.5 border-b border-ultra-light">
                      <span className="text-xs font-bold text-primary">Choisir un critère</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingFilter(false)}
                        className="text-secondary hover:text-primary cursor-pointer p-0.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    {availableFilters.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {availableFilters.map((filtre) => (
                          <button
                            key={filtre.IdFiltre}
                            type="button"
                            onClick={() => {
                              setEditingFilterId(filtre.IdFiltre);
                              setIsAddingFilter(false);
                            }}
                            className="px-3 py-1.5 bg-primary-bg hover:scale-105 border border-light rounded-lg text-xs font-medium text-primary flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                          >
                            <span>+</span>
                            <span>{filtre.LibelleFiltre}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-secondary italic text-center py-2">
                        Tous les filtres sont déjà utilisés.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {activeFilters.length > 0 ? (
                      <div className="space-y-2">
                        {activeFilters.map((filtre) => {
                          const selectedValues = filtre.Valeurs.filter((v) => v.Selection === 1);
                          return (
                            <div
                              key={filtre.IdFiltre}
                              onClick={() => setEditingFilterId(filtre.IdFiltre)}
                              className="bg-secondary-bg/60 border border-light p-3 rounded-xl cursor-pointer hover:border-primary/40 space-y-1.5 transition-colors"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-primary">{filtre.LibelleFiltre}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleRemoveFilter(e, filtre.IdFiltre)}
                                  className="text-red-500 hover:bg-red-50 p-1 rounded cursor-pointer"
                                  title="Retirer ce critère"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {selectedValues.map((val) => (
                                  <span
                                    key={val.Id}
                                    className="text-[11px] bg-primary-bg text-secondary px-2 py-0.5 rounded border border-light"
                                  >
                                    {val.Nom}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-secondary italic text-center py-3 bg-secondary-bg/40 rounded-xl border border-dashed border-light">
                        Aucun filtre ciblé (toutes les ressources affichées).
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsAddingFilter(true)}
                      disabled={availableFilters.length === 0}
                      className="w-full py-2 bg-primary/10 hover:bg-primary/15 text-primary border border-primary/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      + Ajouter un critère
                    </button>
                  </>
                )}
              </div>

              {/* Événements affichés */}
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
          )}
        </div>
      )}
    </div>
  );
};