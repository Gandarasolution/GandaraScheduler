import { getRequest, putRequest } from "./axios.service";

async function getEmployees() {
    return await getRequest(`/api/employees`, 'getEmployees');
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
    updateEmployee
}