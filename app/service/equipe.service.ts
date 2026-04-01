import { deleteRequest, getRequest, postRequest } from "./axios.service";

async function getEquipes() {
    return await getRequest(`/api/equipes`, 'getEquipes');
}

async function createEquipe(data: any) {
    return await postRequest(`/api/equipes`, data, 'createEquipe');
}
    
async function deleteEquipe(id: number) {
    return await deleteRequest(`/api/equipes/${id}`, 'deleteEquipe', {});
}

export default {
    getEquipes,
    createEquipe,
    deleteEquipe
}