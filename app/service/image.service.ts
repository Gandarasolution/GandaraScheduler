import { getRequest, postRequest } from "./axios.service";

async function getImages() {
  return await getRequest('/api/images', 'getImages');
}

async function uploadImage(data: any) {
  return await postRequest('/api/images', data, 'uploadImage');
}

export default {
  getImages,
  uploadImage,
};
