import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function useResource(path) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => {
    setState({ data: null, loading: true, error: '' });
    setVersion((value) => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    api(path).then(
      (data) => active && setState({ data, loading: false, error: '' }),
      (error) => active && setState({ data: null, loading: false, error: error.message }),
    );
    return () => {
      active = false;
    };
  }, [path, version]);
  function replace(data) {
    setState({ data, loading: false, error: '' });
  }
  return { ...state, reload, replace };
}
