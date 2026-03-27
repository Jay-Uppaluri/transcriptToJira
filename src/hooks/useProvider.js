import { useState, useEffect } from 'react';

const DEFAULT_PROVIDER = {
  name: 'ado',
  displayName: 'Azure DevOps',
  icon: '/icons/ado.png',
  itemLabel: 'Work Item',
  itemLabelPlural: 'Work Items',
};

/**
 * Fetches provider info from the server.
 * Returns the active ticket provider metadata.
 */
export default function useProvider() {
  const [provider, setProvider] = useState(DEFAULT_PROVIDER);

  useEffect(() => {
    fetch('/api/provider')
      .then(r => r.ok ? r.json() : DEFAULT_PROVIDER)
      .then(setProvider)
      .catch(() => {});
  }, []);

  return provider;
}
