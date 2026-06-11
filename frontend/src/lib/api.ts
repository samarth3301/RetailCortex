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

export type AgentResponse = {
  answer: string;
  tool_used: string | null;
  tool_result: unknown;
};

export async function agentQuery(query: string, token: string): Promise<AgentResponse> {
  const res = await apiFetch('/api/v1/agent/query', token, {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json();
}
