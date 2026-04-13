import { getRequest, postRequest } from "./axios.service";

async function getImage(id: number) {
  return await getRequest(`/api/images/${id}`, 'getImage');
}

async function uploadImage(data: any) {
  return await postRequest('/api/images', data, 'uploadImage');
}

export default {
  getImage,
  uploadImage,
};
