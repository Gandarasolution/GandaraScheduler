import { getRequest, postRequest } from "./axios.service";
import { UserRole } from "@/app/calendrier/types";

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


export default {
  login,
  me,
  logout,
  refreshToken,
  // saveSession,
  // clearSession,
  // getSessionUser,
};
