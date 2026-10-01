import { useEffect, useRef, useState } from 'react';
import { AuthContext } from './AuthContext.js';
import { api } from '../lib/api.js';

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true, error: '' });
  const [retry, setRetry] = useState(0);
  const sessionVersion = useRef(0);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const version = sessionVersion.current;
      try {
        const data = await api('/auth/me');
        if (active && version === sessionVersion.current)
          setState({ user: data.user, loading: false, error: '' });
      } catch (error) {
        if (!active || version !== sessionVersion.current) return;
        if (error.status === 401) setState({ user: null, loading: false, error: '' });
        else setState((current) => ({ ...current, loading: false, error: error.message }));
      }
    }
    function expired() {
      sessionVersion.current += 1;
      setState({ user: null, loading: false, error: '' });
    }
    checkSession();
    window.addEventListener('focus', checkSession);
    window.addEventListener('localbiz:unauthorized', expired);
    return () => {
      active = false;
      window.removeEventListener('focus', checkSession);
      window.removeEventListener('localbiz:unauthorized', expired);
    };
  }, [retry]);

  async function authenticate(mode, form) {
    const data = await api(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(form) });
    sessionVersion.current += 1;
    setState({ user: data.user, loading: false, error: '' });
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    sessionVersion.current += 1;
    setState({ user: null, loading: false, error: '' });
  }
  function reload() {
    setState((current) => ({ ...current, loading: true, error: '' }));
    setRetry((value) => value + 1);
  }
  return (
    <AuthContext.Provider value={{ ...state, authenticate, logout, reload }}>
      {children}
    </AuthContext.Provider>
  );
}
