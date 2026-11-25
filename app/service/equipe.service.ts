import { deleteRequest, getRequest, postRequest, putRequest } from "./axios.service";

async function getEquipes() {
    return await getRequest(`/demo/equipes`, 'getEquipes');
}

async function createEquipe(data: any) {
    return await postRequest(`/demo/equipes`, data, 'createEquipe');
}

async function checkDeleteEquipe(id: number) {
    return await getRequest(`/demo/equipes/${id}/check-delete`, 'checkDeleteEquipe');
}

async function deleteEquipe(id: number, numberEmployeeCheck: number = 0) {
    return await deleteRequest(`/demo/equipes/${id}`, 'deleteEquipe', { numberEmployeeCheck });
}

async function getPoleActivites() {
    return await getRequest(`/demo/pole-activites`, 'getPoleActivites');
}

async function updateEquipe(id: number, data: any) {
    return await putRequest(`/demo/equipes/${id}`, data, 'updateEquipe');
}

async function getEquipePersonnel(id: number) {
    return await getRequest(`/demo/equipes/${id}/personnel`, 'getEquipePersonnel');
}


async function lockEquipe(id: number, nomPersonnel: string) {
    return await postRequest(`/demo/equipes/${id}/lock`, {nomPersonnel}, 'lockEquipe');
}

async function unlockEquipe(id: number) {
    return await deleteRequest(`/demo/equipes/${id}/unlock`, {}, 'unlockEquipe');
}

export default {
    getEquipes,
    createEquipe,
    deleteEquipe,
    getPoleActivites,
    updateEquipe,
    getEquipePersonnel,
    checkDeleteEquipe,
    lockEquipe,
    unlockEquipe 
}