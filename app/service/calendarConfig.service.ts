import { getRequest, postRequest, putRequest, deleteRequest } from "./axios.service";

async function getCalendarConfigsByUserId(userId: number, idPlanning: number) {
    if (!idPlanning) {
      console.error('idPlanning is required to fetch calendar configurations.');
      return null;
    }
  return await getRequest(`/api/planning/vue/user/${userId}?idPlanning=${idPlanning}`, 'getCalendarConfigsByUserId');
}

async function addNonWorkingDatesToPlanning(idPlanning: number, nonWorkingDate: number) {
  console.log(idPlanning);
  
  return await postRequest(`/api/planning/${idPlanning}/non-working-dates`, { nonWorkingDate }, 'addNonWorkingDatesToPlanning');
}

async function removeNonWorkingDatesFromPlanning(idDate: number) {
  return await deleteRequest(`/api/planning/${idDate}/non-working-dates`, 'removeNonWorkingDatesFromPlanning');
}

async function createCalendarConfig(data: any) {
  return await postRequest('/api/planning/vue', data, 'createCalendarConfig');
}

async function updateCalendarConfig(id: number, data: any) {
  return await putRequest(`/api/planning/vue/${id}`, data, 'updateCalendarConfig');
}

async function deleteCalendarConfig(id: number) {
  return await deleteRequest(`/api/planning/vue/${id}`, 'deleteCalendarConfig', {});
}

export default {
  getCalendarConfigsByUserId,
  createCalendarConfig,
  updateCalendarConfig,
  deleteCalendarConfig,
  addNonWorkingDatesToPlanning,
  removeNonWorkingDatesFromPlanning
};
