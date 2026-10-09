// Sessão e RBAC no cliente (o servidor continua sendo a autoridade).
// Nenhum token em JS: o cookie httpOnly viaja sozinho.

import { sessions } from './api.js';

export const ROLES = ['requester', 'technician', 'admin'];

export async function currentUser() {
  try {
    return await sessions.me();
  } catch {
    return null;
  }
}

export async function requireSession(allowedRoles = ROLES, redirectTo = '/screens/login.html') {
  const user = await currentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    window.location.assign(user ? '/screens/dashboard.html' : redirectTo);
    return null;
  }
  return user;
}

export async function logout(redirectTo = '/screens/login.html') {
  try {
    await sessions.logout();
  } finally {
    window.location.assign(redirectTo);
  }
}

// Esconde elementos fora do papel: <tag data-requires="admin">.
export function applyRoleVisibility(user) {
  for (const element of document.querySelectorAll('[data-requires]')) {
    const allowed = element.getAttribute('data-requires').split(' ').filter(Boolean);
    element.hidden = !allowed.includes(user.role);
  }
}
