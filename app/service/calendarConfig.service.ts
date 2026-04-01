import { getRequest, postRequest, putRequest, deleteRequest } from "./axios.service";

async function getCalendarConfigsByUserId(userId: number, idPlanning?: number) {
    if (!idPlanning) {
        idPlanning = 3; // Valeur par défaut pour idPlanning si non fourni
    }
  return await getRequest(`/api/configs/user/${userId}?idPlanning=${idPlanning}`, 'getCalendarConfigsByUserId');
}

async function createCalendarConfig(data: any) {
  return await postRequest('/api/calendar-configs', data, 'createCalendarConfig');
}

async function updateCalendarConfig(id: number, data: any) {
  return await putRequest(`/api/calendar-configs/${id}`, data, 'updateCalendarConfig');
}

async function deleteCalendarConfig(id: number) {
  return await deleteRequest(`/api/calendar-configs/${id}`, 'deleteCalendarConfig', {});
}

export default {
  getCalendarConfigsByUserId,
  createCalendarConfig,
  updateCalendarConfig,
  deleteCalendarConfig,
};
