import { DayType } from "../calendrier";
import { getRequest, postRequest, putRequest, deleteRequest } from "./axios.service";

async function getCalendarConfigsByUserId(userId: number, idPlanning: number) {
    if (!idPlanning) {
      console.error('idPlanning is required to fetch calendar configurations.');
      return null;
    }
  return await getRequest(`/demo/planning/vue/user/${userId}?idPlanning=${idPlanning}`, 'getCalendarConfigsByUserId');
}

async function getNonWorkingDates(years: number[]) {
  return await getRequest(`/demo/planning/non-working-dates?years=${years.join(',')}`, 'getNonWorkingDatesByPlanningId');
}

async function editNonWorkingDate(data: {id: number, date: Date, typeJourCode: string}) {
  return await putRequest(`/demo/planning/non-working-dates/${data.id}`, { nonWorkingDate: data.date, typeJourCode: data.typeJourCode }, 'editNonWorkingDate');
}

async function addNonWorkingDatesToPlanning(nonWorkingDate: number, codeType: string) {  
  return await postRequest(`/demo/planning/non-working-dates`, { nonWorkingDate, typeJourCode: codeType }, 'addNonWorkingDatesToPlanning');
}

async function removeNonWorkingDatesFromPlanning(idDate: number) {
  return await deleteRequest(`/demo/planning/${idDate}/non-working-dates`, 'removeNonWorkingDatesFromPlanning');
}

async function createCalendarConfig(data: any) {
  return await postRequest('/demo/planning/vue', data, 'createCalendarConfig');
}

async function updateCalendarConfig(id: number, data: any) {
  return await putRequest(`/demo/planning/vue/${id}`, data, 'updateCalendarConfig');
}

async function deleteCalendarConfig(id: number) {
  return await deleteRequest(`/demo/planning/vue/${id}`, 'deleteCalendarConfig', {});
}

async function lockCalendarConfig(id: number) {
  return await postRequest(`/demo/planning/vue/${id}/lock`, {}, 'lockCalendarConfig');
}

async function getLastVueForUser() {
  return await getRequest(`/demo/planning/getLastVue`, 'getLastVueForUser');
}

async function setLastVueForUser(idVue: number) {
  return await postRequest(`/demo/planning/setLastVue`, { idVue }, 'setLastVueForUser');
}

async function getLastPositionForUser() {
  return await getRequest(`/demo/planning/getLastPosition`, 'getLastPositionForUser');
}

async function setLastPositionForUser(date: number) {
  return await postRequest(`/demo/planning/setLastPosition`, { date }, 'setLastPositionForUser');
}

async function getVueDetails(id: number) {
  return await getRequest(`/demo/planning/vue/${id}`, 'getVueDetails');
}


async function getLastChantierView() {
  return await getRequest('/demo/planning/chantier/getLastVue', 'getLastChantierView');
}

async function setLastChantierView(idVue: number) {
  return await postRequest('/demo/planning/chantier/setLastVue', { idVue }, 'setLastChantierView');
}

async function getChantierViewDetails(id: number, viewType: string) {
  return await getRequest(`/demo/planning/chantier/vue/${id}?viewType=${viewType}`, 'getChantierViewDetails');
}

async function getChantierViewsByUserId(userId: number) {
  return await getRequest(`/demo/planning/chantier/vue/user/${userId}`, 'getChantierViewsByUserId');
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

  return await postRequest('/demo/planning/chantier/vue', {
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
    '/demo/planning/chantier/vue/' + id,
    {
      planningVue: chantierPlanningVue,
      utilisateursAutorises: data.utilisateursAutorises,
    },
    'updateChantierView',
  );
}

async function getMobileAppointmentDisplayConfig() {
  return await getRequest(`/demo/planning/mobile/display`, 'getMobileAppointmentDisplayConfig');
}

async function getMobileAppointmentDisplayConfigSettings() {
  return await getRequest(`/demo/planning/mobile/settings`, 'getMobileAppointmentDisplayConfigSettings');
}


async function saveMobileAppointmentDisplayConfig(data: {
  idPersonnel: number;
  primaryFields: Array<{ CodeChamp: string; Ligne: number; Position: number }>;
  secondaryFields: Array<{ CodeChamp: string; Ligne: number; Position: number }>;
}) {
  return await postRequest('/demo/planning/mobile/save', data, 'saveMobileAppointmentDisplayConfig');
}

async function deleteChantierVue(id: number) {
  return await deleteRequest(`/demo/planning/chantier/vue/${id}`, 'deleteChantierVue', {});
}


async function updateDayType(dayType: DayType) {
  return await putRequest(`/demo/planning/day-type/${dayType.Id}`, dayType, 'updateDayType');
}

async function addDayType(dayType: DayType) {
  return await postRequest(`/demo/planning/day-type`, dayType, 'addDayType');
}

async function removeDayType(dayTypeId: string, numberDayCheck: number) {
  return await deleteRequest(`/demo/planning/day-type/${dayTypeId}`, 'removeDayType', { numberDayCheck });
}

async function getDayTypes() {
  return await getRequest(`/demo/planning/day-type`, 'getDayTypes');
}

async function getAvailableColumns(viewType: string, timeoutMs: number = 5000) {
  const params = new URLSearchParams();
  params.set('viewType', viewType);
  return await getRequest(`/demo/planning/vue/available-columns?${params.toString()}`, 'getAvailableColumns', { timeout: timeoutMs });
}

async function getAvailablesYearForNonWorkingDate() {
  return await getRequest(`/demo/planning/non-working-dates/available-years`, 'getAvailablesYearForNonWorkingDate');
}

async function onCheckDeleteDayType(id: string) {
  return await getRequest(`/demo/planning/day-type/${id}/delete-impact`, 'onCheckDeleteDayType');
}

export default {
  getCalendarConfigsByUserId,
  createCalendarConfig,
  updateCalendarConfig,
  deleteCalendarConfig,
  addNonWorkingDatesToPlanning,
  removeNonWorkingDatesFromPlanning,
  getNonWorkingDates,
  lockCalendarConfig,
  getLastVueForUser,
  setLastVueForUser,
  getLastPositionForUser,
  setLastPositionForUser,
  getVueDetails,
  getLastChantierView,
  getChantierViewDetails,
  getChantierViewsByUserId,
  createChantierView,
  updateChantierView,
  getMobileAppointmentDisplayConfig,
  getMobileAppointmentDisplayConfigSettings,
  saveMobileAppointmentDisplayConfig,
  setLastChantierView,
  deleteChantierVue,
  updateDayType,
  addDayType,
  removeDayType,
  getDayTypes,
  getAvailableColumns,
  getAvailablesYearForNonWorkingDate,
  editNonWorkingDate,
  onCheckDeleteDayType
};
