import { useDragDropManager } from "react-dnd";
import { Appointment, Evenement } from "../../types";
import { memo, useEffect, useState } from "react";
import DraggableSource from "../DraggableSource";
import { addHours } from "date-fns";

type SearchOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  eventSearchInput: string;
  setEventSearchInput: (input: string) => void;
  filteredEvents: (Evenement) [];
  selectedCell:{ employeeId: number; date: Date } | null
  addAppointmentFromSearch: (appointment: Appointment, eventType: Evenement, includeAllNonWorkingDays: boolean) => void;
  isFullDay: boolean;
};

const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isOpen,
  onClose,
  eventSearchInput,
  setEventSearchInput,
  filteredEvents,
  selectedCell,
  addAppointmentFromSearch,
  isFullDay
}) => {
  const dragDropManager = useDragDropManager();
  const [isDragging, setIsDragging] = useState(false);

  // Utiliser React DnD pour détecter l'état de drag
  useEffect(() => {
    const monitor = dragDropManager.getMonitor();
    
    const unsubscribe = monitor.subscribeToStateChange(() => {
      const isDragInProgress = monitor.isDragging();
      setIsDragging(isDragInProgress);
    });

    return unsubscribe;
  }, [dragDropManager]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDragging) {
        onClose();
        setEventSearchInput('');
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, setEventSearchInput, isOpen, isDragging]);

  if (!isOpen) return null;
  
  return (
    <>
      <div 
        className={`fixed inset-0 overlay z-50  ${
          isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        onClick={() => {
          if (!isDragging) {
            onClose();
            setEventSearchInput('');
          }
        }}
      />
      <div 
        className={`fixed z-60 bg-opacity-0 rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col ${isDragging ? 'opacity-0' : 'opacity-100'} transition-all duration-300 ease-in-out`}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          top: '35%', 
          left: !isDragging ? '32%' : '100%' 
        }}
      >
        {/* Barre de recherche */}
        <div className="">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Rechercher un événement..."
              className="block bg-bg-secondary placeholder:text-primary text-primary w-full pl-10 pr-4 py-3 border border-light rounded-xl focus:outline-none focus:ring-2 focus:ring-color focus:border-transparent text-base"
              value={eventSearchInput}
              onChange={(e) => setEventSearchInput(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className=" p-3"></div>
        {/* Liste des événements filtrés */}
        <div className="flex-1 overflow-y-auto px-2 py-2 bg-bg-secondary rounded-2xl max-h-[50vh] shadow-lg border border-light text-primary">
          {eventSearchInput.trim() === '' ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">Rechercher un événement</p>
              <p className="text-sm">Tapez pour rechercher parmi les chantiers, absences et autres événements</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="w-16 h-16 mx-auto mb-4" viewBox="0 0 16 16">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
              </svg>
              <p className="text-lg font-medium mb-2">Aucun résultat</p>
              <p className="text-sm">Aucun événement ne correspond à votre recherche</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredEvents.map((event, index) => (
                <div 
                  key={`${event.label}-${event.id}-${index}`} 
                  className="w-full flex justify-between hover:bg-primary-ultra-light rounded-xl transition-colors px-2"
                >
                  <DraggableSource
                    key={`${event.label}-${event.id}-${index}`}
                    id={event.id}
                    title={event.label}
                    type={event.type as "Chantier" | "Absence" | "Autre"}
                    className="w-full"
                  />
                  {selectedCell && (
                    <div className="h-full">
                      <button
                        className="px-2 py-1 text-xl cursor-pointer h-full"
                        onClick={() => {
                          addAppointmentFromSearch(
                            {
                              description: event.label,
                              startDate: new Date(selectedCell.date),
                              endDate: new Date((isFullDay ? addHours(selectedCell.date, 23) : addHours(selectedCell.date, 11)).setMinutes(59, 59)),
                              employeeId: selectedCell.employeeId,
                              type: event.type.toLowerCase() as "chantier" | "absence" | "autre",
                            } as Appointment,
                            event,
                            false
                          )
                          onClose()
                          setEventSearchInput('');
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}


export default memo(SearchOverlay);