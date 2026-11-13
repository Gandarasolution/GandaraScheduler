import { getRequest, patchRequest } from "./axios.service";

async function getNotificationsByUserId() {
  return await getRequest(`/demo/notifications`, 'getNotificationsByUserId');
}

async function markNotificationAsRead(notificationIds: string[]) {
  return await patchRequest(
    `/demo/notifications/read`,
    {notificationIds},
    'markNotificationAsRead'
  );
}

export default {
  getNotificationsByUserId,
  markNotificationAsRead,
};
