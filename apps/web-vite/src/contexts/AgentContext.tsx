import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface AgentContextType {
  activeAgent: Agent | null;
  agents: Agent[];
  setActiveAgent: (agent: Agent | null) => void;
  loading: boolean;
  refreshAgents: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

const STORAGE_KEY = 'orbion_active_agent';

export function AgentProvider({ children }: { children: ReactNode }) {
  const [activeAgent, setActiveAgentState] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load agents and restore active agent from localStorage
  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const agentsList = await api.getAgents();

      // Filter only active agents
      const activeAgents = agentsList.filter((a: Agent) =>
        a.status === 'active' || a.status === 'draft'
      );
      setAgents(activeAgents);

      // Restore active agent from localStorage
      const storedAgentId = localStorage.getItem(STORAGE_KEY);
      if (storedAgentId) {
        const found = activeAgents.find((a: Agent) => a.id === storedAgentId);
        if (found) {
          setActiveAgentState(found);
        } else if (activeAgents.length > 0) {
          // If stored agent not found, use first available
          setActiveAgentState(activeAgents[0]);
          localStorage.setItem(STORAGE_KEY, activeAgents[0].id);
        }
      } else if (activeAgents.length > 0) {
        // No stored agent, use first available
        setActiveAgentState(activeAgents[0]);
        localStorage.setItem(STORAGE_KEY, activeAgents[0].id);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const setActiveAgent = (agent: Agent | null) => {
    setActiveAgentState(agent);
    if (agent) {
      localStorage.setItem(STORAGE_KEY, agent.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const refreshAgents = async () => {
    await loadAgents();
  };

  return (
    <AgentContext.Provider value={{
      activeAgent,
      agents,
      setActiveAgent,
      loading,
      refreshAgents
    }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
}

export function useActiveAgentId() {
  const { activeAgent } = useAgent();
  return activeAgent?.id || null;
}
