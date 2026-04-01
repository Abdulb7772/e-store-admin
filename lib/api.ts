const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://e-store-backend-oqye.onrender.com/api';

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.message || 'API request failed');
  }

  return json.data;
}

export async function apiPost<T, B = unknown>(path: string, body: B): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.message || 'API request failed');
  }

  return json.data;
}

export async function apiPut<T, B = unknown>(path: string, body: B): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.message || 'API request failed');
  }

  return json.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const json: ApiResponse<T> = await response.json();

  if (!json.success) {
    throw new Error(json.message || 'API request failed');
  }

  return json.data;
}

export { API_BASE };
