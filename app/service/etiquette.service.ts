import { getRequest, postRequest, deleteRequest } from "./axios.service";

function getEtiquettes(idRessource: number) {
    return getRequest(`/demo/etiquettes/${idRessource}`)
}

function createEtiquette(data: any) {
    
    const payload = {
        IdPlanningRessource: data.IdPlanningRessource,
        LibelleCourtPlanningEtiquette: data.LibelleCourtPlanningEtiquette ?? null,
        LibelleLongPlanningEtiquette: data.LibelleLongPlanningEtiquette ?? "BPE"
    }    
    return postRequest('/demo/etiquettes', payload);
}

function deleteEtiquette(idEtiquette: number) {
    return deleteRequest(`/demo/etiquettes/${idEtiquette}`, {});
}

export default {
    getEtiquettes,
    createEtiquette,
    deleteEtiquette
}