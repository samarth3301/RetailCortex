const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function apiFetch(
  path: string,
  token?: string | null,
  init?: RequestInit,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (typeof window !== 'undefined') {
    const simulatedRole = localStorage.getItem('rc_simulated_role');
    if (simulatedRole) {
      headers['x-simulated-role'] = simulatedRole;
    }
  }

  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...init?.headers,
    },
  });
}
