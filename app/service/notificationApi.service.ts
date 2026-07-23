import { getRequest } from "./axios.service";

async function getNotificationsByUserId(userId: number) {
  return await getRequest(`/api/notifications?userId=${userId}`, 'getNotificationsByUserId');
}

export default {
  getNotificationsByUserId,
};
