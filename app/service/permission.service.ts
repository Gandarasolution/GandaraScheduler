import { getRequest, putRequest } from "./axios.service";


async function getPermissions(){
  return await getRequest('/demo/permissions', 'getPermissions');
}


async function setPermissions(data: { IdPersonnel: number, IdDroit: number }[]) {
  return await putRequest('/demo/permissions/', data, 'setPermissions');
}


export default {
  getPermissions,
  setPermissions
};
