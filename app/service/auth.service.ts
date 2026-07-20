import { getRequest, postRequest } from "./axios.service";

type LoginPayload = {
  login: string;
  password: string;
};


// function saveSession(token: string) {
//   if (typeof window === "undefined") return;
//   localStorage.setItem("token", token);
//   localStorage.setItem("isAuthenticated", "true");
// }

// function clearSession() {
//   if (typeof window === "undefined") return;
//   localStorage.removeItem("token");
//   localStorage.removeItem("isAuthenticated");
// }

// function getSessionUser(): string | null {
//   if (typeof window === "undefined") return null;
//   const raw = localStorage.getItem("token");
//   if (!raw) return null;

//   try {
//     return JSON.parse(raw) as string;
//   } catch {
//     return null;
//   }
// }

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


async function SchedulerIsURICannonical(hostname: string): Promise<boolean> {
  try {
    const response = await fetch("https://extranet.palissot.fr/extranet/inc_librairie/API/routes.php?endpoint=SchedulerIsURICannonical", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Pas de withCredentials ici !
      body: JSON.stringify({ uri: hostname })
    });

    const data = await response.json();
    console.log('SchedulerIsURICannonical response:', data);
    
    // Adapte selon ce que ton API renvoie vraiment (ex: data.data === 1)
    return data === 1; 
  } catch (error) {
    console.error('Erreur lors de la vérification de l\'URL canonique:', error);
    return false;
  }
}

async function SchedulerGetAPI(hostname: string): Promise<string | null> {
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
    // Adapte selon la structure exacte renvoyée, par exemple data.data.urlAPI
    return data?.urlAPI || null; 
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
  SchedulerIsURICannonical,
  SchedulerGetAPI,
  // saveSession,
  // clearSession,
  // getSessionUser,
};
