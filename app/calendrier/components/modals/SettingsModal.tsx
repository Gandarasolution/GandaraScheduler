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
  

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={onClose}
      title="Paramètres"
      className="px-4 py-4"
    >
      <div className="flex flex-col gap-6 poppins">
        {settings.map((cat: any, idx: number) => (
          <div key={cat.category} className="border border-light text-primary rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all duration-300">
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
              <div className="px-6 py-6 bg-bg-secondary">
                {cat.items.map((setting: any, settingIdx: number) => (
                  <div key={setting.id} className={`flex flex-col lg:flex-row lg:items-center justify-between py-4 ${settingIdx !== cat.items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="mb-3 lg:mb-0 lg:mr-6 min-w-[200px]">
                      <label htmlFor={setting.id} className="text-base font-medium poppins block">
                        {setting.label}
                      </label>
                      {setting.id === "includeWeekend" && (
                        <p className="text-xs text-secondary mt-1 poppins">
                          Permet de placer des rendez-vous les samedis et dimanches
                        </p>
                      )}
                      {setting.id === "respectNonWorkingDays" && (
                        <p className="text-xs text-secondary mt-1 poppins">
                          Bloque la planification sur les dates non travaillées définies ci-dessous
                        </p>
                      )}
                      {setting.id === "nonWorkedDay" && (
                        <p className="text-xs text-secondary mt-1 poppins">
                          Définissez les congés d'entreprise
                        </p>
                      )}
                    </div>
                    
                    {setting.type === "custom-non-working-dates" ? (
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
                            onClick={() => {
                              if (
                                newNonWorkingDate &&
                                !setting.nonWorkingDates.some(
                                  (d: Date) =>
                                    format(d, "yyyy-MM-dd") === newNonWorkingDate
                                )
                              ) {
                                setting.setNonWorkingDates((prev: Date[]) => [
                                  ...prev,
                                  new Date(newNonWorkingDate),
                                ]);
                                setNewNonWorkingDate("");
                              }
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Ajouter
                          </button>
                        </div>
                        
                        <div className="bg-secondary rounded-xl p-4 border border-light">
                          {setting.nonWorkingDates.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <p className="text-sm poppins">Aucune date non travaillée ajoutée</p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              <h4 className="text-sm font-semibold  mb-3 poppins">Dates non travaillées ({setting.nonWorkingDates.length})</h4>
                              {setting.nonWorkingDates.map((date: Date, idx: number) => (
                                <div key={format(date, "yyyy-MM-dd") + idx} className="flex items-center justify-between bg-bg-secondary rounded-xl px-4 py-3 shadow-sm border border-ultra-light hover:shadow-md transition-all duration-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                                    <span className="text-sm font-medium poppins">{format(date, "dd/MM/yyyy")}</span>
                                  </div>
                                  <button
                                    className="text-red-500 hover:text-white hover:bg-red-500 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1"
                                    onClick={() =>
                                      setting.setNonWorkingDates((prev: Date[]) =>
                                        prev.filter(
                                          (d: Date) =>
                                            format(d, "yyyy-MM-dd") !== format(date, "yyyy-MM-dd")
                                        )
                                      )
                                    }
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
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
                              <div className={`w-12 h-6 rounded-full transition-all duration-300 cursor-pointer ${setting.value ? 'bg-primary' : 'bg-gray-300'}`} onClick={() => setting.onChange(!setting.value)}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-all duration-300 ${setting.value ? 'translate-x-6' : 'translate-x-0.5'} translate-y-0.5`}></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <input
                            id={setting.id}
                            type={setting.type}
                            className="border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200 w-48 poppins text-sm bg-white shadow-sm hover:shadow-md"
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
        
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            className="px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark active:scale-95 transition-all duration-200 font-medium poppins text-sm shadow-md hover:shadow-lg flex items-center gap-2"
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


