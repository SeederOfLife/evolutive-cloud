import { useEffect } from 'react';

export function useProviderKeySync(
  userProfile: any,
  setProviderKeys: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
) {
  useEffect(() => {
    if (!userProfile?.personal_api_key) return;
    try {
      const raw = JSON.parse(userProfile.personal_api_key);
      const cloudKeys: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(raw)) {
        cloudKeys[k] = Array.isArray(v) ? (v as string[]) : (typeof v === 'string' && v ? [v] : []);
      }
      setProviderKeys(prev => {
        const merged: Record<string, string[]> = { ...prev };
        for (const [k, arr] of Object.entries(cloudKeys)) {
          merged[k] = [...new Set([...(prev[k] || []), ...arr])].filter(Boolean);
        }
        localStorage.setItem("app_hub_keys", JSON.stringify(merged));
        return merged;
      });
    } catch {
      setProviderKeys(prev => {
        const merged = { ...prev, google: [userProfile.personal_api_key as string] };
        localStorage.setItem("app_hub_keys", JSON.stringify(merged));
        return merged;
      });
    }
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps
}
