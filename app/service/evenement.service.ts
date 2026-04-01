import {deleteRequest, getRequest, postRequest, putRequest} from "./axios.service";



async function getEvenements(startDate: number, endDate: number) {
    const startStr = new Date(startDate).toISOString().split('T')[0];
    const endStr = new Date(endDate).toISOString().split('T')[0];

    return await getRequest(`/api/event/${startStr}/${endStr}`, 'getEvenements');
}

async function getEvenement(id: string) {
    return await getRequest(`/api/event/${id}`, 'getEvenement');
}

async function getEvenementByUser(id: string, type: 'Salarie' | 'Interim') {
    return await getRequest(`/api/event?employee=${id}&type=${type}`, 'getEvenementByUser');
}


async function createEvenement(data: any) {
    return await postRequest(`/api/event`, data, 'createEvenement');
}


async function updateEvenement(id: string, data: any) {
    return await putRequest(`/api/event/${id}`, data, 'updateEvenement');
}

async function deleteEvenement(id: string) {
    return await deleteRequest(`/api/event/${id}`, 'deleteEvenement', {});
}

export default {

    getEvenements,
    getEvenement,
    getEvenementByUser,
    createEvenement,
    updateEvenement,
    deleteEvenement
}