import { getHealth } from '../api/client.js';
import { mountShell, requireAuth, setApiStatus } from '../components/app-shell.js';

export async function initHome() {
  const session = requireAuth();
  if (!session) return;
  mountShell({ active: 'home', session });

  const who = document.querySelector('[data-session-detail]');
  if (who) {
    who.textContent = `${session.user.name} — ${session.user.email} · papel ${session.user.role}`;
  }

  setApiStatus('checking');
  try {
    await getHealth();
    setApiStatus('online');
  } catch {
    setApiStatus('offline');
  }
}
