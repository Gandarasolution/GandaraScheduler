import { getRequest, postRequest } from "./axios.service";

async function getImage(id: number) {
  return await getRequest(`/api/images/${id}`, 'getImage');
}

async function getImagesPaginated(page: number, limit: number) {
  const params = new URLSearchParams();
  params.set('pageNum', String(page));
  params.set('limit', String(limit));
  const queryParams = `?${params.toString()}`;
  return await getRequest(`/api/images${queryParams}`, 'getImagesPaginated');
}

async function uploadImage(data: any) {
  return await postRequest('/api/images', data, 'uploadImage');
}

export default {
  getImage,
  getImagesPaginated,
  uploadImage,
};
