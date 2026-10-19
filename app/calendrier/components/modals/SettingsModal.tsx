import { memo, useState, useMemo, useEffect } from "react";
import Modal from "./Modal";
import Loader from "../ui/Loader";
import { format } from "date-fns";
import { Appointment, Item, MobileAppointmentDisplayConfig, MobileAppointmentField, User } from "../../types";
import { AppointmentCard } from "../Calendar/MobileCalendar/AppointmentList";

type SettingsModalProps = {  
  onClose: () => void;
  settings: any;
  isSettingsOpen: boolean;
  setNotification: (notifications: any) => void;
};

const previewAppointment: Appointment = {
  IdPlanningEvenement: -1,
  AnnotationPlanningEvenement: "Prévoir le matériel nécessaire",
  DebutPlanningEvenement: new Date(2026, 8, 7, 9, 0).getTime(),
  FinPlanningEvenement: new Date(2026, 8, 7, 11, 0).getTime(),
  IdEmploye: 1,
  IdPlanningRessource: 1,
  EtapeValidation: "Validé",
  Etiquette: {
    IdPlanningEtiquette: 1,
    LibelleLongPlanningEtiquette: "Urgent",
  },
  isLocked: false,
};

const previewItem = {
  IdPlanningRessource: 1,
  LibellePlanningRessource: "Maintenance chaudière",
  CouleurFondPlanningRessource: "#2563eb",
  CouleurBordurePlanningRessource: "#1d4ed8",
  CouleurTextePlanningRessource: "#ffffff",
  CodePlanningRessource: "MAINT-001",
  Type: "Projet",
  ChefChantier : "Dupont Jean",
  ChargeAffaire : "Durand Marie",
} as Item;

const previewEmployee: User = {
  IdPersonnel: 1,
  Nom: "Martin",
  Prenom: "Camille",
  PoleActivite: null,
  Type: "SALARIE",
  Equipe: null,
};

/**
 * Éditeur pour un type de jour sélectionné (Modifiable : Libellé, Couleurs, Styles)
 */
const DayTypeSingleEditor = ({ dayType }: { dayType: any }) => {
  const [localType, setLocalType] = useState(dayType);

  useEffect(() => {
    setLocalType(dayType);
  }, [dayType]);

  const handleLabelChange = (value: string) => {
    setLocalType((prev: any) => ({ ...prev, label: value }));
  };

  const handleLabelBlur = () => {
    if (localType.label !== dayType.label) {
      dayType.onChange?.(localType);
    }
  };

  const handleColorChange = (key: "bgColor" | "textColor", value: string) => {
    setLocalType((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleColorBlur = () => {
    if (
      localType.bgColor !== dayType.bgColor ||
      localType.textColor !== dayType.textColor
    ) {
      dayType.onChange?.(localType);
    }
  };

  const handleToggle = (key: "isBold" | "isItalic") => {
    const updated = { ...localType, [key]: !localType[key] };
    setLocalType(updated);
    dayType.onChange?.(updated);
  };

  return (
    <div className="p-6 rounded-2xl border border-light bg-secondary/10 flex flex-col gap-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-ultra-light">
        <div>
          <h4 className="font-semibold text-primary text-base poppins">{localType.label || "Type de jour"}</h4>
          <p className="text-xs text-secondary poppins mt-0.5">Personnalisez le libellé et le style d'affichage sur le calendrier</p>
        </div>
        
        {/* Aperçu dynamique */}
        <div className="flex items-center gap-3 bg-secondary-bg p-3 rounded-xl border border-light">
          <span className="text-xs font-medium text-secondary poppins">Aperçu :</span>
          <div className="w-14 h-14 border border-light overflow-hidden shadow-sm shrink-0 rounded-lg">
            <div
              className="flex flex-col justify-end border-b border-r border-light text-center text-sm p-1 h-full w-full relative day-cell transition-all"
              style={{
                backgroundColor: localType.bgColor || "transparent",
                color: localType.textColor || "inherit",
                fontWeight: localType.isBold ? "700" : "400",
                fontStyle: localType.isItalic ? "italic" : "normal",
              }}
            >
              <div className="flex flex-col justify-center items-center h-full">
                <span className="block text-lg">14</span>
                <span className="block text-xs opacity-80">Lun.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Champ d'édition du Libellé */}
      <div className="flex flex-col gap-2">
        <label htmlFor="dayTypeLabelInput" className="text-xs text-secondary font-medium poppins">
          Libellé
        </label>
        <input
          id="dayTypeLabelInput"
          type="text"
          value={localType.label || ""}
          onChange={(e) => handleLabelChange(e.target.value)}
          onBlur={handleLabelBlur}
          placeholder="Ex: Jour Férié, RTT, Modulation..."
          className="border border-default rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-sm bg-transparent shadow-sm hover:shadow-md max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-center">
        {/* Couleur de fond */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-secondary font-medium poppins">Couleur de fond</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={localType.bgColor || "#ffffff"}
              onChange={(e) => handleColorChange("bgColor", e.target.value)}
              onBlur={handleColorBlur}
              className="w-10 h-10 rounded-xl cursor-pointer border border-light p-0.5 bg-white shadow-sm"
            />
            <span className="text-xs text-secondary font-mono uppercase bg-secondary/30 px-2.5 py-1.5 rounded-lg border border-ultra-light">
              {localType.bgColor}
            </span>
          </div>
        </div>

        {/* Couleur du texte */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-secondary font-medium poppins">Couleur du texte</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={localType.textColor || "#000000"}
              onChange={(e) => handleColorChange("textColor", e.target.value)}
              onBlur={handleColorBlur}
              className="w-10 h-10 rounded-xl cursor-pointer border border-light p-0.5 bg-white shadow-sm"
            />
            <span className="text-xs text-secondary font-mono uppercase bg-secondary/30 px-2.5 py-1.5 rounded-lg border border-ultra-light">
              {localType.textColor}
            </span>
          </div>
        </div>

        {/* Style de police */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-secondary font-medium poppins">Mise en forme</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggle("isBold")}
              className={`flex-1 min-h-[40px] px-3 rounded-xl border text-xs font-bold poppins transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 ${
                localType.isBold
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-secondary/20 text-primary border-light hover:bg-secondary/40"
              }`}
            >
              <span>B</span>
              <span className="font-normal text-[11px]">Gras</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggle("isItalic")}
              className={`flex-1 min-h-[40px] px-3 rounded-xl border text-xs italic poppins transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 ${
                localType.isItalic
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-secondary/20 text-primary border-light hover:bg-secondary/40"
              }`}
            >
              <span>I</span>
              <span className="not-italic font-normal text-[11px]">Italique</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isSettingsOpen,
  settings,
  setNotification
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(settings?.[0]?.category || "");
  const [newNonWorkingDate, setNewNonWorkingDate] = useState<string>("");
  const [selectedDayTypeId, setSelectedDayTypeId] = useState<string>("");
  const [selectedEditDayTypeId, setSelectedEditDayTypeId] = useState<string>("");
  const [isAddingDate, setIsAddingDate] = useState<boolean>(false);
  
  const [deletingDates, setDeletingDates] = useState<Record<string, boolean>>({});
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);

  const currentCategoryObj = useMemo(() => {
    return settings.find((cat: any) => cat.category === activeCategory) || settings[0];
  }, [settings, activeCategory]);

  // Chargement API lors de l'ouverture
  useEffect(() => {
    if (isSettingsOpen) {
      settings.forEach((cat: any) => {
        cat.items.forEach((setting: any) => {
          if (setting.type === "day-type-settings" && typeof setting.fetchDayTypes === "function") {
            setting.fetchDayTypes();
          }
        });
      });
    }
  }, [isSettingsOpen, settings]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewNonWorkingDate(e.target.value);
    if (dateErrorMessage) setDateErrorMessage(null);
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={onClose}
      title="Paramètres"
      className="w-[min(95vw,1200px)] h-[85vh] max-h-[850px] overflow-hidden flex flex-col"
      classNameContent="flex-1 overflow-hidden p-4 flex flex-col min-h-0"
    >
      <div className="flex flex-col h-full min-h-0 poppins gap-4">
        
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 flex-1 min-h-0 overflow-hidden">
          
          {/* Navigation latérale */}
          <div className="flex flex-col gap-2 overflow-y-auto pr-1 shrink-0">
            {settings.map((cat: any) => {
              const isActive = (activeCategory || settings[0]?.category) === cat.category;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setActiveCategory(cat.category)}
                  className={`w-full text-left px-4 py-4 rounded-2xl transition-all duration-200 flex items-center justify-between text-sm ${
                    isActive
                      ? "bg-secondary-bg border border-light text-primary font-semibold shadow-md"
                      : "text-secondary hover:bg-secondary/40 font-normal"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isActive && <div className="w-1.5 h-6 bg-primary rounded-full shrink-0" />}
                    <span>{cat.category}</span>
                  </div>
                  {!isActive && (
                    <svg className="w-4 h-4 text-secondary/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          {/* Panneau central */}
          <div className="bg-secondary-bg border border-light rounded-2xl p-6 shadow-sm flex flex-col min-h-0 overflow-y-auto flex-1">
            {currentCategoryObj && (
              <div className="flex flex-col h-full">
                {/* En-tête de catégorie */}
                <div className="flex items-center bg-secondary-bg gap-3 pb-4 mb-6 border-b border-ultra-light shrink-0">
                  <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-medium text-primary poppins">
                    {currentCategoryObj.category}
                  </h3>
                </div>

                {/* Contenu de la catégorie */}
                <div className="space-y-6 flex-1">
                  {currentCategoryObj.items.map((setting: any, settingIdx: number) => (
                    <div
                      key={setting.id}
                      className={`flex flex-col lg:flex-row lg:items-center justify-between py-2 ${
                        settingIdx !== currentCategoryObj.items.length - 1 ? "border-b border-ultra-light pb-4" : ""
                      }`}
                    >
                      {setting.type !== "mobile-appointment-fields" && setting.type !== "day-type-settings" && (
                        <div className="mb-3 lg:mb-0 lg:mr-6 min-w-[200px]">
                          <label htmlFor={setting.id} className="text-base font-medium poppins block">
                            {setting.label}
                          </label>
                          {setting.id === "nonWorkedDay" && (
                            <p className="text-xs text-secondary mt-1 poppins">
                              Définissez les dates et leur type (férié, non travaillé...)
                            </p>
                          )}
                          {setting.id === "tagPlacement" && (
                            <p className="text-xs text-secondary mt-1 poppins">
                              Choisissez comment afficher l'étiquette sur les rendez-vous
                            </p>
                          )}
                        </div>
                      )}

                      {/* CATEGORIE : DATES NON TRAVAILLÉES */}
                      {setting.type === "custom-non-working-dates" ? (
                        <div className="flex flex-col gap-4 w-full">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col sm:flex-row gap-3 items-center">
                              <input
                                type="date"
                                id={setting.id}
                                value={newNonWorkingDate}
                                onChange={handleDateInputChange}
                                className={`border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 transition-all duration-200 flex-1 poppins text-sm bg-transparent shadow-sm hover:shadow-md w-full sm:w-auto ${
                                  dateErrorMessage ? "border-red-500 focus:ring-red-500" : "border-default focus:ring-primary"
                                }`}
                              />

                              <select
                                value={selectedDayTypeId}
                                onChange={(e) => {
                                  setSelectedDayTypeId(e.target.value);
                                  if (dateErrorMessage) setDateErrorMessage(null);
                                }}
                                className="border border-default rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-sm bg-transparent shadow-sm hover:shadow-md w-full sm:w-auto min-w-[160px]"
                              >
                                {setting.dayTypesOptions?.map((dt: any) => (
                                  <option key={dt.id} value={dt.id}>
                                    {dt.label}
                                  </option>
                                ))}
                              </select>

                              <button
                                className="px-6 py-3 cursor-pointer bg-primary text-white rounded-xl active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md hover:shadow-lg flex items-center gap-2 shrink-0 w-full sm:w-auto justify-center"
                                onClick={async () => {
                                  if (!newNonWorkingDate) return;

                                  const formattedInputDate = format(new Date(newNonWorkingDate), "yyyy-MM-dd");

                                  if (setting.nonWorkingDates && setting.nonWorkingDates[formattedInputDate]) {
                                    setDateErrorMessage(`La date du ${format(new Date(newNonWorkingDate), "dd/MM/yyyy")} est déjà enregistrée dans la liste.`);
                                    return;
                                  }

                                  setDateErrorMessage(null);
                                  setIsAddingDate(true);
                                  const parsedDate = new Date(newNonWorkingDate).getTime();
                                  const dayTypeObj = setting.dayTypesOptions?.find((dt: any) => String(dt.id) === String(selectedDayTypeId));
                                  
                                  try {
                                    if (setting.addNonWorkingDatesToPlanning) {
                                      const response = await setting.addNonWorkingDatesToPlanning(parsedDate, selectedDayTypeId);
                                      if (response && response.success && response.data) {
                                        setting.setNonWorkingDates((prev: Record<string, any>) => ({
                                          ...prev,
                                          [formattedInputDate]: {
                                            id: Number(response.data),
                                            typeId: selectedDayTypeId,
                                            typeLabel: dayTypeObj?.label,
                                            bgColor: dayTypeObj?.bgColor,
                                            textColor: dayTypeObj?.textColor,
                                            isBold: dayTypeObj?.isBold,
                                            isItalic: dayTypeObj?.isItalic,
                                          }
                                        }));
                                        setNewNonWorkingDate("");
                                      }
                                    } else {
                                      setting.setNonWorkingDates((prev: Record<string, any>) => ({
                                        ...prev,
                                        [formattedInputDate]: {
                                          id: new Date().getTime(),
                                          typeId: selectedDayTypeId,
                                          typeLabel: dayTypeObj?.label,
                                          bgColor: dayTypeObj?.bgColor,
                                          textColor: dayTypeObj?.textColor,
                                          isBold: dayTypeObj?.isBold,
                                          isItalic: dayTypeObj?.isItalic,
                                        }
                                      }));
                                      setNewNonWorkingDate("");
                                    }
                                  } catch (error) {
                                    console.error("Error adding non-working date:", error);
                                  } finally {
                                    setIsAddingDate(false);
                                  }
                                }}
                                disabled={isAddingDate}
                              >
                                {isAddingDate ? (
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                )}
                                Ajouter
                              </button>
                            </div>

                            {dateErrorMessage && (
                              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium poppins border border-red-200 animate-fadeIn">
                                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{dateErrorMessage}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="bg-secondary/40 rounded-xl p-4 border border-light min-h-[180px]">
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              <h4 className="text-sm font-semibold mb-3 poppins">
                                Jours configurés ({Object.keys(setting.nonWorkingDates || {}).length})
                              </h4>

                              {Object.entries(setting.nonWorkingDates || {}).map(([dateKey, val]: [string, any]) => {
                                const itemObj = typeof val === "object" ? val : { id: val };
                                const dayTypeInfo = setting.dayTypesOptions?.find((dt: any) => String(dt.id) === String(itemObj.typeId)) || itemObj;
                                const isDeletingThisDate = Boolean(deletingDates[dateKey]);

                                return (
                                  <div key={dateKey} className="flex items-center justify-between bg-secondary-bg rounded-xl px-4 py-3 shadow-sm border border-ultra-light hover:shadow-md transition-all duration-200">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                                      <span className="text-sm font-medium poppins">{format(new Date(dateKey), "dd/MM/yyyy")}</span>
                                      
                                      {dayTypeInfo?.label && (
                                        <span
                                          className="px-2.5 py-0.5 rounded-lg text-xs font-medium border border-black/10 poppins"
                                          style={{
                                            backgroundColor: dayTypeInfo.bgColor || "#f3f4f6",
                                            color: dayTypeInfo.textColor || "#374151",
                                            fontWeight: dayTypeInfo.isBold ? "bold" : "normal",
                                            fontStyle: dayTypeInfo.isItalic ? "italic" : "normal",
                                          }}
                                        >
                                          {dayTypeInfo.label}
                                        </span>
                                      )}
                                    </div>

                                    <button
                                      className="text-red-500 hover:text-white hover:bg-red-500 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={isDeletingThisDate}
                                      onClick={async () => {
                                        setDeletingDates(prev => ({ ...prev, [dateKey]: true }));
                                        
                                        try {
                                          if (setting.removeNonWorkingDatesFromPlanning) {
                                            const response = await setting.removeNonWorkingDatesFromPlanning(itemObj.id);
                                            if (response && response.success) {
                                              setting.setNonWorkingDates((prev: any) => {
                                                const newDates = { ...prev };
                                                delete newDates[dateKey];
                                                return newDates;
                                              });
                                            } else {
                                              setNotification(response?.message || "Erreur lors de la suppression de la date");
                                            }
                                          } else {
                                            setting.setNonWorkingDates((prev: any) => {
                                              const newDates = { ...prev };
                                              delete newDates[dateKey];
                                              return newDates;
                                            });
                                          }
                                        } catch (error) {
                                          console.error("Error removing date:", error);
                                        } finally {
                                          setDeletingDates(prev => {
                                            const next = { ...prev };
                                            delete next[dateKey];
                                            return next;
                                          });
                                        }
                                      }}
                                    >
                                      {isDeletingThisDate ? (
                                        <svg className="animate-spin w-3 h-3 text-current" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      )}
                                      Supprimer
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : setting.type === "day-type-settings" ? (
                        /* CATEGORIE : GESTION DES TYPES DE JOURS */
                        <div className="flex flex-col gap-6 w-full">
                          <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-secondary poppins">
                              Sélectionner le type de jour à modifier :
                            </label>
                            <select
                              value={selectedEditDayTypeId || setting.dayTypes?.[0]?.id || ""}
                              onChange={(e) => setSelectedEditDayTypeId(e.target.value)}
                              className="border border-default rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-sm bg-transparent shadow-sm hover:shadow-md w-full max-w-md cursor-pointer font-medium"
                            >
                              {setting.dayTypes?.map((dt: any) => (
                                <option key={dt.id} value={dt.id}>
                                  {dt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {(() => {
                            const currentTypeObj = setting.dayTypes?.find(
                              (dt: any) => String(dt.id) === String(selectedEditDayTypeId || setting.dayTypes?.[0]?.id)
                            ) || setting.dayTypes?.[0];

                            return currentTypeObj ? (
                              <DayTypeSingleEditor key={currentTypeObj.id} dayType={currentTypeObj} />
                            ) : (
                              <p className="text-sm text-secondary italic poppins">
                                Aucun type de jour disponible.
                              </p>
                            );
                          })()}
                        </div>
                      ) : setting.type === "mobile-appointment-fields" ? (
                        /* AFFICHAGE MOBILE */
                        <div className="w-full">
                          {setting.isLoading ? (
                            <Loader size="md" className="min-h-40 rounded-xl border border-light" message="Chargement..." />
                          ) : (
                            <div className="rounded-xl">
                              <div className="space-y-3 md:hidden">
                                <div className="rounded-xl border border-light bg-secondary p-3 text-xs text-secondary">
                                  Activez les champs à afficher dans la carte mobile. Les informations secondaires apparaîtront dans le panneau « Voir plus ».
                                </div>

                                {setting.options?.map((option: { CodeChamp: MobileAppointmentField; Libelle: string }) => {
                                  const primaryChecked = setting.value.primaryFields.includes(option.CodeChamp);
                                  const secondaryChecked = setting.value.secondaryFields.includes(option.CodeChamp);
                                  const updateFields = (column: "primaryFields" | "secondaryFields", checked: boolean) => {
                                    const current = setting.value[column];
                                    const fields = checked
                                      ? [...current, option.CodeChamp]
                                      : current.filter((field: string) => field !== option.CodeChamp);
                                    setting.onChange({ ...setting.value, [column]: fields });
                                  };
                                  return (
                                    <div key={option.CodeChamp} className="rounded-xl border border-ultra-light bg-secondary-bg p-3">
                                      <p className="mb-3 text-sm font-semibold text-primary">{option.Libelle}</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {([["primaryFields", "Principale", primaryChecked], ["secondaryFields", "Secondaire", secondaryChecked]] as const).map(([column, label, checked]) => (
                                          <button
                                            key={column}
                                            type="button"
                                            aria-pressed={checked}
                                            onClick={() => updateFields(column, !checked)}
                                            className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${checked ? "border-primary bg-primary text-white" : "border-light bg-secondary text-secondary"}`}
                                          >
                                            <span className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] ${checked ? "border-white" : "border-secondary"}`} aria-hidden="true">
                                              {checked ? "✓" : ""}
                                            </span>
                                            {label}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}

                                <div className="rounded-xl border-t-2 border-primary bg-secondary-bg p-3">
                                  <div className="mb-3 flex items-center gap-3">
                                    <p className="shrink-0 text-xs font-semibold text-secondary">Prévisualisation</p>
                                    <div className="h-px flex-1 bg-primary/30" aria-hidden="true" />
                                  </div>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <div className="min-w-0 rounded-xl border border-dashed border-light bg-primary/5 p-3">
                                      <p className="mb-3 text-center text-xs font-semibold text-primary">Aperçu (principale)</p>
                                      <div className="min-h-24">
                                        <AppointmentCard
                                          app={previewAppointment}
                                          items={[previewItem]}
                                          employees={[previewEmployee]}
                                          preview
                                          displayConfig={{ primaryFields: setting.value.primaryFields, secondaryFields: [] } as MobileAppointmentDisplayConfig}
                                        />
                                      </div>
                                    </div>
                                    <div className="min-w-0 rounded-xl border border-dashed border-light bg-secondary/30 p-3">
                                      <p className="mb-3 text-center text-xs font-semibold text-primary">Aperçu (secondaire)</p>
                                      <div className="min-h-24">
                                        <AppointmentCard
                                          app={previewAppointment}
                                          items={[previewItem]}
                                          employees={[previewEmployee]}
                                          preview
                                          showCard={false}
                                          displayConfig={{ primaryFields: [], secondaryFields: setting.value.secondaryFields } as MobileAppointmentDisplayConfig}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <table className="hidden w-full min-w-[580px] table-fixed border-separate border-spacing-y-1 text-sm md:table">
                                <colgroup>
                                  <col className="w-[30%]" />
                                  <col className="w-[35%]" />
                                  <col className="w-[35%]" />
                                </colgroup>
                                <thead className="border-t-4 border-primary">
                                  <tr className="border-b-2 border-light bg-secondary-bg text-left">
                                    <th className="sticky top-0 z-10 bg-secondary-bg px-3 py-3 font-semibold">Champs</th>
                                    <th className="sticky top-0 z-10 border-l-2 border-light bg-secondary-bg px-3 py-3 text-center font-semibold">Principale</th>
                                    <th className="sticky top-0 z-10 border-l-2 border-light bg-secondary-bg px-3 py-3 text-center font-semibold">Secondaire</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {setting.options?.map((option: { CodeChamp: MobileAppointmentField; Libelle: string }) => {
                                    const primaryChecked = setting.value.primaryFields.includes(option.CodeChamp);
                                    const secondaryChecked = setting.value.secondaryFields.includes(option.CodeChamp);
                                    const updateFields = (column: "primaryFields" | "secondaryFields", checked: boolean) => {
                                      const current = setting.value[column];
                                      const fields = checked
                                        ? [...current, option.CodeChamp]
                                        : current.filter((field: string) => field !== option.CodeChamp);
                                      setting.onChange({ ...setting.value, [column]: fields });
                                    };
                                    return (
                                      <tr key={option.CodeChamp} className="border-b border-ultra-light">
                                        <td className="px-3 py-3">{option.Libelle}</td>
                                        <td className="border-l-2 border-light px-3 py-3 text-center align-middle">
                                          <div className="mx-auto grid w-[100px] grid-cols-[28px_1fr] items-center gap-2">
                                            <button
                                              className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${primaryChecked ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}`}
                                              type="button"
                                              aria-pressed={primaryChecked}
                                              aria-label={`${option.Libelle} dans l'affichage principal`}
                                              onClick={() => updateFields("primaryFields", !primaryChecked)}
                                            >
                                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M5 12l4 4L19 6" />
                                              </svg>
                                            </button>
                                            <span className="whitespace-nowrap">{primaryChecked ? "Affiché" : "Masqué"}</span>
                                          </div>
                                        </td>
                                        <td className="border-l-2 border-light px-3 py-3 text-center align-middle">
                                          <div className="mx-auto grid w-[100px] grid-cols-[28px_1fr] items-center gap-2">
                                            <button
                                              className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${secondaryChecked ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}`}
                                              type="button"
                                              aria-pressed={secondaryChecked}
                                              aria-label={`${option.Libelle} dans l'affichage secondaire`}
                                              onClick={() => updateFields("secondaryFields", !secondaryChecked)}
                                            >
                                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M5 12l4 4L19 6" />
                                              </svg>
                                            </button>
                                            <span className="whitespace-nowrap">{secondaryChecked ? "Masqué" : "Masqué"}</span>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot>
                                  <tr>
                                    <td colSpan={3} className="border-t-2 border-light px-3 pt-5">
                                      <div className="flex items-center gap-3">
                                        <span className="shrink-0 text-xs font-semibold text-secondary">Prévisualisation</span>
                                        <div className="h-px flex-1 bg-primary/30" aria-hidden="true" />
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan={3} className="px-3 pt-3 align-top">
                                      <div className="grid w-full grid-cols-2 gap-4">
                                        <div className="min-h-32 min-w-0 rounded-xl border border-dashed border-light bg-primary/5 p-3">
                                          <p className="mb-3 text-center text-xs font-semibold text-primary">Aperçu (principale)</p>
                                          <AppointmentCard
                                            app={previewAppointment}
                                            items={[previewItem]}
                                            employees={[previewEmployee]}
                                            preview
                                            displayConfig={{
                                              primaryFields: setting.value.primaryFields,
                                              secondaryFields: [],
                                            } as MobileAppointmentDisplayConfig}
                                          />
                                        </div>
                                        <div className="min-h-32 min-w-0 rounded-xl border border-dashed border-light bg-secondary/30 p-3">
                                          <p className="mb-3 text-center text-xs font-semibold text-primary">Aperçu (secondaire)</p>
                                          <AppointmentCard
                                            app={previewAppointment}
                                            items={[previewItem]}
                                            employees={[previewEmployee]}
                                            preview
                                            showCard={false}
                                            displayConfig={{
                                              primaryFields: [],
                                              secondaryFields: setting.value.secondaryFields,
                                            } as MobileAppointmentDisplayConfig}
                                          />
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          )}
                        </div>
                      ) : setting.type === "select" ? (
                        <select
                          id={setting.id}
                          className="border border-default rounded-xl px-4 py-3 text-sm bg-transparent shadow-sm"
                          value={setting.value}
                          onChange={e => setting.onChange(e.target.value)}
                        >
                          {setting.options?.map((option: any) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={setting.id}
                          type={setting.type}
                          className="border border-default rounded-xl px-4 py-3 text-sm bg-transparent shadow-sm w-48"
                          value={setting.value}
                          onChange={e => setting.onChange(e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end pt-3 border-t border-ultra-light shrink-0">
          <button
            className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default memo(SettingsModal);