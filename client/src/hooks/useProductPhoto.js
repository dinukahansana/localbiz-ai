import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

export default function useProductPhoto(product) {
  const id = product?.id;
  const version = product?.photoVersion;
  const [state, setState] = useState({ url: '', error: '' });
  useEffect(() => {
    if (!id || !version) return;
    let active = true;
    let url;
    api(`/products/${id}/photo`, {
      responseType: 'blob',
      imageType: 'image/jpeg',
    }).then(
      (blob) => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setState({ id, version, url, error: '' });
      },
      (error) => active && setState({ id, version, url: '', error: error.message }),
    );
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, version]);
  return version && state.id === id && state.version === version ? state : { url: '', error: '' };
}
