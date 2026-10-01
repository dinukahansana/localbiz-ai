const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

export async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-LocalBiz-Request': '1',
        ...options.headers,
      },
      signal: controller.signal,
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      const error = new Error(data?.error || 'Something went wrong. Please try again.');
      error.fields = data?.fields || {};
      error.status = response.status;
      if (response.status === 401 && !path.startsWith('/auth/'))
        window.dispatchEvent(new Event('localbiz:unauthorized'));
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError' || error instanceof TypeError) {
      throw new Error('The server could not be reached. Check your connection and try again.', {
        cause: error,
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
