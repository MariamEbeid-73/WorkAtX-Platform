import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FullScreenLoader } from '../components/FullScreenLoader';

export function OAuthReturnPage() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const provider = searchParams.get('provider');

    if (window.opener && provider) {
      window.opener.postMessage(
        { type: 'oauth-connected', provider },
        window.location.origin,
      );
      window.close();
    } else {
      window.location.href = '/dashboard';
    }
  }, [searchParams]);

  return <FullScreenLoader />;
}
