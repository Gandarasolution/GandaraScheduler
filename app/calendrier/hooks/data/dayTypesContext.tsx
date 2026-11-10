import React, { createContext, useState, useContext, ReactNode } from "react";
import { DayType } from "../../types"; // Ajuste le chemin selon ton projet
import { calendarConfigService } from '@/app/service'; // Ajuste le chemin

// 1. Définir le type des données exposées par le contexte
interface DayTypesContextType {
    DayTypes: Array<DayType> | null;
    setDayTypes: React.Dispatch<React.SetStateAction<Array<DayType> | null>>;
    updateDayType: (updatedDayType: DayType) => Promise<{ success: boolean; message?: string }>;
    addDayType: (newDayType: DayType) => Promise<{ success: boolean; message?: string }>;
    removeDayType: (dayTypeId: string, numberDayCheck: number) => Promise<{ success: boolean; message?: string }>;
    fetchDayTypes: () => Promise<{ success: boolean; message?: string }>;
    onCheckDeleteDayType: (id: string) => Promise<{ success: boolean; message?: string; checkRequired: boolean }>;
    nonWorkingDates: Record<string, {Id: number; TypeJourCode: string }>;
    loadNonWorkingDates: (years: number[]) => Promise<{ success: boolean; message: string }>;
    setNonWorkingDates: React.Dispatch<React.SetStateAction<Record<string, {Id: number; TypeJourCode: string }>>>;
}

// 2. Créer le contexte avec une valeur par défaut (utile pour l'autocomplétion)
const DayTypesContext = createContext<DayTypesContextType | undefined>(undefined);

// 3. Créer le composant Provider
export const DayTypesProvider = ({ children }: { children: ReactNode }) => {
    // On déplace l'état et les fonctions ici
    const [DayTypes, setDayTypes] = useState<Array<DayType> | null>(null);
    const [nonWorkingDates, setNonWorkingDates] = useState<Record<string, {Id: number; TypeJourCode: string }>>({});

    const updateDayType = async (updatedDayType: DayType): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await calendarConfigService.updateDayType(updatedDayType);
            if (response && response.success) {
                setDayTypes(response.data);
                return { success: true };
            } else {
                return { success: false, message: response.message || "Failed to update day type" };
            }
        } catch (error) {
            console.error("Error updating day type:", error);
            return { success: false, message: "An error occurred while updating the day type" };
        }
    };

    const addDayType = async (newDayType: DayType): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await calendarConfigService.addDayType(newDayType);
            if (response && response.success) {
                setDayTypes(response.data);
                return { success: true };
            } else {
                return { success: false, message: response.message || "Failed to add day type" };
            }
        } catch (error) {
            console.error("Error adding day type:", error);
            return { success: false, message: "An error occurred while adding the day type" };
        }
    };

    const removeDayType = async (dayTypeId: string, numberDayCheck: number): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await calendarConfigService.removeDayType(dayTypeId, numberDayCheck);
            if (response && response.success) {
                setNonWorkingDates(current => {
                    const updatedDates = { ...current };
                    // Supprimer toutes les entrées correspondant au dayTypeId
                    for (const date in updatedDates) {
                        if (updatedDates[date].TypeJourCode === dayTypeId) {
                            delete updatedDates[date];
                        }
                    }
                    return updatedDates;
                });
                setDayTypes(response.data);
                return { success: true };
            } else {
                return { success: false, message: response.message || "Failed to remove day type" };
            }
        } catch (error) {
            console.error("Error removing day type:", error);
            return { success: false, message: "An error occurred while removing the day type" };
        }
    };

    const fetchDayTypes = async (): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await calendarConfigService.getDayTypes();
            if (response && response.success && response.data) {
                setDayTypes(response.data);
                return { success: true };
            } else {
                return { success: false, message: response.message || "Failed to fetch day types" };
            }
        } catch (error) {
            console.error("Error fetching day types:", error);
            return { success: false, message: "An error occurred while fetching the day types" };
        }
    };

    const onCheckDeleteDayType = async (id: string): Promise<{ success: boolean; message?: string; checkRequired: boolean }> => {
        try {
            const response = await calendarConfigService.onCheckDeleteDayType(id);
            if (response && response.success) {
                return { success: true, checkRequired: response.checkRequired, message: response.message };
            } else {
                return { success: false, message: response.message || "Failed to check delete day type", checkRequired: false };
            }
        } catch (error) {
            console.error("Error checking delete day type:", error);
            return { success: false, message: "An error occurred while checking the delete day type" , checkRequired: false };
        }
    };

    const loadNonWorkingDates = async ( years: number[] ): Promise<{ success: boolean; message: string }> => {
          const result = await calendarConfigService.getNonWorkingDates(years);
          //console.log('Résultat du chargement des jours non travaillés :', result);
          if (result?.success && result.data) {
            const nonWorkingDates = result.data.nonWorkingDates
            const recordData = Object.fromEntries(
              nonWorkingDates.map((item: { DatePlanningJourNontravaille: any; IdPlanningJourNontravaille: string; TypeJourCode: string; }) => [
                  item.DatePlanningJourNontravaille, // La clé (string)
                  { Id: Number(item.IdPlanningJourNontravaille), TypeJourCode: item.TypeJourCode } // La valeur (object)
              ])
            );
    
            // 2. On met à jour le state
            setNonWorkingDates(recordData);
    
    
            const dayTypes = result.data.typesNonWorkingDates;
            if (Array.isArray(dayTypes)) {
              setDayTypes(dayTypes);
            } else {
              console.warn('Les types de jours non travaillés ne sont pas au format attendu :', dayTypes);
            }
    
    
            return { success: true, message: 'Jours non travaillés chargés avec succès' };
          }else {
            return { success: false, message: result?.message || 'Erreur lors du chargement des jours non travaillés'};
          }
      };
    

    return (
        <DayTypesContext.Provider
            value={{
                DayTypes,
                setDayTypes,
                updateDayType,
                addDayType,
                removeDayType,
                fetchDayTypes,
                onCheckDeleteDayType,
                nonWorkingDates,
                loadNonWorkingDates,
                setNonWorkingDates
            }}
        >
            {children}
        </DayTypesContext.Provider>
    );
};

// 5. Créer un Hook personnalisé pour utiliser le contexte facilement
export const useDayTypesContext = () => {
    const context = useContext(DayTypesContext);
    if (context === undefined) {
        throw new Error("useDayTypesContext must be used within a DayTypesProvider");
    }
    return context;
};