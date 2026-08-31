import { getRequest, postRequest } from "./axios.service";

type LoginPayload = {
  login: string;
  password: string;
};

type ClientEnvironmentPayload = {
  urlAPI?: string | null;
  urlMercure?: string | null;
  urlAPIInterne?: string | null;
  urlMercureInterne?: string | null;
  logoClient?: string | null;
};

type ResolvedClientEnvironment = {
  apiUrl: string;
  mercureUrl: string;
  logoClient?: string;
};

async function login(payload: LoginPayload) {
  return await postRequest("/api/login", payload, "login");
}

async function me() {
  return await getRequest("/api/me", "me");
}

async function logout() {
  return await postRequest("/api/logout", {}, "logout");
}

async function refreshToken() {
  return await postRequest("/api/token/refresh", {}, "refreshToken");
}

async function isApiReachable(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;

  try {
    const cleanUrl = url.trim();
    const response = await fetch(cleanUrl, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
    });

    return response instanceof Response;
  } catch (error) {
    console.warn('URL API non accessible:', url, error);
    return false;
  }
}

async function resolveApiEnvironment(
  payload: ClientEnvironmentPayload | null | undefined,
): Promise<ResolvedClientEnvironment | null> {
  if (!payload) return null;

  const candidates: Array<{ apiUrl?: string | null; mercureUrl?: string | null }> = [
    { apiUrl: 'http://localhost:8000/', mercureUrl: 'http://localhost:3000/' },
    { apiUrl: payload.urlAPI, mercureUrl: payload.urlMercure },
    { apiUrl: payload.urlAPIInterne, mercureUrl: payload.urlMercureInterne },
  ];

  for (const candidate of candidates) {
    const apiUrl = candidate.apiUrl?.trim();

    if (!apiUrl || !(await isApiReachable(apiUrl))) {
      continue;
    }

    const mercureUrl = candidate.mercureUrl?.trim();

    return {
      apiUrl,
      mercureUrl: mercureUrl || '',
      logoClient: payload.logoClient?.trim() || undefined,
    };
  }

  return null;
}

async function SchedulerIsURICannonical(hostname: string): Promise<boolean> {
  try {
    const response = await fetch("https://extranet.palissot.fr/extranet/inc_librairie/API/routes.php?endpoint=SchedulerIsURICannonical", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ uri: hostname })
    });

    const data = await response.json();
    console.log('SchedulerIsURICannonical response:', data);

    return data === 1;
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'URL canonique:', error);
    return false;
  }
}

async function SchedulerGetAPI(hostname: string): Promise<ClientEnvironmentPayload | null> {
  try {
    const response = await fetch("https://extranet.palissot.fr/extranet/inc_librairie/API/routes.php?endpoint=SchedulerGetAPI", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ codeEntreprise: hostname })
    });

    const data = await response.json();
    const payload = data?.data ?? data;

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return {
      urlAPI: payload.urlAPI ?? null,
      urlMercure: payload.urlMercure ?? null,
      urlAPIInterne: payload.urlAPIInterne ?? null,
      urlMercureInterne: payload.urlMercureInterne ?? null,
      logoClient: payload.logoClient ?? null,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'API:', error);
    return null;
  }
}

export default {
  login,
  me,
  logout,
  refreshToken,
  resolveApiEnvironment,
  SchedulerIsURICannonical,
  SchedulerGetAPI,
};
