import { getRequest, patchRequest } from "./axios.service";

async function getNotificationsByUserId() {
  return await getRequest(`/api/notifications`, 'getNotificationsByUserId');
}

async function markNotificationAsRead(notificationIds: string[]) {
  return await patchRequest(
    `/api/notifications/read`,
    {notificationIds},
    'markNotificationAsRead'
  );
}

export default {
  getNotificationsByUserId,
  markNotificationAsRead,
};
