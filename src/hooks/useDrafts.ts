import { useState, useEffect, useCallback } from 'react';

export interface Draft {
  id: string;
  prompt: string;
  imageUrl: string;
  metadataUri: string;
  createdAt: number;
  status: 'draft' | 'minted';
  txHash?: string;
}

const key = (address: string) => `meta-art-drafts-${address.toLowerCase()}`;

export function useDrafts(address?: string) {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    if (!address) { setDrafts([]); return; }
    try {
      const stored = localStorage.getItem(key(address));
      setDrafts(stored ? JSON.parse(stored) : []);
    } catch {
      setDrafts([]);
    }
  }, [address]);

  const persist = useCallback((next: Draft[]) => {
    if (!address) return;
    localStorage.setItem(key(address), JSON.stringify(next));
    setDrafts(next);
  }, [address]);

  const addDraft = useCallback((prompt: string, imageUrl: string, metadataUri: string): string => {
    const id = crypto.randomUUID();
    const draft: Draft = { id, prompt, imageUrl, metadataUri, createdAt: Date.now(), status: 'draft' };
    setDrafts(prev => {
      const next = [draft, ...prev];
      if (address) localStorage.setItem(key(address), JSON.stringify(next));
      return next;
    });
    return id;
  }, [address]);

  const markMinted = useCallback((id: string, txHash: string) => {
    setDrafts(prev => {
      const next = prev.map(d => d.id === id ? { ...d, status: 'minted' as const, txHash } : d);
      if (address) localStorage.setItem(key(address), JSON.stringify(next));
      return next;
    });
  }, [address]);

  const deleteDraft = useCallback((id: string) => {
    setDrafts(prev => {
      const next = prev.filter(d => d.id !== id);
      if (address) localStorage.setItem(key(address), JSON.stringify(next));
      return next;
    });
  }, [address]);

  return { drafts, addDraft, markMinted, deleteDraft };
}
