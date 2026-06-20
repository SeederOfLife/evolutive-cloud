import { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  collection, onSnapshot, query, orderBy, addDoc, updateDoc,
  doc, where, limit, getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Advice, ProjectConfig } from '../types';
import { getLinkedAccounts, type LinkedAccount } from '../services/invites';

export function useProjectData(user: User | null) {
  const [isFinalized, setIsFinalized] = useState(false);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<Advice[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [linkedUserMap, setLinkedUserMap] = useState<Map<string, string>>(new Map());

  // Firestore listeners
  useEffect(() => {
    let mounted = true;
    const initTimeout = setTimeout(() => setIsInitializing(false), 5000);

    const qSuggestions = query(collection(db, 'suggestions'), orderBy('votes', 'desc'));
    const unsubSuggestions = onSnapshot(
      qSuggestions,
      (snapshot) => {
        let foundConfig = false;
        snapshot.forEach((docSnap) => {
          const s = { id: docSnap.id, ...docSnap.data() } as any;
          if (s.status === 'system_config') {
            foundConfig = true;
            try {
              const config = JSON.parse(s.content || '{}') as ProjectConfig;
              setIsFinalized(!!config.is_finalized);
              setCreatorId(config.creator_id || '');
            } catch { /* ignore */ }
          }
        });
        if (!foundConfig && user?.uid && mounted) {
          const config: ProjectConfig = { creator_id: user.uid, is_finalized: false, project_name: 'Initial Phase' };
          addDoc(collection(db, 'suggestions'), {
            content: JSON.stringify(config),
            status: 'system_config',
            user_id: user.uid,
            created_at: new Date().toISOString(),
          });
        }
        setIsInitializing(false);
        clearTimeout(initTimeout);
      },
      () => { setIsInitializing(false); clearTimeout(initTimeout); }
    );

    const qAdvice = query(collection(db, 'advice'), orderBy('created_at', 'asc'));
    const unsubAdvice = onSnapshot(qAdvice, (snapshot) => {
      const newAdvice: Advice[] = [];
      snapshot.forEach((docSnap) => newAdvice.push({ id: docSnap.id, ...docSnap.data() } as Advice));
      setAdvice(newAdvice);
    });

    return () => {
      mounted = false;
      unsubSuggestions();
      unsubAdvice();
      clearTimeout(initTimeout);
    };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshLinkedAccounts = useCallback(async () => {
    if (!user) { setLinkedUserMap(new Map()); return; }
    try {
      const accounts: LinkedAccount[] = await getLinkedAccounts(user.uid);
      const m = new Map<string, string>();
      for (const a of accounts) {
        m.set(a.linkedUserId, a.linkedDisplayName || a.linkedEmail.split('@')[0]);
      }
      setLinkedUserMap(m);
    } catch { /* non-critical */ }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshLinkedAccounts(); }, [refreshLinkedAccounts]);

  const handleToggleFinalize = async () => {
    if (!user || user.uid !== creatorId) return;
    try {
      const q = query(collection(db, 'suggestions'), where('status', '==', 'system_config'), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docRef = doc(db, 'suggestions', snap.docs[0].id);
        const config = JSON.parse(snap.docs[0].data().content || '{}') as ProjectConfig;
        config.is_finalized = !isFinalized;
        await updateDoc(docRef, { content: JSON.stringify(config) });
      }
    } catch (e) {
      console.error('Finalize error:', e);
    }
  };

  return {
    isFinalized,
    creatorId,
    advice,
    isInitializing,
    linkedUserMap,
    refreshLinkedAccounts,
    handleToggleFinalize,
  };
}
