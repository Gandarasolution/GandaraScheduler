import { useState } from "react";
import { DayType } from "../../types";
import { calendarConfigService } from '@/app/service';


interface DayTypesProps {
  
}


export const useDayTypes = ({
  
}: DayTypesProps) => {

    const [DayTypes, setDayTypes] = useState<Array<DayType> | null>(null);





    const updateDayType = async (updatedDayType: DayType) : Promise<{success: boolean, message?: string}> => {
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
    }

    const addDayType = async (newDayType: DayType) : Promise<{success: boolean, message?: string}> => {
        try {
            const response = await calendarConfigService.addDayType(newDayType);

            if (response && response.success) {
                setDayTypes(response.data);
                return { success: true };
            }
            else {
                return { success: false, message: response.message || "Failed to add day type" };
            }
        } catch (error) {
            console.error("Error adding day type:", error);
            return { success: false, message: "An error occurred while adding the day type" };
        }
    }

    const removeDayType = async (dayTypeId: string) : Promise<{success: boolean, message?: string}> => {
        try {
            const response = await calendarConfigService.removeDayType(dayTypeId);
            
            if (response && response.success) {
                setDayTypes(response.data);
                return { success: true };
            }
            else {
                return { success: false, message: response.message || "Failed to remove day type" };
            }
        } catch (error) {
            console.error("Error removing day type:", error);
            return { success: false, message: "An error occurred while removing the day type" };
        }
    }

    const fetchDayTypes = async () : Promise<{success: boolean, message?: string}> => {
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
    }


    return {
        DayTypes,
        setDayTypes,
        updateDayType,
        addDayType,
        removeDayType,
        fetchDayTypes
    };

}