import { getRequest, postRequest } from "./axios.service";
import { UserRole } from "@/app/calendrier/types";

type LoginPayload = {
  login: string;
  password: string;
};

type SessionUser = {
  id: number;
  nom: string;
  prenom: string;
  login: string;
  theme?: string;
  image?: any;
};

function saveSession(user: SessionUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("isAuthenticated", "true");
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("user");
  localStorage.removeItem("isAuthenticated");
}

function getSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

async function login(payload: LoginPayload) {
  return await postRequest("/api/login", payload, "login");
}

async function me() {
  return await getRequest("/api/auth/me", "me");
}

async function logout() {
  return await postRequest("/api/auth/logout", {}, "logout");
}

export default {
  login,
  me,
  logout,
  saveSession,
  clearSession,
  getSessionUser,
};
