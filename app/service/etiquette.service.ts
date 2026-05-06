import { getRequest, postRequest } from "./axios.service";

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

export default {
    getEtiquettes,
    createEtiquette
}