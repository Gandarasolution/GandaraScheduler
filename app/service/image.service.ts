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

async function uploadImage(image: File) {
  const formData = new FormData();
  
  formData.append('image', image);

  return await postRequest('/api/images/upload', formData, 'uploadImage');
}

export default {
  getImage,
  getImagesPaginated,
  uploadImage,
};
