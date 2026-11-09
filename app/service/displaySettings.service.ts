import { getRequest, putRequest } from "./axios.service";

export type DisplaySettings = {
  CouleurBordureParDefaut: string;
  CouleurFondParDefaut: string;
  CouleurTexteParDefaut: string;
  ImageParDefaut: {
    id: string | number;
    url: string;
  } | null;
};

export type DisplaySettingsUpdate = {
  CouleurBordureParDefaut?: string;
  CouleurFondParDefaut?: string;
  CouleurTexteParDefaut?: string;
  ImageParDefaut?: string;
};

async function getDisplaySettings() {
  return await getRequest('/api/planning/display-settings', 'getDisplaySettings');
}

async function updateDisplaySettings(data: DisplaySettingsUpdate) {
  return await putRequest('/api/planning/display-settings', data, 'updateDisplaySettings');
}

export default {
  getDisplaySettings,
  updateDisplaySettings,
};