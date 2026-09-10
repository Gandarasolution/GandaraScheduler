import { memo, useState } from "react";
import Modal from "./Modal";
import Loader from "../ui/Loader";
import { format } from "date-fns";
import { Appointment, Item, MobileAppointmentDisplayConfig, MobileAppointmentField, User } from "../../types";
import { AppointmentCard } from "../Calendar/MobileCalendar/AppointmentList";

type SettingsModalProps = {  
  onClose: () => void;
  settings: any;
  isSettingsOpen: boolean;
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

const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  isSettingsOpen,
  settings
}) => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [newNonWorkingDate, setNewNonWorkingDate] = useState<string>("");
  const [isAddingDate, setIsAddingDate] = useState<boolean>(false);
  const [deletingDate, setDeletingDate] = useState<string | null>(null);
  
  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={onClose}
      title="Paramètres"
      className="w-[min(94vw,860px)] max-w-[860px] max-h-[86vh] overflow-hidden"
      classNameContent="max-h-[calc(86vh-72px)] overflow-y-auto px-1"
    >
      <div className="flex flex-col gap-4 p-2 poppins">
        {settings.map((cat: any, idx: number) => (
          <div key={cat.category} className="border border-light text-primary rounded-2xl overflow-hidden bg-secondary-bg shadow-lg hover:shadow-xl transition-all duration-300">
            <button
              type="button"
              className="w-full text-left px-6 py-5 font-semibold bg-secondary hover:bg-tertiary transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 flex items-center justify-between border-b border-light"
              onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
            >
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-primary rounded-full"></div>
                <span className="text-lg poppins font-medium">{cat.category}</span>
              </div>
              <div className={`p-1 text-secondary transition-transform duration-300 ${openCategory === cat.category ? 'rotate-180' : ''}`}>
                <svg 
                  className="w-5 h-5"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            <div className={`transition-all duration-300 ease-in-out ${openCategory === cat.category ? 'opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`}>
              <div className="px-4 py-4 bg-secondary-bg">
                {cat.items.map((setting: any, settingIdx: number) => (
                  <div key={setting.id} className={`flex flex-col lg:flex-row lg:items-center justify-between py-4 ${settingIdx !== cat.items.length - 1 ? 'border-b border-ultra-light' : ''}`}>
                    {setting.type !== "mobile-appointment-fields" && (
                      <div className="mb-3 lg:mb-0 lg:mr-6 min-w-[200px]">
                        <label htmlFor={setting.id} className="text-base font-medium poppins block">
                          {setting.label}
                        </label>
                      {/* {setting.id === "includeWeekend" && (
                        <p className="text-xs text-secondary mt-1 poppins">
                          Permet de placer des rendez-vous les samedis et dimanches
                        </p>
                      )}
                      {setting.id === "respectNonWorkingDays" && (
                        <p className="text-xs text-secondary mt-1 poppins">
                          Bloque la planification sur les dates non travaillées définies ci-dessous
                        </p>
                      )} */}
                      {setting.id === "nonWorkedDay" && (
                        <p className="text-xs text-secondary mt-1 poppins">
                          Définissez les congés d'entreprise
                        </p>
                      )}
                      {setting.id === "tagPlacement" && (
                        <p className="text-xs text-secondary mt-1 poppins">
                          Choisissez comment afficher l'étiquette sur les rendez-vous
                        </p>
                      )}
                      </div>
                    )}
                    
                    {setting.type === "mobile-appointment-fields" ? (
                      <div className="w-full">
                        {setting.isLoading ? (
                          <Loader size="md" className="min-h-40 rounded-xl border border-light" message="Chargement..." />
                        ) : <div className="max-h-[55vh] overflow-auto rounded-xl">
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
                        <table className="hidden w-full min-w-[720px] table-fixed border-separate border-spacing-y-1 text-sm md:table">
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
                                      <svg
                                        className="h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="M5 12l4 4L19 6" />
                                      </svg>
                                    </button>
                                    {primaryChecked ? (
                                      <span className="whitespace-nowrap">Affiché</span>
                                    ) : (
                                      <span className="whitespace-nowrap">Masqué</span>
                                    )}
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
                                      <svg
                                        className="h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                      >
                                        <path d="M5 12l4 4L19 6" />
                                      </svg>
                                    </button>
                                    {secondaryChecked ? (
                                      <span className="whitespace-nowrap">Affiché</span>
                                    ) : (
                                      <span className="whitespace-nowrap">Masqué</span>
                                    )}
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
                        }
                      </div>
                    ) : setting.type === "select" ? (
                      <select
                        id={setting.id}
                        className="border border-default rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-color transition-all duration-200 poppins text-sm bg-transparent shadow-sm hover:shadow-md"
                        value={setting.value}
                        onChange={e => setting.onChange(e.target.value)}
                      >
                        {setting.options?.map((option: any) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : setting.type === "multi-select" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                        {setting.options?.map((option: any) => {
                          const checked = setting.value.includes(option.value);
                          return (
                            <label key={option.value} className="flex items-center gap-3 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const nextValue = checked
                                    ? setting.value.filter((value: string) => value !== option.value)
                                    : [...setting.value, option.value];
                                  setting.onChange(nextValue);
                                }}
                                className="h-4 w-4 accent-primary"
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : setting.type === "custom-non-working-dates" ? (
                      <div className="flex flex-col gap-4 w-full max-w-lg">
                        <div className="flex gap-3 items-center">
                          <input
                            type="date"
                            id={setting.id}
                            value={newNonWorkingDate}
                            onChange={e => setNewNonWorkingDate(e.target.value)}
                            className="border border-default rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-color transition-all duration-200 flex-1 poppins text-sm bg-transparent shadow-sm hover:shadow-md"
                          />
                          <button
                            className="px-6 py-3 cursor-pointer bg-primary text-white rounded-xl active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md hover:shadow-lg flex items-center gap-2"
                            onClick={async () => {
                              if (
                                newNonWorkingDate &&
                                !setting.nonWorkingDates[format(newNonWorkingDate, "yyyy-MM-dd")]
                              ) {
                                setIsAddingDate(true);
                                const parsedDate = new Date(newNonWorkingDate).getTime();
                                
                                try {
                                  if (setting.addNonWorkingDatesToPlanning) { // Appeler la fonction passée en props
                                     const response = await setting.addNonWorkingDatesToPlanning(parsedDate);
                                     if (response && response.error === 0 && response.data) {
                                       setting.setNonWorkingDates((prev: Record<string, number>) => ({
                                         ...prev,
                                         [format(parsedDate, "yyyy-MM-dd")]: Number(response.data)
                                       }));
                                       setNewNonWorkingDate("");
                                     }
                                  } else {
                                    setting.setNonWorkingDates((prev: Record<string, number>) => ({
                                      ...prev,
                                      [format(parsedDate, "yyyy-MM-dd")]: new Date().getTime() // Générer un ID temporaire, à remplacer par l'ID réel du backend
                                    }));
                                    setNewNonWorkingDate("");
                                  }
                                } catch (error) {
                                  console.error("Error adding non-working date:", error);
                                } finally {
                                  setIsAddingDate(false);
                                }
                              }
                            }}
                            disabled={isAddingDate}
                          >
                            {isAddingDate ? (
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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
                        
                        <div className="bg-secondary rounded-xl p-4 border border-light">
                          {setting.nonWorkingDates.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-secondary-bg rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-8 h-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <p className="text-sm poppins">Aucune date non travaillée ajoutée</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              <h4 className="text-sm font-semibold  mb-3 poppins">Dates non travaillées ({Object.keys(setting.nonWorkingDates).length})</h4>
                              {Object.entries(setting.nonWorkingDates).map(([dateKey, id]) => (
                                <div key={dateKey} className="flex items-center justify-between bg-secondary-bg rounded-xl px-4 py-3 shadow-sm border border-ultra-light hover:shadow-md transition-all duration-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                    <span className="text-sm font-medium poppins">{format(dateKey, "dd/MM/yyyy")}</span>
                                  </div>
                                  <button
                                    className="text-red-500 hover:text-white hover:bg-red-500 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={deletingDate === dateKey}
                                    onClick={async () => {
                                      setDeletingDate(dateKey);
                                      try {
                                        if (setting.removeNonWorkingDatesFromPlanning) {
                                          const response = await setting.removeNonWorkingDatesFromPlanning(id); // TODO: Replace with real idPlanning if not 3
                                          if (response && response.error === 0) {
                                            setting.setNonWorkingDates((prev: any) => {
                                                const newDates = { ...prev };
                                                delete newDates[dateKey];
                                                return newDates;
                                            });
                                          }
                                        } else {
                                          setting.setNonWorkingDates((prev: any) => {
                                            const newDates = { ...prev };
                                            delete newDates[dateKey];
                                            return newDates;
                                          });
                                        }
                                      } catch (error) {
                                        console.error("Error removing non-working date:", error);
                                      } finally {
                                        setDeletingDate(null);
                                      }
                                    }}
                                  >
                                    {deletingDate === dateKey ? (
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
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        {setting.type === "checkbox" ? (
                          <div className="flex items-center">
                            <div className="relative">
                              <input
                                id={setting.id}
                                type="checkbox"
                                className="sr-only"
                                checked={setting.value}
                                onChange={e => setting.onChange(e.target.checked)}
                              />
                              <div className={`w-12 h-6 rounded-full transition-all duration-300 cursor-pointer ${setting.value ? 'bg-primary' : 'bg-secondary'}`} onClick={() => setting.onChange(!setting.value)}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-all duration-300 ${setting.value ? 'translate-x-6' : 'translate-x-0.5'} translate-y-0.5`}></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <input
                            id={setting.id}
                            type={setting.type}
                            className="border border-default rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 w-48 poppins text-sm bg-transparent shadow-sm hover:shadow-md"
                            value={setting.value}
                            onChange={e => setting.onChange(e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex justify-end pt-6 border-t border-ultra-light">
          <button
            className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-600 active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md hover:shadow-lg flex items-center gap-2"
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
