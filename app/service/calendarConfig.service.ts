import { getRequest, postRequest, putRequest, deleteRequest } from "./axios.service";

async function getCalendarConfigsByUserId(userId: number, idPlanning: number) {
    if (!idPlanning) {
      console.error('idPlanning is required to fetch calendar configurations.');
      return null;
    }
  return await getRequest(`/api/planning/vue/user/${userId}?idPlanning=${idPlanning}`, 'getCalendarConfigsByUserId');
}

async function getNonWorkingDatesByPlanningId() {
  return await getRequest(`/api/planning/non-working-dates`, 'getNonWorkingDatesByPlanningId');
}

async function addNonWorkingDatesToPlanning(nonWorkingDate: number) {  
  return await postRequest(`/api/planning/non-working-dates`, { nonWorkingDate }, 'addNonWorkingDatesToPlanning');
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

async function lockCalendarConfig(id: number) {
  return await postRequest(`/api/planning/vue/${id}/lock`, {}, 'lockCalendarConfig');
}

async function getLastVueForUser() {
  return await getRequest(`/api/planning/getLastVue`, 'getLastVueForUser');
}

async function setLastVueForUser(idVue: number) {
  return await postRequest(`/api/planning/setLastVue`, { idVue }, 'setLastVueForUser');
}

async function getLastPositionForUser() {
  return await getRequest(`/api/planning/getLastPosition`, 'getLastPositionForUser');
}

async function setLastPositionForUser(date: number) {
  return await postRequest(`/api/planning/setLastPosition`, { date }, 'setLastPositionForUser');
}

async function getVueDetails(id: number) {
  return await getRequest(`/api/planning/vue/${id}`, 'getVueDetails');
}

async function getAllUsersForVue() {
  return await getRequest(`/api/planning/vue/users`, 'getAllUsersForVue');
}

async function getLastChantierView() {
  return await getRequest('/api/planning/chantier/getLastVue', 'getLastChantierView');
}

async function getChantierViewDetails(id: number, viewType: string) {
  return await getRequest(`/api/planning/chantier/vue/${id}?viewType=${viewType}`, 'getChantierViewDetails');
}

async function getChantierViewsByUserId(userId: number) {
  return await getRequest(`/api/planning/chantier/vue/user/${userId}`, 'getChantierViewsByUserId');
}

async function createChantierView(data: {
  planningVue: Record<string, unknown>;
  filtres: {[k: string]: string[]};
  utilisateursAutorises: number[];
}) {
  const planningVue = data.planningVue;
  const chantierPlanningVue = {
    IdPlanningVue: planningVue.IdPlanningVue ?? planningVue.id,
    LibellePlanningVue: planningVue.LibellePlanningVue ?? planningVue.libelle,
    DescriptionPlanningVue: planningVue.DescriptionPlanningVue ?? planningVue.description ?? '',
    IdPlanningImage: planningVue.IdPlanningImage ?? planningVue.idImage ?? null,
    filtres: data.filtres,
    ChantierColonnes: planningVue.ChantierColonnes ?? planningVue.columns ?? [],
  };

  return await postRequest('/api/planning/vue', {
      planningVue: chantierPlanningVue,
      utilisateursAutorises: data.utilisateursAutorises,
    }, 'createChantierView');
}

async function updateChantierView(id: number, data: {
  planningVue: Record<string, unknown>;
  filtres: {[k: string]: string[]};
  utilisateursAutorises: number[];
}) {
  const planningVue = data.planningVue;
  const chantierPlanningVue = {
    IdPlanningVue: planningVue.IdPlanningVue ?? planningVue.id,
    LibellePlanningVue: planningVue.LibellePlanningVue ?? planningVue.libelle,
    DescriptionPlanningVue: planningVue.DescriptionPlanningVue ?? planningVue.description ?? '',
    IdPlanningImage: planningVue.IdPlanningImage ?? planningVue.idImage ?? null,
    filtres: data.filtres,
    ChantierColonnes: planningVue.ChantierColonnes ?? planningVue.columns ?? [],
  };

  return await putRequest(
    '/api/planning/chantier/vue/' + id,
    {
      planningVue: chantierPlanningVue,
      utilisateursAutorises: data.utilisateursAutorises,
    },
    'updateChantierView',
  );
}

async function getMobileAppointmentDisplayConfig() {
  return await getRequest(`/api/planning/mobile/display`, 'getMobileAppointmentDisplayConfig');
}

async function getMobileAppointmentDisplayConfigSettings() {
  return await getRequest(`/api/planning/mobile/settings`, 'getMobileAppointmentDisplayConfigSettings');
}


async function saveMobileAppointmentDisplayConfig(data: {
  idPersonnel: number;
  primaryFields: string[];
  secondaryFields: string[];
}) {
  return await postRequest('/api/planning/mobile/save', data, 'saveMobileAppointmentDisplayConfig');
}


export default {
  getCalendarConfigsByUserId,
  createCalendarConfig,
  updateCalendarConfig,
  deleteCalendarConfig,
  addNonWorkingDatesToPlanning,
  removeNonWorkingDatesFromPlanning,
  getNonWorkingDatesByPlanningId,
  lockCalendarConfig,
  getLastVueForUser,
  setLastVueForUser,
  getLastPositionForUser,
  setLastPositionForUser,
  getVueDetails,
  getAllUsersForVue,
  getLastChantierView,
  getChantierViewDetails,
  getChantierViewsByUserId,
  createChantierView,
  updateChantierView,
  getMobileAppointmentDisplayConfig,
  getMobileAppointmentDisplayConfigSettings,
  saveMobileAppointmentDisplayConfig
};
