import React, { createContext, useContext, useReducer, type ReactNode, useEffect, useRef } from 'react';
import type { Project, Task, ProjectWithTasks, Priority } from '../types';
import { ProjectService } from '../services/ProjectService';
import { RealtimeService } from '../services/RealtimeService';

type AppState = {
  projects: Project[];
  currentProject: ProjectWithTasks | null;
  isLoading: boolean;
  error: string | null;
  realtimeStatus?: 'connected' | 'disconnected' | 'error';
};

type AppAction =
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_CURRENT_PROJECT'; payload: ProjectWithTasks | null }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'ADD_TASK'; payload: { projectId: string; task: Task } }
  | { type: 'UPDATE_TASK'; payload: { projectId: string; task: Task } }
  | { type: 'DELETE_TASK'; payload: { projectId: string; taskId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_REALTIME_STATUS'; payload: 'connected' | 'disconnected' | 'error' };

type AppContextType = {
  state: AppState;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project | undefined>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | undefined>;
  deleteProject: (id: string) => Promise<boolean>;
  createTask: (
    projectId: string,
    title: string,
    description: string,
    status?: 'todo' | 'in-progress' | 'done',
    externalLink?: string,
    options?: { priority?: Priority; dueDate?: string; labels?: string[] }
  ) => Promise<Task | undefined>;
  updateTask: (projectId: string, taskId: string, updates: Partial<Task>) => Promise<Task | undefined>;
  deleteTask: (projectId: string, taskId: string) => Promise<boolean>;
  moveTask: (projectId: string, taskId: string, destinationStatus: 'todo' | 'in-progress' | 'done', destinationIndex: number) => Promise<void>;
  importProjects: (data: string) => boolean;
  exportProjects: () => string;
  clearError: () => void;
  setWsUrl: (url: string) => void;
  getWsUrl: () => string | null;
};

const initialState: AppState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  realtimeStatus: 'disconnected',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(project =>
          project.id === action.payload.id ? action.payload : project
        ),
        currentProject:
          state.currentProject?.id === action.payload.id
            ? { ...state.currentProject, ...action.payload }
            : state.currentProject,
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
        currentProject:
          state.currentProject?.id === action.payload ? null : state.currentProject,
      };
    case 'ADD_TASK':
      if (!state.currentProject || state.currentProject.id !== action.payload.projectId) {
        return state;
      }
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          tasks: [...state.currentProject.tasks, action.payload.task],
        },
      };
    case 'UPDATE_TASK':
      if (!state.currentProject || state.currentProject.id !== action.payload.projectId) {
        return state;
      }
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          tasks: state.currentProject.tasks.map(task =>
            task.id === action.payload.task.id ? action.payload.task : task
          ),
        },
      };
    case 'DELETE_TASK':
      if (!state.currentProject || state.currentProject.id !== action.payload.projectId) {
        return state;
      }
      return {
        ...state,
        currentProject: {
          ...state.currentProject,
          tasks: state.currentProject.tasks.filter(task => task.id !== action.payload.taskId),
        },
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_REALTIME_STATUS':
      return { ...state, realtimeStatus: action.payload };
    default:
      return state;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const realtimeRef = useRef<RealtimeService | null>(null);

  const connectRealtimeIfPossible = (projectId: string, overrideWs?: string | null) => {
    try {
      const hash = window.location.hash || '';
      let wsFromHash: string | null = null;
      if (hash.startsWith('#')) {
        const params = new URLSearchParams(hash.slice(1));
        const wsParam = params.get('ws');
        if (wsParam) {
          try { wsFromHash = decodeURIComponent(escape(atob(wsParam))); } catch {}
        }
      }
      const envWs = (import.meta as any).env?.VITE_WS_URL as string | undefined;
      const wsUrl = overrideWs || wsFromHash || localStorage.getItem('kanban_ws_url') || envWs;
      if (!wsUrl) return;
      if (!realtimeRef.current) realtimeRef.current = new RealtimeService();
      realtimeRef.current.connect(wsUrl, projectId, {
        onProjectReceived: (json) => {
          const imported = ProjectService.importProject(json);
          if (imported && imported.id === projectId) {
            dispatch({ type: 'SET_CURRENT_PROJECT', payload: imported });
          }
        },
        onStatus: (s) => {
          dispatch({ type: 'SET_REALTIME_STATUS', payload: s });
        },
      });
    } catch {}
  };

  const broadcastCurrentProject = () => {
    try {
      const current = state.currentProject;
      if (!current) return;
      const json = ProjectService.exportProject(current.id);
      if (json && realtimeRef.current) {
        realtimeRef.current.sendUpdatedProject(json);
      }
    } catch {}
  };

  const setLoading = (isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  };

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projects = ProjectService.getAllProjects();
      dispatch({ type: 'SET_PROJECTS', payload: projects });
    } catch (error) {
      setError('Failed to load projects');
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProject = async (id: string) => {
    try {
      setLoading(true);
      const project = ProjectService.getProjectById(id);
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project || null });
      if (!project) {
        setError('Project not found');
      } else {
        connectRealtimeIfPossible(project.id);
      }
    } catch (error) {
      setError('Failed to load project');
      console.error('Error loading project:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (name: string, description?: string) => {
    try {
      setLoading(true);
      const project = ProjectService.createProject(name, description);
      if (project) {
        dispatch({ type: 'ADD_PROJECT', payload: project });
        connectRealtimeIfPossible(project.id);
        return project;
      }
    } catch (error) {
      setError('Failed to create project');
      console.error('Error creating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      setLoading(true);
      const project = await ProjectService.updateProject(id, updates);
      if (project) {
        dispatch({ type: 'UPDATE_PROJECT', payload: project });
        broadcastCurrentProject();
        return project;
      }
    } catch (error) {
      setError('Failed to update project');
      console.error('Error updating project:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setLoading(true);
      const success = await ProjectService.deleteProject(id);
      if (success) {
        dispatch({ type: 'DELETE_PROJECT', payload: id });
      }
      return success;
    } catch (error) {
      setError('Failed to delete project');
      console.error('Error deleting project:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (
    projectId: string,
    title: string,
    description: string,
    status: 'todo' | 'in-progress' | 'done' = 'todo',
    externalLink?: string,
    options?: { priority?: Priority; dueDate?: string; labels?: string[] }
  ) => {
    try {
      setLoading(true);
      const task = await ProjectService.createTask(
        projectId,
        title,
        description,
        status,
        externalLink,
        options
      );
      if (task) {
        dispatch({ type: 'ADD_TASK', payload: { projectId, task } });
        broadcastCurrentProject();
      }
      return task;
    } catch (error) {
      setError('Failed to create task');
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTask = async (projectId: string, taskId: string, updates: Partial<Task>) => {
    try {
      setLoading(true);
      const task = await ProjectService.updateTask(projectId, taskId, updates);
      if (task) {
        dispatch({ type: 'UPDATE_TASK', payload: { projectId, task } });
        broadcastCurrentProject();
      }
      return task;
    } catch (error) {
      setError('Failed to update task');
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    try {
      setLoading(true);
      const success = await ProjectService.deleteTask(projectId, taskId);
      if (success) {
        dispatch({ type: 'DELETE_TASK', payload: { projectId, taskId } });
        broadcastCurrentProject();
      }
      return success;
    } catch (error) {
      setError('Failed to delete task');
      console.error('Error deleting task:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

    const moveTask = async (
    projectId: string,
    taskId: string,
    destinationStatus: 'todo' | 'in-progress' | 'done',
    destinationIndex: number
  ) => {
    try {
      const updated = ProjectService.moveTask(
        projectId,
        taskId,
        destinationStatus,
        destinationIndex
      );
      if (updated) {
        dispatch({ type: 'SET_CURRENT_PROJECT', payload: updated });
        broadcastCurrentProject();
      }
    } catch (error) {
      console.error('Error moving task:', error);
    }
  };

  const importProjects = (data: string) => {
    try {
      const success = ProjectService.importProjects(data);
      if (success) {
        loadProjects();
      }
      return success;
    } catch (error) {
      setError('Failed to import projects');
      console.error('Error importing projects:', error);
      return false;
    }
  };

  const exportProjects = () => {
    return ProjectService.exportProjects();
  };

  const clearError = () => {
    setError(null);
  };

  const setWsUrl = (url: string) => {
    try {
      localStorage.setItem('kanban_ws_url', url);
      if (state.currentProject) connectRealtimeIfPossible(state.currentProject.id);
    } catch {}
  };

  const getWsUrl = () => {
    try { return localStorage.getItem('kanban_ws_url'); } catch { return null; }
  };

  // Load projects on initial render and handle shareable link import
  useEffect(() => {
    loadProjects();
    try {
      const hash = window.location.hash || '';
      if (hash.startsWith('#')) {
        const params = new URLSearchParams(hash.slice(1));
        const shareParam = params.get('share');
        const wsParam = params.get('ws');
        if (shareParam) {
          const json = decodeURIComponent(escape(atob(shareParam)));
          const imported = ProjectService.importProject(json);
          if (imported) {
            dispatch({ type: 'SET_CURRENT_PROJECT', payload: imported });
            // connect to provided ws if present
            let wsOverride: string | null = null;
            if (wsParam) {
              try { wsOverride = decodeURIComponent(escape(atob(wsParam))); } catch {}
            }
            connectRealtimeIfPossible(imported.id, wsOverride);
            // Clear the hash so we don't re-import on refresh
            history.replaceState(null, '', window.location.pathname);
          }
        }
      }
    } catch (err) {
      // ignore malformed share links
      console.error('Invalid share link:', err);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        state,
        loadProjects,
        loadProject,
        createProject,
        updateProject,
        deleteProject,
        createTask,
        updateTask,
        deleteTask,
        moveTask,
        importProjects,
        exportProjects,
        clearError,
        setWsUrl,
        getWsUrl,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
