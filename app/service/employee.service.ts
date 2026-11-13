import { getRequest, putRequest } from "./axios.service";

async function getEmployeesPlanning() {
    return await getRequest(`/demo/employees/planning`, 'getEmployees');
}

async function getEmployeesPag(limit: number = 20, pageNum: number = 1, query: string = '', activeFilters: { [key: string]: string[] } = {}, timeoutMs: number = 15000) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('pageNum', String(pageNum));
    params.set('q', query);

    for (const filterKey in activeFilters) {
        if (activeFilters[filterKey].length > 0) {
        params.set(filterKey, activeFilters[filterKey].join(','));
        }
    }

    return await getRequest(
        `/demo/employees/search?${params.toString()}`,
        'getEmployees',
        { timeout: timeoutMs }
    );
}

async function getEmployee(id: number) {
    return await getRequest(`/demo/employees/${id}`, 'getEmployee');
}

async function updateEquipeEmployee(id: number, data: any) {
    return await putRequest(`/demo/employees/équipe/${id}`, data, 'updateEquipeEmployee');
}

async function getAllUsersActif() {
  return await getRequest(`/demo/employees`, 'getAllUsersActif');
}


export default {
    getEmployeesPlanning,
    getEmployee,
    updateEquipeEmployee,
    getEmployeesPag,
    getAllUsersActif,
}