import { useState, useEffect } from "react";

export function useQuota(initial = 100) {
  const [quota, setQuota] = useState(() => {
    const saved = localStorage.getItem('app_quota');
    return saved ? parseInt(saved) : initial;
  });

  useEffect(() => {
    localStorage.setItem('app_quota', quota.toString());
  }, [quota]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuota(prev => Math.min(100, prev + 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const consume = (amount: number) => setQuota(prev => Math.max(0, prev - amount));
  const canAfford = (amount: number) => quota >= amount;

  return { quota, setQuota, consume, canAfford };
}
