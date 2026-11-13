import { deleteRequest, getRequest, postRequest } from "./axios.service";

async function getEquipes() {
    return await getRequest(`/demo/equipes`, 'getEquipes');
}

async function createEquipe(data: any) {
    return await postRequest(`/demo/equipes`, data, 'createEquipe');
}
    
async function deleteEquipe(id: number) {
    return await deleteRequest(`/demo/equipes/${id}`, 'deleteEquipe', {});
}

async function getPoleActivites() {
    return await getRequest(`/demo/pole-activites`, 'getPoleActivites');
}

export default {
    getEquipes,
    createEquipe,
    deleteEquipe,
    getPoleActivites
}