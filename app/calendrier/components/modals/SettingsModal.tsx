import { memo, useState, useMemo, useEffect, useRef } from "react";
import Modal from "./Modal";
import Loader from "../ui/Loader";
import { format } from "date-fns";
import { Appointment, DayType, Item, MobileAppointmentDisplayConfig, MobileAppointmentField, User } from "../../types";
import { AppointmentCard } from "../Calendar/MobileCalendar/AppointmentList";
import { useDayTypesContext } from "../../hooks/data/dayTypesContext";

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
 * Éditeur spécifique pour l'affichage mobile.
 */
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
                    displayConfig={{ primaryFields: localValue.primaryFields, secondaryFields: [] } as MobileAppointmentDisplayConfig}
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
                    displayConfig={{ primaryFields: [], secondaryFields: localValue.secondaryFields } as MobileAppointmentDisplayConfig}
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
              const primaryChecked = localValue.primaryFields.includes(option.CodeChamp);
              const secondaryChecked = localValue.secondaryFields.includes(option.CodeChamp);
              
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
                        onClick={() => updateFields("primaryFields", option.CodeChamp, !primaryChecked)}
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
                        onClick={() => updateFields("secondaryFields", option.CodeChamp, !secondaryChecked)}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12l4 4L19 6" />
                        </svg>
                      </button>
                      <span className="whitespace-nowrap">{secondaryChecked ? "Affiché" : "Masqué"}</span>
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
                        primaryFields: localValue.primaryFields,
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
                        secondaryFields: localValue.secondaryFields,
                      } as MobileAppointmentDisplayConfig}
                    />
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
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
          CouleurFond: CouleurFond,
          CouleurTexte: CouleurTexte,
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
    <div className="p-6 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-4 shadow-sm mb-6">
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

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="flex flex-wrap md:flex-nowrap gap-6 items-center w-full">
          <div className="flex flex-col gap-2 min-w-[200px]">
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
              placeholder="Ex: Astreinte, Congé payé..."
              className="border border-default rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-sm bg-white/80 shadow-sm hover:shadow-md max-w-md"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-center flex-1">
            <div className="flex flex-col gap-2 w-full">
              <div className="relative group flex items-center gap-2">
                <label 
                  htmlFor="new-color-fond"
                  className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: CouleurFond }}
                  title="Couleur de fond"
                />
                <input
                  id="new-color-fond"
                  type="color"
                  value={normalizeColorForInput(CouleurFond)}
                  onChange={(e) => setCouleurFond(e.target.value)}
                  className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                />
                <label htmlFor="new-color-fond" className="cursor-pointer text-sm flex-1">
                  Couleur de fond
                </label>
              </div>        

              <div className="relative group flex items-center gap-2">
                <label 
                  htmlFor="new-color-texte"
                  className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                  style={{ backgroundColor: CouleurTexte }}
                  title="Couleur de texte"
                />
                <input
                  id="new-color-texte"
                  type="color"
                  value={normalizeColorForInput(CouleurTexte, '#FFFFFF')}
                  onChange={(e) => setCouleurTexte(e.target.value)}
                  className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                />
                <label htmlFor="new-color-texte" className="cursor-pointer text-sm flex-1">
                  Couleur de texte
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-secondary font-medium poppins">Mise en forme</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsBold((prev) => !prev)}
                  className={`flex-1 min-h-[40px] px-3 rounded-xl border text-xs font-bold poppins transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                    isBold
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-secondary/20 text-primary border-light hover:bg-secondary/40"
                  }`}
                >
                  <span>B</span>
                  <span className="font-normal text-[11px]">Gras</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsItalic((prev) => !prev)}
                  className={`flex-1 min-h-[40px] px-3 rounded-xl border text-xs italic poppins transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
                    isItalic
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-secondary/20 text-primary border-light hover:bg-secondary/40"
                  }`}
                >
                  <span>I</span>
                  <span className="not-italic font-normal text-[11px]">Italique</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/80 p-3 rounded-xl border border-light">
              <span className="text-xs font-medium text-secondary poppins">Aperçu :</span>
              <div className="w-14 h-14 border border-light overflow-hidden shrink-0">
                <div
                  className="flex flex-col justify-end border-b border-r border-light text-center text-sm p-1 h-full w-full relative day-cell transition-all"
                  style={{
                    backgroundColor: CouleurFond || "transparent",
                    color: CouleurTexte || "inherit",
                    fontWeight: isBold ? "700" : "400",
                    fontStyle: isItalic ? "italic" : "normal",
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
        </div>

        <button
          type="button"
          onClick={handleCreate}
          disabled={isSubmitting}
          title="Valider la création"
          className="cursor-pointer bg-primary text-white p-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
        >
          {isSubmitting ? (
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      {formError && (
        <p className="text-xs text-red-500 font-medium poppins">{formError}</p>
      )}
    </div>
  );
};

const DayTypeSingleEditor = ({
  dayType,
  onUpdate,
  onDelete,
  setError,
}: {
  dayType: DayType;
  onUpdate?: (updated: any) => Promise<{ success: boolean; message?: string }>;
  onDelete?: (id: number | string) => Promise<{ success: boolean; message?: string }>;
  setError: (msg: string | null) => void;
}) => {
  const [localType, setLocalType] = useState(dayType);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setLocalType((prev: any) => ({ ...prev, label: value }));
    setError(null);
  };

  const handleColorChange = (key: "bgColor" | "textColor", value: string) => {
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
      const res = await onUpdate(localType);
      if (res && !res.success) {
        setError(res?.message || "Erreur lors de la mise à jour.");
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la mise à jour.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
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
    <div className="p-6 rounded-2xl border border-light bg-secondary/10 flex flex-col md:flex-row gap-6 shadow-sm items-center justify-between">
      <div className="flex flex-wrap md:flex-nowrap gap-6 items-center w-full">
        <div className="flex flex-col gap-2 min-w-[200px]">
          <label htmlFor={`dayTypeLabelInput-${dayType.Id}`} className="text-xs text-secondary font-medium poppins">
            Libellé
          </label>
          <input
            id={`dayTypeLabelInput-${dayType.Id}`}
            type="text"
            value={localType.Libelle || ""}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="Ex: Jour Férié, RTT, Modulation..."
            className="border border-default rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 poppins text-sm bg-transparent shadow-sm hover:shadow-md max-w-md"
            disabled={dayType.isLocked}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-center flex-1">
          <div className="flex flex-col gap-2 w-full">
            <div className="relative group flex items-center gap-2">
              <label 
                htmlFor={`color-fond-${dayType.Id}`}
                className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                style={{ backgroundColor: localType.CouleurFond || '#1E40AF' }}
                title="Couleur de fond"
              />
              <input
                id={`color-fond-${dayType.Id}`}
                type="color"
                value={normalizeColorForInput(localType.CouleurFond)}
                onChange={(e) => handleColorChange("bgColor", e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                title="Couleur de fond"
              />
              <label htmlFor={`color-fond-${dayType.Id}`} className="cursor-pointer text-sm flex-1">
                Couleur de fond
              </label>
            </div>        

            <div className="relative group flex items-center gap-2">
              <label 
                htmlFor={`color-texte-${dayType.Id}`}
                className="w-4 h-4 rounded border-2 border-default cursor-pointer hover:scale-110 transition-transform shadow-sm"
                style={{ backgroundColor: localType.CouleurTexte || '#FFFFFF' }}
                title="Couleur de texte"
              />
              <input
                id={`color-texte-${dayType.Id}`}
                type="color"
                value={normalizeColorForInput(localType.CouleurTexte, '#FFFFFF')}
                onChange={(e) => handleColorChange("textColor", e.target.value)}
                className="w-0 h-0 border-0 opacity-0 absolute pointer-events-none"
                title="Couleur de texte"
              />
              <label htmlFor={`color-texte-${dayType.Id}`} className="cursor-pointer text-sm flex-1">
                Couleur de texte
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-secondary font-medium poppins">Mise en forme</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggle("isBold")}
                className={`flex-1 min-h-[40px] px-3 rounded-xl border text-xs font-bold poppins transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
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
                className={`flex-1 min-h-[40px] px-3 rounded-xl border text-xs italic poppins transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer ${
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

          <div className="flex items-center gap-3 bg-secondary-bg p-3 rounded-xl border border-light">
            <span className="text-xs font-medium text-secondary poppins">Aperçu :</span>
            <div className="w-14 h-14 border border-light overflow-hidden shrink-0">
              <div
                className="flex flex-col justify-end border-b border-r border-light text-center text-sm p-1 h-full w-full relative day-cell transition-all"
                style={{
                  backgroundColor: localType.CouleurFond || "transparent",
                  color: localType.CouleurTexte || "inherit",
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
      </div>

      <div className="flex items-center shrink-0">
        {isDirty ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            title="Enregistrer les modifications"
            className="cursor-pointer bg-primary text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        ) : !dayType.isLocked ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Supprimer ce type de jour"
            className="cursor-pointer bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
          >
            {isDeleting ? (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
};

const NonWorkingDaysEditor = ({
  setting,
  setError,
}: {
  setting: any;
  setError: (msg: string | null) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYearsState, setAvailableYearsState] = useState<number[]>([]);
  const [newDate, setNewDate] = useState<string>("");
  const [selectedDayTypeId, setSelectedDayTypeId] = useState<string>(
    setting.dayTypesOptions?.[0]?.Id?.toString() || ""
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingYear, setIsLoadingYear] = useState(false);
  const [deletingDates, setDeletingDates] = useState<Record<string, boolean>>({});
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);

  // État local pour gérer l'édition d'une date existante
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>("");
  const [editDayTypeId, setEditDayTypeId] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Utilisation d'un ref pour conserver les callbacks sans déclencher d'effets indésirables lors des re-rendus
  const settingRef = useRef(setting);
  useEffect(() => {
    settingRef.current = setting;
  }, [setting]);

  // Chargement initial des années valides via API
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

  // Chargement des jours non travaillés selon l'année sélectionnée
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
          setError(err?.message || "Erreur lors de la récupération des jours non travaillés.");
        })
        .finally(() => {
          setIsLoadingYear(false);
        });
    }
  }, [selectedYear, setError]);

  const filteredDates = useMemo(() => {
    const dates = setting.nonWorkingDates || {};
    return Object.entries(dates).filter(([dateKey]) => {
      const year = new Date(dateKey).getFullYear();
      return year === Number(selectedYear);
    });
  }, [setting.nonWorkingDates, selectedYear]);

  const resetForm = () => {
    setNewDate("");
    setDateErrorMessage(null);
  };

  const handleAddDate = async () => {
    if (!newDate) return;

    const formattedInputDate = format(new Date(newDate), "yyyy-MM-dd");

    if (setting.nonWorkingDates && setting.nonWorkingDates[formattedInputDate]) {
      setDateErrorMessage(
        `La date du ${format(new Date(newDate), "dd/MM/yyyy")} est déjà enregistrée.`
      );
      return;
    }

    setDateErrorMessage(null);
    setError(null);
    setIsAdding(true);

    const parsedDate = new Date(newDate).getTime();

    try {
      if (setting.addNonWorkingDatesToPlanning) {
        const response = await setting.addNonWorkingDatesToPlanning(
          parsedDate,
          selectedDayTypeId
        );
        if (response && response.success && response.data) {
          setting.setNonWorkingDates((prev: any) => {
            const updated = {
              ...prev,
              [formattedInputDate]: {
                Id: Number(response.data),
                TypeJourCode: selectedDayTypeId,
              },
            };

            // 2. Tri des clés par ordre chronologique croissant
            const sortedKeys = Object.keys(updated).sort((a, b) => 
              new Date(a).getTime() - new Date(b).getTime()
            );

            // 3. Reconstitution de l'objet trié
            return sortedKeys.reduce((acc: Record<string, any>, key) => {
              acc[key] = updated[key];
              return acc;
            }, {});
          });
          setAvailableYearsState((prev) => {
            const yearToAdd = new Date(newDate).getFullYear();
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

  const handleStartEdit = (dateKey: string, val: any) => {
    const itemObj = typeof val === "object" ? val : { id: val };
    setEditingDateKey(dateKey);
    setEditDateValue(dateKey);
    setEditDayTypeId(String(itemObj.TypeJourCode || itemObj.typeId || setting.dayTypesOptions?.[0]?.Id || ""));
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingDateKey(null);
    setEditDateValue("");
    setEditDayTypeId("");
  };

  const handleSaveEdit = async (originalDateKey: string, originalVal: any) => {
    if (!editDateValue) return;

    const formattedNewDate = format(new Date(editDateValue), "yyyy-MM-dd");
    const itemObj = typeof originalVal === "object" ? originalVal : { id: originalVal };
    const dateId = itemObj.Id || itemObj.id;

    // Vérification si la nouvelle date existe déjà (sauf si c'est la même)
    if (formattedNewDate !== originalDateKey && setting.nonWorkingDates?.[formattedNewDate]) {
      setError(`La date du ${format(new Date(editDateValue), "dd/MM/yyyy")} existe déjà.`);
      return;
    }

    setIsSavingEdit(true);
    setError(null);

    try {
      if (setting.updateNonWorkingDate) {
        const response = await setting.updateNonWorkingDate({
          id: dateId,
          date: new Date(editDateValue),
          typeJourCode: editDayTypeId,
        });

        if (!response || !response.success) {
          setError(response?.message || "Erreur lors de la modification de la date.");
          setIsSavingEdit(false);
          return;
        }
      }

      // Mise à jour du state local des dates
      setting.setNonWorkingDates((prev: any) => {
        const updated = { ...prev };
        
        // 1. Supprimer l'ancienne clé
        delete updated[originalDateKey];
        
        // 2. Ajouter la nouvelle clé
        updated[formattedNewDate] = {
          Id: dateId,
          TypeJourCode: editDayTypeId,
        };

        // 3. Trier les clés dans l'ordre chronologique croissant (YYYY-MM-DD)
        const sortedKeys = Object.keys(updated).sort((a, b) => 
          new Date(a).getTime() - new Date(b).getTime()
        );

        // 4. Reconstruire l'objet avec les clés triées
        return sortedKeys.reduce((acc: Record<string, any>, key) => {
          acc[key] = updated[key];
          return acc;
        }, {});
      });

      handleCancelEdit();
    } catch (error: any) {
      setError(error?.message || "Erreur lors de la mise à jour de la date.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full min-w-0">
      {/* Sélecteur d'année principal */}
      <div className="flex items-center justify-between gap-4 bg-white/80 p-3 rounded-xl border border-light shadow-sm">
        <label htmlFor="year-select" className="text-sm font-semibold text-primary shrink-0">
          Année sélectionnée :
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          disabled={isLoadingYear}
          className="border border-default rounded-xl px-4 py-2 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-50"
        >
          {availableYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Formulaire adaptable d'ajout */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setDateErrorMessage(null);
            setIsOpen(true);
          }}
          className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Ajouter un jour non travaillé
        </button>
      ) : (
        <div className="p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col gap-3 shadow-sm min-w-0">
          <div className="flex items-center justify-between pb-2 border-b border-primary/20">
            <h4 className="text-sm font-semibold text-primary flex items-center gap-2 truncate">
              Nouveau jour non travaillé
            </h4>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsOpen(false);
              }}
              className="text-secondary hover:text-primary transition-colors p-1 cursor-pointer shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center w-full">
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                if (dateErrorMessage) setDateErrorMessage(null);
              }}
              className="border border-default rounded-xl px-3 py-2 text-sm bg-white shadow-sm flex-1 min-w-[140px] max-w-full focus:ring-2 focus:ring-primary focus:outline-none"
            />

            <select
              value={selectedDayTypeId}
              onChange={(e) => setSelectedDayTypeId(e.target.value)}
              className="border border-default rounded-xl px-3 py-2 text-sm bg-white shadow-sm flex-1 min-w-[150px] max-w-full focus:ring-2 focus:ring-primary focus:outline-none"
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
              className="px-4 py-2 cursor-pointer bg-primary text-white rounded-xl font-medium text-sm shadow-md hover:shadow-lg flex items-center gap-2 shrink-0 flex-1 sm:flex-none min-w-[90px] justify-center disabled:opacity-50"
            >
              {isAdding ? (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
            <p className="text-xs text-red-500 font-medium">{dateErrorMessage}</p>
          )}
        </div>
      )}

      {/* Liste des jours configurés */}
      <div className="bg-secondary/40 rounded-xl p-3 min-h-[160px] relative">
        <h4 className="text-sm font-semibold mb-3">
          Jours configurés pour {selectedYear} ({filteredDates.length})
        </h4>

        {isLoadingYear ? (
          <div className="py-8">
            <Loader size="md" message={`Chargement de l'année ${selectedYear}...`} />
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {filteredDates.length > 0 ? (
              filteredDates.map(([dateKey, val]: [string, any]) => {
                const itemObj = typeof val === "object" ? val : { id: val };
                const isEditingThisDate = editingDateKey === dateKey;

                if (isEditingThisDate) {
                  return (
                    <div key={dateKey} className="flex flex-wrap items-center justify-between bg-primary/10 rounded-xl p-2.5 shadow-sm border border-primary/30 gap-2">
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <input
                          type="date"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1.5 text-xs bg-white shadow-sm flex-1 min-w-[130px] focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <select
                          value={editDayTypeId}
                          onChange={(e) => setEditDayTypeId(e.target.value)}
                          className="border border-default rounded-lg px-2 py-1.5 text-xs bg-white shadow-sm flex-1 min-w-[130px] focus:ring-2 focus:ring-primary focus:outline-none"
                        >
                          {setting.dayTypesOptions?.map((dt: any) => (
                            <option key={dt.Id} value={dt.Id}>
                              {dt.Libelle}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={() => handleSaveEdit(dateKey, val)}
                          title="Valider la modification"
                          className="text-white bg-primary hover:bg-primary-600 w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingEdit ? (
                            <svg className="animate-spin w-4 h-4 text-current" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isSavingEdit}
                          onClick={handleCancelEdit}
                          title="Annuler"
                          className="text-secondary hover:text-primary bg-white hover:bg-secondary/20 w-8 h-8 flex items-center justify-center rounded-lg border border-light transition-all cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                }

                const dayTypeInfo =
                  setting.dayTypesOptions?.find(
                    (dt: any) =>
                      String(dt.Id || dt.id) === String(itemObj.TypeJourCode || itemObj.typeId)
                  ) || itemObj;

                const libelle = dayTypeInfo?.Libelle || "Type inconnu";
                const bgCol = dayTypeInfo?.CouleurFond || "#f3f4f6";
                const textCol = dayTypeInfo?.CouleurTexte || "#374151";
                const isDeletingThisDate = Boolean(deletingDates[dateKey]);
                const dateObj = new Date(dateKey);
                const bold = dayTypeInfo?.isBold;
                const italic = dayTypeInfo?.isItalic;

                return (
                  <div key={dateKey} className="flex items-center justify-between bg-white/60 rounded-xl p-2.5 shadow-sm border border-light hover:shadow-md transition-all group min-w-0 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg border border-light overflow-hidden shrink-0 shadow-sm">
                        <div
                          className="flex flex-col justify-center items-center h-full w-full"
                          style={{
                            backgroundColor: bgCol,
                            color: textCol,
                            fontWeight: bold ? "700" : "400",
                            fontStyle: italic ? "italic" : "normal",
                          }}
                        >
                          <span className="block text-sm leading-none mt-0.5">{format(dateObj, "dd")}</span>
                          <span className="block text-[9px] opacity-80 uppercase tracking-wider">{format(dateObj, "MMM")}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-primary truncate">
                          {format(dateObj, "dd/MM/yyyy")}
                        </span>
                        <span className="text-xs text-secondary font-medium flex items-center gap-1.5 truncate">
                          <span 
                            className="w-2 h-2 rounded-full shrink-0 shadow-sm" 
                            style={{ backgroundColor: bgCol }}
                          />
                          <span className="truncate">{libelle}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Bouton Éditer */}
                      <button
                        type="button"
                        className="text-secondary hover:text-primary hover:bg-secondary/20 w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer"
                        title="Modifier cette date"
                        onClick={() => handleStartEdit(dateKey, val)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {/* Bouton Supprimer */}
                      <button
                        type="button"
                        className="text-red-400 hover:text-white hover:bg-red-500 w-8 h-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                        disabled={isDeletingThisDate}
                        title="Supprimer cette date"
                        onClick={async () => {
                          setDeletingDates(prev => ({ ...prev, [dateKey]: true }));
                          setError(null);
                          
                          try {
                            if (setting.removeNonWorkingDatesFromPlanning) {
                              const response = await setting.removeNonWorkingDatesFromPlanning(itemObj.Id || itemObj.id);
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
                        }}
                      >
                        {isDeletingThisDate ? (
                          <svg className="animate-spin w-4 h-4 text-current" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-secondary italic">
                Aucun jour non travaillé pour cette année.
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
  
  const [dateErrorMessage, setDateErrorMessage] = useState<string | null>(null);
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
      setDateErrorMessage(null);
      setPendingSaveAction(null);
    }
  }, [isSettingsOpen]);

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={onClose}
      title="Paramètres"
      className={`${
        currentCategoryObj?.key === 'nonWorkedDays' 
          ? 'w-[min(95vw,500px)]' 
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
              <div className="flex flex-col h-full">
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

                      {setting.type === "custom-non-working-dates" ? (
                        <NonWorkingDaysEditor
                          setting={setting}
                          setError={setApiError}
                        />
                      ) : setting.type === "day-type-settings" ? (
                        <div className="flex flex-col gap-6 w-full">
                          <NewDayTypeForm
                            onAdd={setting.onAddDayType}
                            setError={setApiError}
                          />

                          {setting.dayTypes && setting.dayTypes.length > 0 ? (
                            setting.dayTypes.map((dayType: DayType) => (
                              <DayTypeSingleEditor
                                key={dayType.Id}
                                dayType={dayType}
                                onUpdate={setting.onUpdateDayType}
                                onDelete={setting.onDeleteDayType}
                                setError={setApiError}
                              />
                            ))
                          ) : (
                            <p className="text-sm text-secondary italic poppins">
                              Aucun type de jour disponible.
                            </p>
                          )}
                        </div>
                      ) : setting.type === "mobile-appointment-fields" ? (
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
              </div>
            )}
          </div>
        </div>
        
        {/* FOOTER AVEC SAUVEGARDE CONDITIONNELLE */}
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
              {isSavingPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sauvegarde...
                </>
              ) : (
                "Sauvegarder les modifications"
              )}
            </button>
          )}
        </div>
        
      </div>
    </Modal>
  );
};

export default memo(SettingsModal);