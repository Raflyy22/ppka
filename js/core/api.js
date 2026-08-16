const JSON_HEADERS = {"Content-Type":"application/json"};

export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {...JSON_HEADERS, ...(options.headers || {})}
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `API error ${response.status}`);
  return data;
}