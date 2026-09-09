import React, { createContext, useContext, useState, useEffect } from 'react';
import { WorkspaceSummaryDto, ProjectDto, CreateWorkspaceDto, CreateProjectDto } from '@reported/contracts';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';

interface WorkspaceContextType {
  workspaces: WorkspaceSummaryDto[];
  activeWorkspace: WorkspaceSummaryDto | null;
  setActiveWorkspace: (ws: WorkspaceSummaryDto) => void;
  projects: ProjectDto[];
  activeProject: ProjectDto | null;
  setActiveProject: (p: ProjectDto | null) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (dto: CreateWorkspaceDto) => Promise<WorkspaceSummaryDto>;
  createProject: (dto: CreateProjectDto) => Promise<ProjectDto>;
  updateProject: (projectId: string, dto: { name?: string; key?: string; slug?: string; description?: string }) => Promise<ProjectDto>;
  deleteProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummaryDto[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceSummaryDto | null>(null);
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [activeProject, setActiveProject] = useState<ProjectDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWorkspaces = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const list = await apiFetch<WorkspaceSummaryDto[]>('/workspaces');
      setWorkspaces(list);

      const savedId = localStorage.getItem('reported_active_workspace_id');
      const found = list.find(w => w.id === savedId) || list[0] || null;
      if (found) {
        setActiveWorkspaceState(found);
        localStorage.setItem('reported_active_workspace_id', found.id);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async (workspaceId: string) => {
    try {
      const list = await apiFetch<ProjectDto[]>(`/workspaces/${workspaceId}/projects`);
      setProjects(list);
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setProjects([]);
      setActiveProject(null);
    }
  }, [user]);

  useEffect(() => {
    if (activeWorkspace) {
      fetchProjects(activeWorkspace.id);
    } else {
      setProjects([]);
      setActiveProject(null);
    }
  }, [activeWorkspace]);

  const setActiveWorkspace = (ws: WorkspaceSummaryDto) => {
    setActiveWorkspaceState(ws);
    setActiveProject(null);
    localStorage.setItem('reported_active_workspace_id', ws.id);
  };

  const createWorkspace = async (dto: CreateWorkspaceDto): Promise<WorkspaceSummaryDto> => {
    const created = await apiFetch<WorkspaceSummaryDto>('/workspaces', {
      method: 'POST',
      body: JSON.stringify(dto)
    });
    await fetchWorkspaces();
    setActiveWorkspace(created);
    return created;
  };

  const createProject = async (dto: CreateProjectDto): Promise<ProjectDto> => {
    if (!activeWorkspace) throw new Error('No active workspace');
    const created = await apiFetch<ProjectDto>(`/workspaces/${activeWorkspace.id}/projects`, {
      method: 'POST',
      body: JSON.stringify(dto)
    });
    await fetchProjects(activeWorkspace.id);
    return created;
  };

  const updateProject = async (projectId: string, dto: { name?: string; key?: string; slug?: string; description?: string }): Promise<ProjectDto> => {
    if (!activeWorkspace) throw new Error('No active workspace');
    const updated = await apiFetch<ProjectDto>(`/workspaces/${activeWorkspace.id}/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto)
    });
    await fetchProjects(activeWorkspace.id);
    return updated;
  };

  const deleteProject = async (projectId: string): Promise<void> => {
    if (!activeWorkspace) throw new Error('No active workspace');
    await apiFetch(`/workspaces/${activeWorkspace.id}/projects/${projectId}`, {
      method: 'DELETE'
    });
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
    await fetchProjects(activeWorkspace.id);
  };

  const refreshProjects = async () => {
    if (activeWorkspace) {
      await fetchProjects(activeWorkspace.id);
    }
  };

  const contextValue = React.useMemo(() => ({
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    projects,
    activeProject,
    setActiveProject,
    isLoading,
    refreshWorkspaces: fetchWorkspaces,
    createWorkspace,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects
  }), [workspaces, activeWorkspace, projects, activeProject, isLoading]);

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}

