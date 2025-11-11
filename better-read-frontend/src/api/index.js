const API_GATEWAY = "https://8cekws5yt5.execute-api.ap-southeast-1.amazonaws.com/prod";

async function request(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  const resp = await fetch(`${API_GATEWAY}${endpoint}`, {
    ...options,
    headers,
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${error}`);
  }

  return resp.json();
}

export default request;
