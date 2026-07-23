import { getRequest, postRequest, deleteRequest } from "./axios.service";

function getEtiquettes(idRessource: number) {
    return getRequest(`/api/etiquettes/${idRessource}`)
}

function createEtiquette(data: any) {
    
    const payload = {
        IdPlanningRessource: data.IdPlanningRessource,
        LibelleCourtPlanningEtiquette: data.LibelleCourtPlanningEtiquette ?? null,
        LibelleLongPlanningEtiquette: data.LibelleLongPlanningEtiquette ?? "BPE"
    }    
    return postRequest('/api/etiquettes', payload);
}

function deleteEtiquette(idEtiquette: number) {
    return deleteRequest(`/api/etiquettes/${idEtiquette}`, {});
}

export default {
    getEtiquettes,
    createEtiquette,
    deleteEtiquette
}