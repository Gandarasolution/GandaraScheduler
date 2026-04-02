import { getRequest, postRequest, putRequest, deleteRequest } from "./axios.service";

async function getRessources() {
  return await getRequest('/api/rubriques', 'getRubriques');
}



export default {
  getRubriques: getRessources,

};
