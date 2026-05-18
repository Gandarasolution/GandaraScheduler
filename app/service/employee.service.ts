import { getRequest, putRequest } from "./axios.service";

async function getEmployees() {
    return await getRequest(`/api/employees`, 'getEmployees');
}

async function getEmployeesPag(limit: number = 20, pageNum: number = 1, query: string = '', timeoutMs: number = 15000) {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    params.set('pageNum', String(pageNum));
    params.set('q', query);
    return await getRequest(
        `/api/employees?${params.toString()}`,
        'getEmployees',
        { timeout: timeoutMs }
    );
}

async function getEmployee(id: string) {
    return await getRequest(`/api/employees/${id}`, 'getEmployee');
}

async function updateEmployee(id: string, data: any) {
    return await putRequest(`/api/employees/${id}`, data, 'updateEmployee');
}

export default {
    getEmployees,
    getEmployee,
    updateEmployee,
    getEmployeesPag,
}