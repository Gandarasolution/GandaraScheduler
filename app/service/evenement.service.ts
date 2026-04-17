import {deleteRequest, getRequest, postRequest, putRequest} from "./axios.service";

function normalizeEvent(rawEvent: any) {
    if (!rawEvent || typeof rawEvent !== 'object') {
        return rawEvent;
    }

    const employee = rawEvent.Employee ?? rawEvent.employee ?? null;

    return {
        ...rawEvent,
        Employee: employee,
        PlanningEvenementPriorite: rawEvent.PlanningEvenementPriorite ?? rawEvent.priority ?? 0,
    };
}

function normalizeEventListResponse(response: any) {
    if (response?.error === 0 && response?.data && typeof response.data === 'object') {
        const appointments = Array.isArray(response.data.appointments)
            ? response.data.appointments.map(normalizeEvent)
            : [];
        const ressources = Array.isArray(response.data.ressources)
            ? response.data.ressources
            : [];

        return {
            ...response,
            data: {
                ...response.data,
                appointments,
                ressources,
            },
        };
    }

    if (Array.isArray(response)) {
        return {
            error: 0,
            data: response.map(normalizeEvent),
        };
    }

    if (response?.error === 0 && Array.isArray(response.data)) {
        return {
            ...response,
            data: response.data.map(normalizeEvent),
        };
    }

    return response;
}

function normalizeSingleEventResponse(response: any) {
    if (response?.error === 0 && response?.data && typeof response.data === 'object') {
        const appointments = Array.isArray(response.data.appointments)
            ? response.data.appointments.map(normalizeEvent)
            : [];
        const ressources = Array.isArray(response.data.ressources)
            ? response.data.ressources
            : [];

        return {
            ...response,
            data: {
                ...response.data,
                appointments,
                ressources,
            },
        };
    }

    if (Array.isArray(response)) {
        return {
            error: 0,
            data: normalizeEvent(response[0] ?? null),
        };
    }

    if (response?.error === 0 && Array.isArray(response.data)) {
        return {
            ...response,
            data: normalizeEvent(response.data[0] ?? null),
        };
    }

    if (response?.error === 0 && response?.data) {
        return {
            ...response,
            data: normalizeEvent(response.data),
        };
    }

    return response;
}

function toApiEventPayload(data: any) {
    const employeeId = data?.IdEmploye ?? data?.Employee?.IdPersonnel ?? data?.employee?.IdPersonnel ?? null;
    const ressourceId = data?.IdPlanningRessource ?? data?.Ressource?.IdPlanningRessource ?? null;
    const etiquetteId = data?.IdPlanningEtiquette ?? data?.Etiquette?.IdPlanningEtiquette ?? null;
    const eventType = data?.Type ?? data?.Ressource?.Type ?? data?.ressource?.Type ?? null;

    return {
        IdEmploye: employeeId,
        Type: eventType,
        DebutPlanningEvenement: data?.DebutPlanningEvenement ?? null,
        FinPlanningEvenement: data?.FinPlanningEvenement ?? null,
        AnnotationPlanningEvenement: data?.AnnotationPlanningEvenement ?? null,
        IdPlanningRessource: ressourceId,
        IdPlanningEtiquette: etiquetteId,
        PlanningEvenementPriorite: data?.PlanningEvenementPriorite ?? 0,
    };
}


async function getEvenements(startDate: number, endDate: number) {
    const startStr = new Date(startDate).toISOString().split('T')[0];
    const endStr = new Date(endDate).toISOString().split('T')[0];

    const response = await getRequest(`/api/event/${startStr}/${endStr}`, 'getEvenements');
    return normalizeEventListResponse(response);
}

async function getEvenement(id: string) {
    const response = await getRequest(`/api/event/${id}`, 'getEvenement');
    return normalizeSingleEventResponse(response);
}

async function getEvenementByUser(id: string, type: 'Salarie' | 'Interim') {
    const response = await getRequest(`/api/event?employee=${id}&type=${type}`, 'getEvenementByUser');
    return normalizeEventListResponse(response);
}


async function createEvenement(data: any) {
    const response = await postRequest(`/api/event`, toApiEventPayload(data), 'createEvenement');
    return normalizeSingleEventResponse(response);
}


async function updateEvenement(id: string, data: any) {
    return await putRequest(`/api/event/${id}`, toApiEventPayload(data), 'updateEvenement');
}

async function deleteEvenement(id: string) {
    return await deleteRequest(`/api/event/${id}`, 'deleteEvenement', {});
}

async function updateEvenementAndRessource(id: string, data: any) {
    const payload = {
        ...toApiEventPayload(data),
        Ressource: {
            CouleurFondPlanningRessource: data?.CouleurFondPlanningRessource ?? data?.Ressource?.CouleurFondPlanningRessource ?? null,
            CouleurBordurePlanningRessource: data?.CouleurBordurePlanningRessource ?? data?.Ressource?.CouleurBordurePlanningRessource ?? null,
            CouleurTextePlanningRessource: data?.CouleurTextePlanningRessource ?? data?.Ressource?.CouleurTextePlanningRessource ?? null,
            IdImage: data?.IdImage ?? data?.Ressource?.IdImage ?? null,
        },
    };
    return await putRequest(`/api/event/updateRessourceAndEvent/${id}`, payload, 'updateEvenementAndRessource');
}


export default {

    getEvenements,
    getEvenement,
    getEvenementByUser,
    createEvenement,
    updateEvenement,
    deleteEvenement,
    updateEvenementAndRessource
}