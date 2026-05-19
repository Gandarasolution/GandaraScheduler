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

  //console.log(keys.join(','));
  
  const params = new URLSearchParams();
  if (types.length > 0) {
    params.set('types', types);
  }
  if (keys.length > 0) {
    params.set('keys', keys.join(','));
  }
  return await getRequest(`/api/filters-options?${params.toString()}`, 'getFilterOptionsDynamic');
}


async function getRessourcesProjet(limit: number = 20, pageNum: number = 1, query: string = '', activeFilters: { [key: string]: string[] } = {}, timeoutMs: number = 15000) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('pageNum', String(pageNum));
  params.set('q', query);
  
  for (const filterKey in activeFilters) {
    //console.log(activeFilters[filterKey], activeFilters[filterKey].length);
    
    if (activeFilters[filterKey].length > 0) {
      //console.log(`Filtering by ${filterKey}:`, activeFilters[filterKey].join(','));
      
      params.set(filterKey, activeFilters[filterKey].join(','));
    }
  }
  console.log(params.toString());
  

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
