import { getRequest, putRequest } from "./axios.service";


async function getPermissions(){
  return await getRequest('/api/permissions', 'getPermissions');
}


async function setPermissions(data: { IdPersonnel: number, IdDroit: number }[]) {
  return await putRequest('/api/permissions/', data, 'setPermissions');
}


export default {
  getPermissions,
  setPermissions
};
