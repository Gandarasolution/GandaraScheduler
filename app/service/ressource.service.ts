import { getRequest, postRequest, putRequest, deleteRequest } from "./axios.service";



async function searchRessources(query: string, types: string[] = [], limit: number = 20, timeoutMs: number = 5000) {
  const params = new URLSearchParams();
  params.set('q', query);
  if (types.length > 0) {
    params.set('types', types.join(','));
  }
  params.set('limit', String(limit));
  

  return await getRequest(
    `/api/ressources/search?${params.toString()}`,
    'searchRessources',
    { timeout: timeoutMs }
  );
}



export default {
  searchRessources,

};
