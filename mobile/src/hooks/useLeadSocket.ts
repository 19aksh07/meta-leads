import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { Lead } from '../types/lead';

export type TestLeadFields = {
  full_name: string;
  email: string;
  phone_number: string;
};

type ApiResponse = {
  error?: string;
  lead?: Lead;
  leads?: Lead[];
  mode?: 'mock' | 'meta';
};

function mergeLead(leads: Lead[], lead: Lead): Lead[] {
  const existing = leads.find((item) => item.id === lead.id);
  const merged = {
    ...existing,
    ...lead,
    is_test_lead: lead.is_test_lead ?? existing?.is_test_lead,
  };
  return [merged, ...leads.filter((item) => item.id !== lead.id)];
}

export function useLeadSocket(
  socketUrlOverride?: string,
): {
  leads: Lead[];
  connected: boolean;
  mode: 'mock' | 'meta';
  loading: boolean;
  creating: boolean;
  deletingId: string | null;
  error: string | null;
  refreshLeads: () => Promise<void>;
  createTestLead: (fields: TestLeadFields) => Promise<void>;
  deleteTestLead: (leadId: string) => Promise<void>;
} {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<'mock' | 'meta'>('meta');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketUrl =
    socketUrlOverride ||
    process.env.EXPO_PUBLIC_SOCKET_URL ||
    'http://localhost:4000';
  const apiUrl = socketUrl.replace(/\/+$/, '');

  const refreshLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/test-leads`);
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) {
        throw new Error(payload.error || 'Could not load Meta test leads');
      }
      if (!Array.isArray(payload.leads)) {
        throw new Error('Backend returned an invalid test-leads list');
      }
      setMode(payload.mode === 'mock' ? 'mock' : 'meta');
      setLeads((current) =>
        payload.leads!.reduce(
          (merged, lead) => mergeLead(merged, lead),
          current.filter((lead) => !lead.is_test_lead),
        ),
      );
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load Meta test leads',
      );
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const createTestLead = useCallback(
    async (fields: TestLeadFields) => {
      setCreating(true);
      try {
        const response = await fetch(`${apiUrl}/api/test-leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        });
        const payload = (await response.json()) as ApiResponse;
        if (!response.ok || !payload.lead) {
          throw new Error(payload.error || 'Could not create Meta test lead');
        }
        setLeads((current) => mergeLead(current, payload.lead!));
        setError(null);
      } finally {
        setCreating(false);
      }
    },
    [apiUrl],
  );

  const deleteTestLead = useCallback(
    async (leadId: string) => {
      setDeletingId(leadId);
      try {
        const response = await fetch(
          `${apiUrl}/api/test-leads/${encodeURIComponent(leadId)}`,
          { method: 'DELETE' },
        );
        if (!response.ok) {
          const payload = (await response.json()) as ApiResponse;
          throw new Error(payload.error || 'Could not delete Meta test lead');
        }
        setLeads((current) => current.filter((lead) => lead.id !== leadId));
        setError(null);
      } finally {
        setDeletingId(null);
      }
    },
    [apiUrl],
  );

  useEffect(() => {
    void refreshLeads();

    const socket = io(socketUrl, { transports: ['websocket'] });
    const handleNewLead = (lead: Lead) => {
      setLeads((currentLeads) => mergeLead(currentLeads, lead));
    };
    const handleLeadsChanged = () => {
      void refreshLeads();
    };
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('new-lead', handleNewLead);
    socket.on('test-leads-changed', handleLeadsChanged);
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('new-lead', handleNewLead);
      socket.off('test-leads-changed', handleLeadsChanged);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.disconnect();
    };
  }, [refreshLeads, socketUrl]);

  return {
    leads,
    connected,
    mode,
    loading,
    creating,
    deletingId,
    error,
    refreshLeads,
    createTestLead,
    deleteTestLead,
  };
}
