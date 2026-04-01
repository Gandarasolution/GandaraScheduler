import { getRequest, postRequest, putRequest, deleteRequest } from "./axios.service";

async function getRubriques() {
  return await getRequest('/api/rubriques', 'getRubriques');
}



export default {
  getRubriques,

};
