import { memo, useState, useMemo, useEffect, useRef } from "react";
import Modal from "./Modal";
import Loader from "../ui/Loader";
import { format, isBefore, startOfDay } from "date-fns";
import { Appointment, DayType, Item, MobileAppointmentDisplayConfig, MobileAppointmentField, User } from "../../types";
import { AppointmentCard } from "../Calendar/MobileCalendar/AppointmentList";

type SettingsModalProps = {
  onClose: () => void;
  settings: any;
  isSettingsOpen: boolean;
};

const normalizeColorForInput = (color: string | undefined, fallback: string = '#1E40AF'): string => {
  if (!color) return fallback;
  if (color.length === 9 && color.startsWith('#')) {
    return color.substring(0, 7);
  }
  if (!color.startsWith('#') && (color.length === 6 || color.length === 3)) {
    return `#${color}`;
  }
  return color;
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
  ChefChantier: "Dupont Jean",
  ChargeAffaire: "Durand Marie",
} as Item;

const previewEmployee: User = {
  IdPersonnel: 1,
  Nom: "Martin",
  Prenom: "Camille",
  PoleActivite: null,
  Type: "SALARIE",
  Equipe: null,
};

const MobileDisplayEditor = ({ 
  setting, 
  registerSaveAction 
}: { 
  setting: any, 
  registerSaveAction: (action: { isDirty: boolean; save: () => Promise<void> } | null) => void 
}) => {
  const [localValue, setLocalValue] = useState<MobileAppointmentDisplayConfig>(setting.value);

  useEffect(() => {
    setLocalValue(setting.value);
  }, [setting.value]);

  const isDirty = 
    JSON.stringify(localValue.primaryFields) !== JSON.stringify(setting.value.primaryFields) ||
    JSON.stringify(localValue.secondaryFields) !== JSON.stringify(setting.value.secondaryFields);

  useEffect(() => {
    registerSaveAction({
      isDirty,
      save: async () => {
        await setting.onChange(localValue);
      }
    });

    return () => {
      registerSaveAction(null);
    };
  }, [isDirty, localValue, setting, registerSaveAction]);

  const updateFields = (column: "primaryFields" | "secondaryFields", optionCode: string, checked: boolean) => {
    setLocalValue((prev: any) => {
      const current = prev[column];
      const fields = checked
        ? [...current, optionCode]
        : current.filter((field: string) => field !== optionCode);
      return { ...prev, [column]: fields };
    });
  };

  if (setting.isLoading) {
    return <Loader size="md" className="min-h-40 rounded-xl border border-light" message="Chargement..." />;
  }

  const optionsCount = setting.options?.length || 0;

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="rounded-xl">
        <div className="space-y-3 md:hidden">
          <div className="rounded-xl border border-light bg-secondary p-3 text-xs text-secondary">
            Activez les champs à afficher dans la carte mobile. Les informations secondaires apparaîtront dans le panneau « Voir plus ».
          </div>

          {setting.options?.map((option: { CodeChamp: MobileAppointmentField; Libelle: string }) => {
            const primaryChecked = localValue.primaryFields.includes(option.CodeChamp);
            const secondaryChecked = localValue.secondaryFields.includes(option.CodeChamp);
            
            return (
              <div key={option.CodeChamp} className="rounded-xl border border-ultra-light bg-secondary-bg p-3">
                <p className="mb-3 text-sm font-semibold text-primary">{option.Libelle}</p>
                <div className="grid grid-cols-2 gap-2">
                  {([["primaryFields", "Principale", primaryChecked], ["secondaryFields", "Secondaire", secondaryChecked]] as const).map(([column, label, checked]) => (
                    <button
                      key={column}
                      type="button"
                      aria-pressed={checked}
                      onClick={() => updateFields(column, option.CodeChamp, !checked)}
                      className={`flex min-h-10 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 cursor-pointer ${checked ? "border-primary bg-primary text-white" : "border-light bg-secondary text-secondary"}`}
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

          <div className="rounded-xl border-t-2 border-primary bg-secondary-bg p-3 space-y-3">
            <div className="flex items-center gap-3">
              <p className="shrink-0 text-xs font-semibold text-secondary uppercase tracking-wider">Prévisualisation</p>
              <div className="h-px flex-1 bg-primary/30" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-dashed border-light bg-primary/5 p-3">
                <p className="mb-2 text-center text-xs font-semibold text-primary">Aperçu (principale)</p>
                <AppointmentCard
                  app={previewAppointment}
                  items={[previewItem]}
                  employees={[previewEmployee]}
                  preview
                  displayConfig={{ primaryFields: localValue.primaryFields, secondaryFields: [] } as MobileAppointmentDisplayConfig}
                />
              </div>
              <div className="min-w-0 rounded-xl border border-dashed border-light bg-secondary/30 p-3">
                <p className="mb-2 text-center text-xs font-semibold text-primary">Aperçu (secondaire)</p>
                <AppointmentCard
                  app={previewAppointment}
                  items={[previewItem]}
                  employees={[previewEmployee]}
                  preview
                  showCard={false}
                  displayConfig={{ primaryFields: [], secondaryFields: localValue.secondaryFields } as MobileAppointmentDisplayConfig}
                />
              </div>
            </div>
          </div>
        </div>

        <table className="hidden w-full table-fixed border-separate border-spacing-y-1 text-sm md:table">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[21%]" />
            <col className="w-[21%]" />
            <col className="w-[30%]" />
          </colgroup>
          <thead className="border-t-4 border-primary">
            <tr className="border-b-2 border-light bg-secondary-bg text-left">
              <th className="sticky top-0 z-10 bg-secondary-bg px-3 py-3 font-semibold">Champs</th>
              <th className="sticky top-0 z-10 border-l-2 border-light bg-secondary-bg px-3 py-3 text-center font-semibold">Principale</th>
              <th className="sticky top-0 z-10 border-l-2 border-light bg-secondary-bg px-3 py-3 text-center font-semibold">Secondaire</th>
              <th className="sticky top-0 z-10 border-l-2 border-light bg-secondary-bg px-3 py-3 text-center font-semibold">Prévisualisation</th>
            </tr>
          </thead>
          <tbody>
            {setting.options?.map((option: { CodeChamp: MobileAppointmentField; Libelle: string }, index: number) => {
              const primaryChecked = localValue.primaryFields.includes(option.CodeChamp);
              const secondaryChecked = localValue.secondaryFields.includes(option.CodeChamp);
              
              return (
                <tr key={option.CodeChamp} className="border-b border-ultra-light">
                  <td className="px-3 py-3 font-medium text-primary">{option.Libelle}</td>
                  
                  <td className="border-l-2 border-light px-3 py-3 text-center align-middle">
                    <div className="mx-auto grid w-[100px] grid-cols-[28px_1fr] items-center gap-2">
                      <button
                        className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${primaryChecked ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}`}
                        type="button"
                        aria-pressed={primaryChecked}
                        aria-label={`${option.Libelle} dans l'affichage principal`}
                        onClick={() => updateFields("primaryFields", option.CodeChamp, !primaryChecked)}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12l4 4L19 6" />
                        </svg>
                      </button>
                      <span className="whitespace-nowrap text-xs">{primaryChecked ? "Affiché" : "Masqué"}</span>
                    </div>
                  </td>

                  <td className="border-l-2 border-light px-3 py-3 text-center align-middle">
                    <div className="mx-auto grid w-[100px] grid-cols-[28px_1fr] items-center gap-2">
                      <button
                        className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${secondaryChecked ? "bg-primary text-white" : "bg-gray-200 text-gray-500"}`}
                        type="button"
                        aria-pressed={secondaryChecked}
                        aria-label={`${option.Libelle} dans l'affichage secondaire`}
                        onClick={() => updateFields("secondaryFields", option.CodeChamp, !secondaryChecked)}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12l4 4L19 6" />
                        </svg>
                      </button>
                      <span className="whitespace-nowrap text-xs">{secondaryChecked ? "Affiché" : "Masqué"}</span>
                    </div>
                  </td>

                  {index === 0 && (
                    <td rowSpan={optionsCount} className="border-l-2 border-light p-3 align-top bg-secondary-bg/30">
                      <div className="sticky top-4 flex flex-col gap-3">
                        <div className="min-w-0 rounded-xl border border-dashed border-light bg-primary/5 p-3">
                          <p className="mb-2 text-center text-xs font-semibold text-primary">Aperçu (principale)</p>
                          <AppointmentCard
                            app={previewAppointment}
                            items={[previewItem]}
                            employees={[previewEmployee]}
                            preview
                            displayConfig={{
                              primaryFields: localValue.primaryFields,
                              secondaryFields: [],
                            } as MobileAppointmentDisplayConfig}
                          />
                        </div>

                        <div className="min-w-0 rounded-xl border border-dashed border-light bg-secondary/30 p-3">
                          <p className="mb-2 text-center text-xs font-semibold text-primary">Aperçu (secondaire)</p>
                          <AppointmentCard
                            app={previewAppointment}
                            items={[previewItem]}
                            employees={[previewEmployee]}
                            preview
                            showCard={false}
                            displayConfig={{
                              primaryFields: [],
                              secondaryFields: localValue.secondaryFields,
                            } as MobileAppointmentDisplayConfig}
                          />
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const NewDayTypeForm = ({
  onAdd,
  setError,
}: {
  onAdd?: (newType: any) => Promise<{ success: boolean; message?: string }>;
  setError: (msg: string | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [Libelle, setLibelle] = useState("");
  const [CouleurFond, setCouleurFond] = useState("#2563eb");
  const [CouleurTexte, setCouleurTexte] = useState("#ffffff");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setLibelle("");
    setCouleurFond("#2563eb");
    setCouleurTexte("#ffffff");
    setIsBold(false);
    setIsItalic(false);
    setFormError(null);
  };

  const handleCreate = async () => {
    if (!Libelle.trim()) {
      setFormError("Le libellé est obligatoire.");
      return;
    }
    setFormError(null);
    setError(null);
    setIsSubmitting(true);

    try {
      if (onAdd) {
        const res = await onAdd({
          Libelle: Libelle.trim(),
          CouleurFond: normalizeColorForInput(CouleurFond),
          CouleurTexte: normalizeColorForInput(CouleurTexte),
          isBold: isBold,
          isItalic: isItalic,
        });

        if (res && res.success) {
          resetForm();
          setIsOpen(false);
        } else {
          setError(res?.message || "Erreur lors de la création du type de jour.");
        }
      }
    } catch (e: any) {
      setError(e?.message || "Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-sm poppins flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] shadow-sm mb-4 cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Ajouter un type de jour
      </button>
    );
  }

  return (
    <div className="p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-4 shadow-sm mb-4">
      <div className="flex items-center justify-between pb-2 border-b border-primary/20">
        <h4 className="text-sm font-semibold text-primary poppins flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nouveau type de jour
        </h4>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          className="text-secondary hover:text-primary transition-colors p-1 cursor-pointer"
          title="Fermer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <label htmlFor="newDayTypeLabel" className="text-xs text-secondary font-medium poppins">
              Libellé
            </label>
            <input
              id="newDayTypeLabel"
              type="text"
              value={Libelle}
              onChange={(e) => {
                setLibelle(e.target.value);
                if (formError) setFormError(null);
                setError(null);
              }}
              placeholder="Ex: Astreinte, Congé..."
              className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-xs bg-white shadow-sm hover:shadow-md w-full"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-color-fond-hex" className="text-xs text-secondary font-medium poppins">
              Couleur Fond
            </label>
            <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
              <label 
                htmlFor="new-color-fond"
                className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
                style={{ backgroundColor: normalizeColorForInput(CouleurFond) }}
                title="Choisir couleur de fond"
              />
              <input
                id="new-color-fond"
                type="color"
                value={normalizeColorForInput(CouleurFond)}
                onChange={(e) => setCouleurFond(e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              />
              <input
                id="new-color-fond-hex"
                type="text"
                value={CouleurFond}
                onChange={(e) => setCouleurFond(e.target.value)}
                placeholder="#2563EB"
                className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="new-color-texte-hex" className="text-xs text-secondary font-medium poppins">
              Couleur Texte
            </label>
            <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
              <label 
                htmlFor="new-color-texte"
                className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
                style={{ backgroundColor: normalizeColorForInput(CouleurTexte, '#FFFFFF') }}
                title="Choisir couleur de texte"
              />
              <input
                id="new-color-texte"
                type="color"
                value={normalizeColorForInput(CouleurTexte, '#FFFFFF')}
                onChange={(e) => setCouleurTexte(e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
              />
              <input
                id="new-color-texte-hex"
                type="text"
                value={CouleurTexte}
                onChange={(e) => setCouleurTexte(e.target.value)}
                placeholder="#FFFFFF"
                className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium poppins">Style</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsBold((prev) => !prev)}
                title="Gras"
                className={`h-9 px-3.5 rounded-xl border text-sm font-black poppins transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                  isBold
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-primary border-light hover:bg-secondary/10"
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => setIsItalic((prev) => !prev)}
                title="Italique"
                className={`h-9 px-3.5 rounded-xl border text-sm italic font-serif transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                  isItalic
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-primary border-light hover:bg-secondary/10"
                }`}
              >
                I
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-secondary font-medium poppins">Aperçu</span>
            <div className="w-12 h-12 border border-light rounded-xl overflow-hidden shrink-0 shadow-sm bg-white">
              <div
                className="flex flex-col justify-center items-center h-full w-full text-center relative transition-all p-1"
                style={{
                  backgroundColor: normalizeColorForInput(CouleurFond, '#2563eb'),
                  color: normalizeColorForInput(CouleurTexte, '#ffffff'),
                  fontWeight: isBold ? "700" : "400",
                  fontStyle: isItalic ? "italic" : "normal",
                }}
              >
                <span className="block text-sm leading-none font-semibold">14</span>
                <span className="block text-[9px] opacity-80 uppercase tracking-wider mt-0.5">Lun.</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            <span className="text-xs font-medium poppins opacity-0 pointer-events-none select-none hidden sm:block">
              Action
            </span>
            <div className="flex items-center h-full">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSubmitting}
                title="Valider la création"
                className="cursor-pointer bg-primary text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {formError && (
        <p className="text-xs text-red-500 font-medium poppins">{formError}</p>
      )}
    </div>
  );
};

const DayTypeSingleEditor = ({
  dayType,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  setError,
}: {
  dayType: DayType;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate?: (updated: any) => Promise<{ success: boolean; message?: string }>;
  onDelete?: (id: number | string) => Promise<{ success: boolean; message?: string }>;
  setError: (msg: string | null) => void;
}) => {
  const [localType, setLocalType] = useState(dayType);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setLocalType(dayType);
  }, [dayType]);

  const isDirty =
    localType.Libelle !== dayType.Libelle ||
    localType.CouleurFond !== dayType.CouleurFond ||
    localType.CouleurTexte !== dayType.CouleurTexte ||
    localType.isBold !== dayType.isBold ||
    localType.isItalic !== dayType.isItalic;

  const handleLabelChange = (value: string) => {
    setLocalType((prev: any) => ({ ...prev, Libelle: value }));
    setError(null);
  };

  const handleColorChange = (key: "CouleurFond" | "CouleurTexte", value: string) => {
    setLocalType((prev: any) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleToggle = (key: "isBold" | "isItalic") => {
    setLocalType((prev: any) => ({ ...prev, [key]: !prev[key] }));
    setError(null);
  };

  const handleSave = async () => {
    if (!onUpdate) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await onUpdate({
        ...localType,
        CouleurFond: normalizeColorForInput(localType.CouleurFond),
        CouleurTexte: normalizeColorForInput(localType.CouleurTexte),
      });
      if (res && !res.success) {
        setError(res?.message || "Erreur lors de la mise à jour.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la mise à jour.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!onDelete) return;
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setError(null);
    try {
      const res = await onDelete(dayType.Id);
      if (res && !res.success) {
        setError(res?.message || "Erreur lors de la suppression.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-wrap items-center justify-between gap-3 shadow-sm relative ${isSelected ? 'border-primary bg-primary/10 ' : 'border-light bg-secondary/10 hover:border-primary/30'}`}>
      
      {/* Pop-up confirmation suppression Type de jour */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">Supprimer le type de jour ?</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed poppins">
              Êtes-vous sûr de vouloir supprimer le type de jour <strong className="text-primary">{dayType.Libelle}</strong> ? Cette action est irréversible.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer poppins"
                onClick={confirmDelete}
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label htmlFor={`dayTypeLabelInput-${dayType.Id}`} className="text-xs text-secondary font-medium poppins">
            Libellé
          </label>
          <input
            id={`dayTypeLabelInput-${dayType.Id}`}
            type="text"
            value={localType.Libelle || ""}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Ex: Jour Férié..."
            className="border border-default rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-xs bg-white shadow-sm hover:shadow-md w-full"
            disabled={dayType.isLocked}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Couleur Fond</span>
          <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
            <label 
              htmlFor={`color-fond-${dayType.Id}`}
              className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
              style={{ backgroundColor: normalizeColorForInput(localType.CouleurFond, '#1E40AF') }}
              title="Changer couleur de fond"
            />
            <input
              id={`color-fond-${dayType.Id}`}
              type="color"
              value={normalizeColorForInput(localType.CouleurFond)}
              onChange={(e) => handleColorChange("CouleurFond", e.target.value)}
              className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
            />
            <input
              type="text"
              value={localType.CouleurFond || ""}
              onChange={(e) => handleColorChange("CouleurFond", e.target.value)}
              placeholder="#1E40AF"
              className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Couleur Texte</span>
          <div className="flex items-center gap-1.5 bg-white border border-default rounded-xl p-1 shadow-sm">
            <label 
              htmlFor={`color-texte-${dayType.Id}`}
              className="w-6 h-6 rounded-lg border border-default cursor-pointer hover:scale-105 transition-transform shrink-0 shadow-sm"
              style={{ backgroundColor: normalizeColorForInput(localType.CouleurTexte, '#FFFFFF') }}
              title="Changer couleur de texte"
            />
            <input
              id={`color-texte-${dayType.Id}`}
              type="color"
              value={normalizeColorForInput(localType.CouleurTexte, '#FFFFFF')}
              onChange={(e) => handleColorChange("CouleurTexte", e.target.value)}
              className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
            />
            <input
              type="text"
              value={localType.CouleurTexte || ""}
              onChange={(e) => handleColorChange("CouleurTexte", e.target.value)}
              placeholder="#FFFFFF"
              className="w-20 px-1 py-0.5 text-xs font-mono font-semibold text-primary uppercase focus:outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Style</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleToggle("isBold")}
              title="Gras"
              className={`h-9 px-3.5 rounded-xl border text-sm font-black poppins transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                localType.isBold
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-primary border-light hover:bg-secondary/10"
              }`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => handleToggle("isItalic")}
              title="Italique"
              className={`h-9 px-3.5 rounded-xl border text-sm italic font-serif transition-all duration-150 cursor-pointer flex items-center justify-center active:scale-95 ${
                localType.isItalic
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-primary border-light hover:bg-secondary/10"
              }`}
            >
              I
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-medium poppins">Aperçu</span>
          <div className="w-12 h-12 border border-light rounded-xl overflow-hidden shrink-0 shadow-sm bg-white">
            <div
              className="flex flex-col justify-center items-center h-full w-full text-center relative transition-all p-1"
              style={{
                backgroundColor: normalizeColorForInput(localType.CouleurFond, '#1E40AF'),
                color: normalizeColorForInput(localType.CouleurTexte, '#FFFFFF'),
                fontWeight: localType.isBold ? "700" : "400",
                fontStyle: localType.isItalic ? "italic" : "normal",
              }}
            >
              <span className="block text-xs leading-none font-semibold">14</span>
              <span className="block text-[9px] opacity-80 uppercase tracking-wider mt-0.5">Lun.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 shrink-0">
        <span className="text-xs font-medium poppins opacity-0 pointer-events-none select-none hidden sm:block">
          Actions
        </span>
        
        <div className="flex items-center gap-2 h-full">
          {isDirty ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              title="Enregistrer les modifications"
              className="cursor-pointer bg-primary text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ) : !dayType.isLocked ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              title="Supprimer ce type de jour"
              className="cursor-pointer bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
            >
              {isDeleting ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onSelect}
            className={`px-3 py-2 rounded-xl text-xs font-semibold poppins transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isSelected 
                ? "bg-primary text-white ring-2 ring-primary/20" 
                : "bg-white border border-light hover:bg-primary/5 text-primary"
            }`}
          >
            <span>Voir les jours</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const NonWorkingDaysEditor = ({
  setting,
  selectedDayTypeId,
  setSelectedDayTypeId,
  setError,
}: {
  setting: any;
  selectedDayTypeId: string | null;
  setSelectedDayTypeId: (id: string | null) => void;
  setError: (msg: string | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYearsState, setAvailableYearsState] = useState<number[]>([]);
  const [newDate, setNewDate] = useState<string>("");
  const [newTypeId, setNewTypeId] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingYear, setIsLoadingYear] = useState(false);
  const [deletingDates, setDeletingDates] = useState<Record<string, boolean>>({});
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);

  // Pop-up confirmation suppression Date
  const [pendingDeleteDate, setPendingDeleteDate] = useState<{
    dateKey: string;
    id: number | string;
    formattedDate: string;
  } | null>(null);

  // État d'activation du panneau droit (vrai si un type est choisi à gauche OU si le filtre est modifié)
  const [hasInteracted, setHasInteracted] = useState<boolean>(Boolean(selectedDayTypeId));

  // Filtre par type de jour (défaut 'all')
  const [filterType, setFilterType] = useState<string>(selectedDayTypeId || "all");

  // Synchronisation lors de la sélection via "Voir les jours"
  useEffect(() => {
    if (selectedDayTypeId) {
      setHasInteracted(true);
      setFilterType(selectedDayTypeId);
      setNewTypeId(selectedDayTypeId);
    }
  }, [selectedDayTypeId]);

  // Édition
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>("");
  const [editTypeIdValue, setEditTypeIdValue] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Pop-up confirmation date antérieure
  const [pendingPastDateAction, setPendingPastDateAction] = useState<{
    type: "add" | "edit";
    dateStr: string;
    typeId: string;
    originalKey?: string;
    originalVal?: any;
  } | null>(null);

  const settingRef = useRef(setting);
  useEffect(() => {
    settingRef.current = setting;
  }, [setting]);

  useEffect(() => {
    const fetchYears = settingRef.current.getAvailablesYearForNonWorkingDate || settingRef.current.fetchAvailableYears;
    if (typeof fetchYears === "function") {
      fetchYears().then((res: any) => {
        if (Array.isArray(res)) {
          setAvailableYearsState(res);
        } else if (res && res.success && Array.isArray(res.data)) {
          setAvailableYearsState(res.data);
        }
      }).catch(() => {});
    }
  }, []);

  const availableYears: number[] = useMemo(() => {
    if (availableYearsState.length > 0) return availableYearsState;
    if (setting.availableYears && setting.availableYears.length > 0) {
      return setting.availableYears;
    }
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, [availableYearsState, setting.availableYears]);

  useEffect(() => {
    const currentSetting = settingRef.current;
    const fetchDays = currentSetting.fetchNonWorkingDays || currentSetting.fetchNonWorkingDates;

    if (typeof fetchDays === "function") {
      setIsLoadingYear(true);
      setError(null);

      fetchDays(selectedYear)
        .then((res: any) => {
          if (res && !res.success && res.message) {
            setError(res.message);
          }
          if (res && res.data) {
            const nonWorkingDates = res.data.nonWorkingDates || [];
            const recordData = Object.fromEntries(
              nonWorkingDates.map((item: { DatePlanningJourNontravaille: any; IdPlanningJourNontravaille: string; TypeJourCode: string; }) => [
                item.DatePlanningJourNontravaille,
                { Id: Number(item.IdPlanningJourNontravaille), TypeJourCode: item.TypeJourCode }
              ])
            );
            currentSetting.setNonWorkingDates(recordData);
          }
        })
        .catch((err: any) => {
          setError(err?.message || "Erreur lors de la récupération des jours.");
        })
        .finally(() => {
          setIsLoadingYear(false);
        });
    }
  }, [selectedYear, setError]);

  // Jours filtrés
  const filteredDates = useMemo(() => {
    const dates = setting.nonWorkingDates || {};
    return Object.entries(dates).filter(([dateKey, val]: [string, any]) => {
      const year = new Date(dateKey).getFullYear();
      const itemObj = typeof val === "object" ? val : { TypeJourCode: val };
      
      const matchYear = year === Number(selectedYear);
      const matchType = filterType === "all" || String(itemObj.TypeJourCode) === String(filterType);

      return matchYear && matchType;
    });
  }, [setting.nonWorkingDates, selectedYear, filterType]);

  const resetForm = () => {
    setNewDate("");
    setDateErrorMessage(null);
  };

  const handleFilterTypeChange = (newType: string) => {
    setHasInteracted(true);
    setFilterType(newType);
    if (newType !== "all") {
      setNewTypeId(newType);
    }
    if (selectedDayTypeId && String(selectedDayTypeId) !== String(newType)) {
      setSelectedDayTypeId(null);
    }
  };

  const executeAddDate = async (dateStr: string, typeId: string) => {
    const formattedInputDate = format(new Date(dateStr), "yyyy-MM-dd");

    setDateErrorMessage(null);
    setError(null);
    setIsAdding(true);

    const parsedDate = new Date(dateStr).getTime();

    try {
      if (setting.addNonWorkingDatesToPlanning) {
        const response = await setting.addNonWorkingDatesToPlanning(
          parsedDate,
          typeId
        );
        if (response && response.success && response.data) {
          setting.setNonWorkingDates((prev: any) => {
            const updated = {
              ...prev,
              [formattedInputDate]: {
                Id: Number(response.data),
                TypeJourCode: typeId,
              },
            };

            const sortedKeys = Object.keys(updated).sort((a, b) => 
              new Date(a).getTime() - new Date(b).getTime()
            );

            return sortedKeys.reduce((acc: Record<string, any>, key) => {
              acc[key] = updated[key];
              return acc;
            }, {});
          });
          setAvailableYearsState((prev) => {
            const yearToAdd = new Date(dateStr).getFullYear();
            if (!prev.includes(yearToAdd)) {
              return [...prev, yearToAdd].sort((a, b) => a - b);
            }
            return prev;
          });
          resetForm();
          setIsOpen(false);
        } else {
          setError(response?.message || "Erreur lors de l'ajout de la date.");
        }
      }
    } catch (error: any) {
      setError(error?.message || "Erreur réseau lors de l'ajout de la date.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddDate = async () => {
    if (!newDate) {
      setDateErrorMessage("Veuillez choisir une date.");
      return;
    }

    const selectedTypeForAdd = newTypeId || selectedDayTypeId || setting.dayTypesOptions?.[0]?.Id;

    if (!selectedTypeForAdd) {
      setDateErrorMessage("Veuillez choisir un type de jour.");
      return;
    }

    const formattedInputDate = format(new Date(newDate), "yyyy-MM-dd");

    if (setting.nonWorkingDates && setting.nonWorkingDates[formattedInputDate]) {
      setDateErrorMessage(
        `La date du ${format(new Date(newDate), "dd/MM/yyyy")} est déjà enregistrée.`
      );
      return;
    }

    const inputDateStart = startOfDay(new Date(newDate));
    const todayStart = startOfDay(new Date());

    if (isBefore(inputDateStart, todayStart)) {
      setPendingPastDateAction({
        type: "add",
        dateStr: newDate,
        typeId: String(selectedTypeForAdd),
      });
      return;
    }

    await executeAddDate(newDate, String(selectedTypeForAdd));
  };

  const handleStartEdit = (dateKey: string, currentVal: any) => {
    const itemObj = typeof currentVal === "object" ? currentVal : { TypeJourCode: currentVal };
    setEditingDateKey(dateKey);
    setEditDateValue(dateKey);
    setEditTypeIdValue(String(itemObj.TypeJourCode || selectedDayTypeId || setting.dayTypesOptions?.[0]?.Id || ""));
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingDateKey(null);
    setEditDateValue("");
    setEditTypeIdValue("");
  };

  const executeSaveEdit = async (originalDateKey: string, originalVal: any, newDateValueStr: string, newTypeIdStr: string) => {
    const formattedNewDate = format(new Date(newDateValueStr), "yyyy-MM-dd");
    const itemObj = typeof originalVal === "object" ? originalVal : { id: originalVal };
    const dateId = itemObj.Id || itemObj.id;

    setIsSavingEdit(true);
    setError(null);

    try {
      if (setting.updateNonWorkingDate) {
        const response = await setting.updateNonWorkingDate({
          id: dateId,
          date: new Date(newDateValueStr),
          typeJourCode: newTypeIdStr,
        });

        if (!response || !response.success) {
          setError(response?.message || "Erreur lors de la modification du jour.");
          setIsSavingEdit(false);
          return;
        }
      }

      setting.setNonWorkingDates((prev: any) => {
        const updated = { ...prev };
        delete updated[originalDateKey];
        
        updated[formattedNewDate] = {
          Id: dateId,
          TypeJourCode: newTypeIdStr,
        };

        const sortedKeys = Object.keys(updated).sort((a, b) => 
          new Date(a).getTime() - new Date(b).getTime()
        );

        return sortedKeys.reduce((acc: Record<string, any>, key) => {
          acc[key] = updated[key];
          return acc;
        }, {});
      });

      handleCancelEdit();
    } catch (error: any) {
      setError(error?.message || "Erreur lors de la mise à jour du jour.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveEdit = async (originalDateKey: string, originalVal: any) => {
    if (!editDateValue || !editTypeIdValue) return;

    const formattedNewDate = format(new Date(editDateValue), "yyyy-MM-dd");

    if (formattedNewDate !== originalDateKey && setting.nonWorkingDates?.[formattedNewDate]) {
      setError(`La date du ${format(new Date(editDateValue), "dd/MM/yyyy")} existe déjà.`);
      return;
    }

    const inputDateStart = startOfDay(new Date(editDateValue));
    const todayStart = startOfDay(new Date());

    if (isBefore(inputDateStart, todayStart)) {
      setPendingPastDateAction({
        type: "edit",
        dateStr: editDateValue,
        typeId: editTypeIdValue,
        originalKey: originalDateKey,
        originalVal: originalVal,
      });
      return;
    }

    await executeSaveEdit(originalDateKey, originalVal, editDateValue, editTypeIdValue);
  };

  const executeDeleteDate = async (dateKey: string, dateId: number | string) => {
    setDeletingDates(prev => ({ ...prev, [dateKey]: true }));
    setError(null);
    
    try {
      if (setting.removeNonWorkingDatesFromPlanning) {
        const response = await setting.removeNonWorkingDatesFromPlanning(dateId);
        if (response && response.success) {
          setting.setNonWorkingDates((prev: any) => {
            const newDates = { ...prev };
            delete newDates[dateKey];
            return newDates;
          });
        } else {
          setError(response?.message || "Erreur lors de la suppression.");
        }
      } else {
        setting.setNonWorkingDates((prev: any) => {
          const newDates = { ...prev };
          delete newDates[dateKey];
          return newDates;
        });
      }
    } catch (error: any) {
      setError(error?.message || "Erreur lors de la suppression.");
    } finally {
      setDeletingDates(prev => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
    }
  };

  const getDayTypeColor = (typeCode: string) => {
    const dt = setting.dayTypesOptions?.find((item: any) => String(item.Id) === String(typeCode));
    return normalizeColorForInput(dt?.CouleurFond, "#2563eb");
  };

  if (!hasInteracted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/40 rounded-2xl border border-dashed border-light min-h-[300px]">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-primary poppins">
          Aucun type de jour sélectionné
        </p>
        <p className="text-xs text-secondary/80 mt-1 max-w-xs poppins leading-relaxed">
          Veuillez cliquer sur <span className="font-semibold text-primary">« Voir les jours »</span> sur un type de jour à gauche pour afficher et gérer ses jours configurés.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full h-full min-h-0 relative">
      <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">
        Jours enregistrés
      </h4>

      {/* Pop-up confirmation suppression d'une Date */}
      {pendingDeleteDate && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-white p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <h5 className="font-semibold text-sm text-primary poppins">Supprimer ce jour ?</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed poppins">
              Êtes-vous sûr de vouloir supprimer la date du <strong className="text-primary">{pendingDeleteDate.formattedDate}</strong> ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer poppins"
                onClick={() => setPendingDeleteDate(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer poppins"
                onClick={async () => {
                  const target = pendingDeleteDate;
                  setPendingDeleteDate(null);
                  await executeDeleteDate(target.dateKey, target.id);
                }}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up confirmation date antérieure */}
      {pendingPastDateAction && (
        <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 rounded-xl">
          <div className="bg-white p-5 rounded-2xl shadow-xl max-w-sm w-full space-y-4 border border-light animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h5 className="font-semibold text-sm text-primary">Date antérieure détectée</h5>
            </div>
            <p className="text-xs text-secondary leading-relaxed">
              La date choisie (<strong>{format(new Date(pendingPastDateAction.dateStr), "dd/MM/yyyy")}</strong>) est antérieure à aujourd'hui. Souhaitez-vous vraiment continuer ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl border border-light text-xs font-semibold text-secondary hover:bg-secondary/10 transition-colors cursor-pointer"
                onClick={() => setPendingPastDateAction(null)}
              >
                Non
              </button>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-600 shadow-sm transition-colors cursor-pointer"
                onClick={async () => {
                  const action = pendingPastDateAction;
                  setPendingPastDateAction(null);
                  if (action.type === "add") {
                    await executeAddDate(action.dateStr, action.typeId);
                  } else if (action.type === "edit" && action.originalKey) {
                    await executeSaveEdit(action.originalKey, action.originalVal, action.dateStr, action.typeId);
                  }
                }}
              >
                Oui, confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre de Filtres */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-light shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-semibold text-secondary whitespace-nowrap">Filtrer par type :</span>
          <select
            id="filter-type-select"
            value={filterType}
            onChange={(e) => handleFilterTypeChange(e.target.value)}
            className="border border-default rounded-xl px-2.5 py-1.5 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm flex-1 truncate"
          >
            <option value="all">Tous les types</option>
            {setting.dayTypesOptions?.map((dt: any) => (
              <option key={dt.Id} value={dt.Id}>
                {dt.Libelle}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-secondary whitespace-nowrap">Année :</span>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            disabled={isLoadingYear}
            className="border border-default rounded-xl px-3 py-1.5 text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-50"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDateErrorMessage(null);
            setIsOpen(true);
          }}
          className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Ajouter une date
        </button>
      ) : (
        <div className="p-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-2.5 shadow-sm shrink-0">
          <div className="flex items-center justify-between pb-1 border-b border-primary/20">
            <h5 className="text-xs font-semibold text-primary">
              Nouveau jour
            </h5>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
              className="text-secondary hover:text-primary transition-colors p-0.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                if (dateErrorMessage) setDateErrorMessage(null);
              }}
              className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-white shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none"
            />

            <select
              value={newTypeId || selectedDayTypeId || setting.dayTypesOptions?.[0]?.Id || ""}
              onChange={(e) => setNewTypeId(e.target.value)}
              className="border border-default rounded-lg px-2.5 py-1.5 text-xs bg-white shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
            >
              {setting.dayTypesOptions?.map((dt: any) => (
                <option key={dt.Id} value={dt.Id}>
                  {dt.Libelle}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAddDate}
              disabled={isAdding}
              className="px-3 py-1.5 cursor-pointer bg-primary text-white rounded-lg font-medium text-xs shadow-md hover:shadow-lg flex items-center justify-center gap-1 shrink-0 disabled:opacity-50"
            >
              {isAdding ? 
                <svg className="animate-spin w-3.5 h-3.5 text-inverse" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg> 
              : "Valider"}
            </button>
          </div>

          {dateErrorMessage && (
            <p className="text-[11px] text-red-500 font-medium">{dateErrorMessage}</p>
          )}
        </div>
      )}

      {/* Liste des jours */}
      <div className="bg-white/60 rounded-xl p-3 min-h-[160px] relative flex-1 min-h-0 border border-light overflow-y-auto">
        {isLoadingYear ? (
          <div className="py-8">
            <Loader size="md" message={`Chargement...`} />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDates.length > 0 ? (
              filteredDates.map(([dateKey, val]: [string, any]) => {
                const itemObj = typeof val === "object" ? val : { id: val, TypeJourCode: selectedDayTypeId };
                const isEditingThisDate = editingDateKey === dateKey;

                if (isEditingThisDate) {
                  return (
                    <div key={dateKey} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between bg-primary/10 rounded-xl p-2.5 shadow-sm border border-primary/30 gap-2">
                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="date"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1 text-xs bg-white shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none"
                        />

                        <select
                          value={editTypeIdValue}
                          onChange={(e) => setEditTypeIdValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1 text-xs bg-white shadow-sm flex-1 focus:ring-2 focus:ring-primary focus:outline-none truncate"
                        >
                          {setting.dayTypesOptions?.map((dt: any) => (
                            <option key={dt.Id} value={dt.Id}>
                              {dt.Libelle}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 justify-end">
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => handleSaveEdit(dateKey, val)}
                          title="Enregistrer"
                          className="text-white bg-primary p-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={handleCancelEdit}
                          title="Annuler"
                          className="text-secondary bg-white p-1.5 rounded-lg border border-light transition-all cursor-pointer shadow-xs hover:bg-secondary/10"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                const dateObj = new Date(dateKey);
                const isDeletingThisDate = Boolean(deletingDates[dateKey]);
                const currentTypeColor = getDayTypeColor(itemObj.TypeJourCode);
                const currentTypeObj = setting.dayTypesOptions?.find((dt: any) => String(dt.Id) === String(itemObj.TypeJourCode));
                const formattedDateStr = format(dateObj, "dd/MM/yyyy");

                return (
                  <div key={dateKey} className="flex items-center justify-between bg-white rounded-lg p-2.5 shadow-sm border border-light hover:shadow-md transition-all group">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                        style={{ backgroundColor: currentTypeColor }} 
                        title={currentTypeObj?.Libelle || `Type ID: ${itemObj.TypeJourCode}`}
                      />
                      <span className="text-xs font-medium text-primary">
                        {formattedDateStr}
                      </span>
                      {currentTypeObj && (
                        <span className="text-[10px] text-secondary/70 bg-secondary-bg px-2 py-0.5 rounded-full border border-ultra-light">
                          {currentTypeObj.Libelle}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        className="text-secondary hover:text-primary p-1 rounded transition-all cursor-pointer"
                        title="Modifier le jour (date et type)"
                        onClick={() => handleStartEdit(dateKey, val)}
                        disabled={isDeletingThisDate}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className="text-red-400 hover:text-red-600 p-1 rounded transition-all cursor-pointer disabled:opacity-50"
                        disabled={isDeletingThisDate}
                        title="Supprimer"
                        onClick={() => {
                          setPendingDeleteDate({
                            dateKey,
                            id: itemObj.Id || itemObj.id,
                            formattedDate: formattedDateStr,
                          });
                        }}
                      >
                        {isDeletingThisDate ? (
                          <svg className="animate-spin w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-secondary italic text-center py-4">
                Aucun jour configuré pour cette sélection en {selectedYear}.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isSettingsOpen,
  settings,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    return sessionStorage.getItem('activeSettingsCategory') || settings?.[0]?.category || "";
  });
  
  const [selectedDayTypeId, setSelectedDayTypeId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [pendingSaveAction, setPendingSaveAction] = useState<{ isDirty: boolean; save: () => Promise<void> } | null>(null);
  const [isSavingPending, setIsSavingPending] = useState(false);

  const hasFetchedRef = useRef(false);

  const currentCategoryObj = useMemo(() => {
    return settings.find((cat: any) => cat.category === activeCategory) || settings[0];
  }, [settings, activeCategory]);

  useEffect(() => {
    if (isSettingsOpen && !hasFetchedRef.current) { 
      hasFetchedRef.current = true;
      settings.forEach((cat: any) => {
        cat.items?.forEach((setting: any) => {
          if (setting.type === "day-type-settings" && typeof setting.fetchDayTypes === "function") {
            setting.fetchDayTypes().then((res: any) => {
              if (res && !res.success && res.message) {
                setApiError(res.message);
              }
            }).catch((err: any) => {
              setApiError(err?.message || "Erreur lors du chargement des types de jours.");
            });
          }
        });
      });
    }

    if (!isSettingsOpen) {
      setApiError(null);
      setPendingSaveAction(null);
      setSelectedDayTypeId(null);
    }
  }, [isSettingsOpen, settings]);

  const nonWorkingSetting = useMemo(() => {
    const daysCat = settings.find((cat: any) => cat.key === "daysManagement");
    return daysCat?.items?.find((item: any) => item.type === "custom-non-working-dates");
  }, [settings]);

  const dayTypeSetting = useMemo(() => {
    const daysCat = settings.find((cat: any) => cat.key === "daysManagement");
    return daysCat?.items?.find((item: any) => item.type === "day-type-settings");
  }, [settings]);

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={onClose}
      title="Paramètres"
      className={`${
        currentCategoryObj?.key === 'daysManagement' 
          ? 'w-[min(98vw,1500px)]' 
          : currentCategoryObj?.key === 'mobileAppointmentFields'
            ? 'w-[min(95vw,1400px)]'
            : 'w-[min(95vw,900px)]'
      } h-[85vh] max-h-[850px] overflow-hidden flex flex-col`}
      classNameContent="flex-1 overflow-hidden p-4 flex flex-col min-h-0"
      confirmCloseOnOverlay={currentCategoryObj?.hasUnsavedChanges && pendingSaveAction?.isDirty}
      onSave={pendingSaveAction?.save}
    >
      <div className="flex flex-col h-full min-h-0 poppins gap-4">
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="bg-secondary-bg border border-light rounded-2xl py-6 px-5 shadow-sm flex flex-col min-h-0 overflow-y-auto flex-1">
            {currentCategoryObj && (
              <div className="flex flex-col h-full min-h-0">
                <div className="flex items-center bg-secondary-bg gap-3 pb-4 mb-4 border-b border-ultra-light shrink-0">
                  <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                  <h3 className="text-lg font-medium text-primary poppins">
                    {currentCategoryObj.category}
                  </h3>
                </div>

                {apiError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-700 text-sm poppins shadow-sm shrink-0">
                    <div className="flex items-center gap-2.5">
                      <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{apiError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setApiError(null)}
                      className="text-red-400 hover:text-red-600 transition-colors cursor-pointer p-0.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {currentCategoryObj.key === "daysManagement" ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
                    {/* PANNEAU GAUCHE - TYPES DE JOURS */}
                    <div className="lg:col-span-7 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
                      <h4 className="text-sm font-semibold text-primary pb-2 border-b border-ultra-light">
                        Types de jours
                      </h4>

                      <NewDayTypeForm
                        onAdd={dayTypeSetting?.onAddDayType}
                        setError={setApiError}
                      />

                      <div className="space-y-3">
                        {dayTypeSetting?.dayTypes && dayTypeSetting.dayTypes.length > 0 ? (
                          dayTypeSetting.dayTypes.map((dayType: DayType) => (
                            <DayTypeSingleEditor
                              key={dayType.Id}
                              dayType={dayType}
                              isSelected={String(dayType.Id) === String(selectedDayTypeId)}
                              onSelect={() => setSelectedDayTypeId(String(dayType.Id))}
                              onUpdate={dayTypeSetting.onUpdateDayType}
                              onDelete={dayTypeSetting.onDeleteDayType}
                              setError={setApiError}
                            />
                          ))
                        ) : (
                          <p className="text-sm text-secondary italic poppins">
                            Aucun type de jour disponible.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* PANNEAU DROIT - ÉDITION ET GESTION DES JOURS */}
                    <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-ultra-light pt-6 lg:pt-0 lg:pl-6 flex flex-col min-h-0 overflow-y-auto">
                      {nonWorkingSetting ? (
                        <NonWorkingDaysEditor
                          setting={nonWorkingSetting}
                          selectedDayTypeId={selectedDayTypeId}
                          setSelectedDayTypeId={setSelectedDayTypeId}
                          setError={setApiError}
                        />
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-white/40 rounded-xl border border-dashed border-light min-h-[250px]">
                          <svg className="w-12 h-12 text-secondary/40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-sm font-medium text-secondary poppins">
                            Aucune donnée de configuration
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 flex-1">
                    {currentCategoryObj.items.map((setting: any, settingIdx: number) => (
                      <div
                        key={setting.id}
                        className={`flex flex-col lg:flex-row lg:items-center justify-between py-2 ${
                          settingIdx !== currentCategoryObj.items.length - 1
                            ? "border-b border-ultra-light pb-4"
                            : ""
                        }`}
                      >
                        {setting.type === "mobile-appointment-fields" ? (
                          <MobileDisplayEditor 
                            setting={setting} 
                            registerSaveAction={setPendingSaveAction} 
                          />
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
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end pt-3 border-t border-ultra-light shrink-0 gap-3">
          <button
            className={`px-8 py-3 rounded-xl active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md cursor-pointer ${
              pendingSaveAction?.isDirty 
                ? "bg-secondary-bg border border-light text-primary hover:bg-secondary/10" 
                : "bg-primary text-white hover:bg-primary-600"
            }`}
            onClick={onClose}
          >
            Fermer
          </button>
          
          {pendingSaveAction?.isDirty && (
            <button
              className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md cursor-pointer flex items-center justify-center disabled:opacity-50 min-w-[220px]"
              onClick={async () => {
                setIsSavingPending(true);
                setApiError(null);
                try {
                  await pendingSaveAction.save();
                } catch (error: any) {
                  setApiError(error?.message || "Erreur lors de la sauvegarde.");
                } finally {
                  setIsSavingPending(false);
                }
              }}
              disabled={isSavingPending}
            >
              {isSavingPending ? "Sauvegarde..." : "Sauvegarder les modifications"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default memo(SettingsModal);