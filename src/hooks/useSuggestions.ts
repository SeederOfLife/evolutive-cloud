import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Suggestion } from "../types";

export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    const q = query(collection(db, "suggestions"), orderBy("votes", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items: Suggestion[] = [];
      snapshot.forEach(d => items.push({ id: d.id, ...d.data() } as Suggestion));
      setSuggestions(items.filter(s => !s.is_deleted && s.status !== 'system_config' && s.status !== 'deleted'));
    });
  }, []);

  const addSuggestion = useCallback(async (data: Partial<Suggestion>) => {
    return addDoc(collection(db, 'suggestions'), {
      ...data,
      created_at: new Date().toISOString()
    });
  }, []);

  const updateSuggestion = useCallback(async (id: string, data: Partial<Suggestion>) => {
    return updateDoc(doc(db, 'suggestions', id), data as any);
  }, []);

  const deleteSuggestion = useCallback(async (id: string) => {
    return updateDoc(doc(db, 'suggestions', id), { status: 'deleted', is_deleted: true });
  }, []);

  const voteSuggestion = useCallback(async (id: string, currentVotes: number) => {
    return updateDoc(doc(db, 'suggestions', id), { votes: currentVotes + 1 });
  }, []);

  return {
    suggestions,
    addSuggestion,
    updateSuggestion,
    deleteSuggestion,
    voteSuggestion,
  };
}
