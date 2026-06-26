import { getRequest, postRequest } from "./axios.service";


async function getPermissions(){
  return await getRequest('/api/permissions', 'getPermissions');
}

async function getSocialItemPermission(userId: number, itemId: number) {
  return await getRequest(`/api/social-item-permissions?userId=${userId}&itemId=${itemId}`, 'getSocialItemPermission');
}



// async function setSocialItemPermission(permission: SocialItemPermission) {
//   return await postRequest('/api/social-item-permissions', permission, 'setSocialItemPermission');
// }

export default {
  getSocialItemPermission,
  getPermissions,
  //setSocialItemPermission,
};
