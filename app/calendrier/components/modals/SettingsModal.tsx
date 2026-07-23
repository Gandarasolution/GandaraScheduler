import { memo, useState } from "react";
import Modal from "./Modal";
import { format } from "date-fns";

type SettingsModalProps = {  
  onClose: () => void;
  settings: any;
  isSettingsOpen: boolean;
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
      className="px-4 py-4"
    >
      <div className="flex flex-col gap-6 poppins">
        {settings.map((cat: any, idx: number) => (
          <div key={cat.category} className="border border-light text-primary rounded-2xl overflow-hidden bg-secondary-bg shadow-lg hover:shadow-xl transition-all duration-300">
            <button
              type="button"
              className="w-full text-left px-6 py-5 font-semibold bg-secondary hover:bg-tertiary transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 flex items-center justify-between border-b border-light"
              onClick={() => setOpenCategory(openCategory === cat.category ? null : cat.category)}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-primary rounded-full"></div>
                <span className="text-lg poppins font-medium">{cat.category}</span>
              </div>
              <div className={`p-2 rounded-full transition-all duration-300 ${openCategory === cat.category ? 'bg-primary text-white rotate-180' : 'bg-transparent text-gray-500'}`}>
                <svg 
                  className="w-5 h-5 transition-transform duration-300"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${openCategory === cat.category ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="px-6 py-6 bg-secondary-bg">
                {cat.items.map((setting: any, settingIdx: number) => (
                  <div key={setting.id} className={`flex flex-col lg:flex-row lg:items-center justify-between py-4 ${settingIdx !== cat.items.length - 1 ? 'border-b border-ultra-light' : ''}`}>
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
                    
                    {setting.type === "select" ? (
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default memo(SettingsModal);


