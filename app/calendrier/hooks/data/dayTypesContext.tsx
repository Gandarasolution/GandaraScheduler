import React, { createContext, useState, useContext, ReactNode } from "react";
import { DayType } from "../../types"; // Ajuste le chemin selon ton projet
import { calendarConfigService } from '@/app/service'; // Ajuste le chemin

// 1. Définir le type des données exposées par le contexte
interface DayTypesContextType {
    DayTypes: Array<DayType> | null;
    setDayTypes: React.Dispatch<React.SetStateAction<Array<DayType> | null>>;
    updateDayType: (updatedDayType: DayType) => Promise<{ success: boolean; message?: string }>;
    addDayType: (newDayType: DayType) => Promise<{ success: boolean; message?: string }>;
    removeDayType: (dayTypeId: string) => Promise<{ success: boolean; message?: string }>;
    fetchDayTypes: () => Promise<{ success: boolean; message?: string }>;
}

// 2. Créer le contexte avec une valeur par défaut (utile pour l'autocomplétion)
const DayTypesContext = createContext<DayTypesContextType | undefined>(undefined);

// 3. Créer le composant Provider
export const DayTypesProvider = ({ children }: { children: ReactNode }) => {
    // On déplace l'état et les fonctions ici
    const [DayTypes, setDayTypes] = useState<Array<DayType> | null>(null);

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

    const removeDayType = async (dayTypeId: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await calendarConfigService.removeDayType(dayTypeId);
            if (response && response.success) {
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

    return (
        <DayTypesContext.Provider
            value={{
                DayTypes,
                setDayTypes,
                updateDayType,
                addDayType,
                removeDayType,
                fetchDayTypes,
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