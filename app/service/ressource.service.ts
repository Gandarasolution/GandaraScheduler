import { getRequest, postRequest, putRequest, deleteRequest } from "./axios.service";



async function searchRessources(query: string = '', types: string[] = [], limit: number = 20, timeoutMs: number = 5000) {
  const params = new URLSearchParams();
  params.set('q', query ?? '');
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

async function getFilterOptionsDynamic(types: string, keys: string[]) {

  console.log(keys.join(','));
  
  const params = new URLSearchParams();
  if (types.length > 0) {
    params.set('types', types);
  }
  if (keys.length > 0) {
    params.set('keys', keys.join(','));
  }
  return await getRequest(`/api/filters-options?${params.toString()}`, 'getFilterOptionsDynamic');
}


async function getRessourcesProjet(limit: number = 20, pageNum: number = 1, query: string = '', timeoutMs: number = 15000) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('pageNum', String(pageNum));
  params.set('q', query);

  return await getRequest(
    `/api/ressources/projets?${params.toString()}`,
    'getRessourcesProjet',
    { timeout: timeoutMs }
  );
}


export default {
  searchRessources,
  getRessourcesProjet,
  getFilterOptionsDynamic,
};
