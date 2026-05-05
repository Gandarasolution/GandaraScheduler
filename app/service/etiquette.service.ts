import { getRequest, postRequest } from "./axios.service";

function getEtiquettes(idRessource: number) {
    return getRequest(`/api/etiquettes/${idRessource}`)
}

function createEtiquette(data: any) {
    console.log(data);
    
    return postRequest('/api/etiquettes', data);
}

export default {
    getEtiquettes,
    createEtiquette
}