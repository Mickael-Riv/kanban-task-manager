import { v4 as uuidv4 } from 'uuid';
import type { Project, Task, ProjectWithTasks, TaskStatus, Priority } from '../types';

const PROJECTS_KEY = 'kanban_projects';

const getProjectsFromStorage = (): ProjectWithTasks[] => {
  const projectsJson = localStorage.getItem(PROJECTS_KEY);
  return projectsJson ? JSON.parse(projectsJson) : [];
};

const saveProjectsToStorage = (projects: ProjectWithTasks[]): void => {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const ProjectService = {
  // Project methods
  getAllProjects: (): Project[] => {
    const projects = getProjectsFromStorage();
    return projects.map(({ tasks, ...project }) => project);
  },

  moveTask: (
    projectId: string,
    taskId: string,
    destinationStatus: TaskStatus,
    destinationIndex: number
  ): ProjectWithTasks | undefined => {
    const projects = getProjectsFromStorage();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return undefined;

    const project = projects[projectIndex];
    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return undefined;

    const [task] = project.tasks.splice(taskIndex, 1);
    task.status = destinationStatus;
    task.updatedAt = new Date().toISOString();

    // Compute the list of indices corresponding to destination status in the current order
    const destinationPositions = project.tasks
      .map((t, idx) => ({ t, idx }))
      .filter(({ t }) => t.status === destinationStatus)
      .map(({ idx }) => idx);

    // Calculate actual insertion index in the flat tasks array to preserve global order
    let insertAt = project.tasks.length; // default to end
    if (destinationPositions.length === 0) {
      // insert after the last item in the array, or at start if empty
      insertAt = project.tasks.length;
    } else if (destinationIndex <= 0) {
      insertAt = destinationPositions[0];
    } else if (destinationIndex >= destinationPositions.length) {
      insertAt = destinationPositions[destinationPositions.length - 1] + 1;
    } else {
      insertAt = destinationPositions[destinationIndex];
    }

    project.tasks.splice(insertAt, 0, task);
    project.updatedAt = new Date().toISOString();
    projects[projectIndex] = project;
    saveProjectsToStorage(projects);
    return project;
  },

  getProjectById: (id: string): ProjectWithTasks | undefined => {
    const projects = getProjectsFromStorage();
    return projects.find(project => project.id === id);
  },
  exportProject: (id: string): string | undefined => {
    const project = ProjectService.getProjectById(id);
    return project ? JSON.stringify(project) : undefined;
  },

  createProject: (name: string, description?: string): Project => {
    const projects = getProjectsFromStorage();
    const now = new Date().toISOString();
    
    const newProject: ProjectWithTasks = {
      id: uuidv4(),
      name,
      description,
      tasks: [],
      createdAt: now,
      updatedAt: now,
    };

    projects.push(newProject);
    saveProjectsToStorage(projects);
    
    // Return without tasks for consistency
    const { tasks, ...project } = newProject;
    return project;
  },

  updateProject: (id: string, updates: Partial<Project>): Project | undefined => {
    const projects = getProjectsFromStorage();
    const projectIndex = projects.findIndex(p => p.id === id);
    
    if (projectIndex === -1) return undefined;

    const updatedProject: ProjectWithTasks = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    projects[projectIndex] = updatedProject;
    saveProjectsToStorage(projects);
    
    // Return without tasks for consistency
    const { tasks, ...project } = updatedProject;
    return project;
  },

  deleteProject: (id: string): boolean => {
    const projects = getProjectsFromStorage();
    const initialLength = projects.length;
    const filteredProjects = projects.filter(project => project.id !== id);
    
    if (filteredProjects.length < initialLength) {
      saveProjectsToStorage(filteredProjects);
      return true;
    }
    
    return false;
  },

  // Task methods
  getTasksByProject: (projectId: string): Task[] => {
    const project = ProjectService.getProjectById(projectId);
    return project ? project.tasks : [];
  },

  getTaskById: (projectId: string, taskId: string): Task | undefined => {
    const project = ProjectService.getProjectById(projectId);
    return project?.tasks.find(task => task.id === taskId);
  },

  createTask: (
    projectId: string,
    title: string,
    description: string,
    status: TaskStatus = 'todo',
    externalLink?: string,
    options?: { priority?: Priority; dueDate?: string; labels?: string[] }
  ): Task | undefined => {
    const projects = getProjectsFromStorage();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) return undefined;

    const now = new Date().toISOString();
    const newTask: Task = {
      id: uuidv4(),
      title,
      description,
      status,
      projectId,
      externalLink,
      priority: options?.priority,
      dueDate: options?.dueDate,
      labels: options?.labels,
      createdAt: now,
      updatedAt: now,
    };

    projects[projectIndex].tasks.push(newTask);
    projects[projectIndex].updatedAt = now;
    saveProjectsToStorage(projects);
    
    return newTask;
  },

  updateTask: (
    projectId: string,
    taskId: string,
    updates: Partial<Task>
  ): Task | undefined => {
    const projects = getProjectsFromStorage();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) return undefined;

    const taskIndex = projects[projectIndex].tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return undefined;

    const updatedTask: Task = {
      ...projects[projectIndex].tasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    projects[projectIndex].tasks[taskIndex] = updatedTask;
    projects[projectIndex].updatedAt = new Date().toISOString();
    saveProjectsToStorage(projects);
    
    return updatedTask;
  },

  deleteTask: (projectId: string, taskId: string): boolean => {
    const projects = getProjectsFromStorage();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    
    if (projectIndex === -1) return false;

    const initialLength = projects[projectIndex].tasks.length;
    projects[projectIndex].tasks = projects[projectIndex].tasks.filter(
      task => task.id !== taskId
    );
    
    if (projects[projectIndex].tasks.length < initialLength) {
      projects[projectIndex].updatedAt = new Date().toISOString();
      saveProjectsToStorage(projects);
      return true;
    }
    
    return false;
  },

  // Import/Export methods
  exportProjects: (): string => {
    return JSON.stringify(getProjectsFromStorage());
  },

  importProjects: (data: string): boolean => {
    try {
      const projects = JSON.parse(data);
      if (!Array.isArray(projects)) return false;
      
      // Basic validation of the imported data
      const isValid = projects.every(project => 
        project.id && 
        project.name && 
        Array.isArray(project.tasks) &&
        project.createdAt && 
        project.updatedAt
      );
      
      if (!isValid) return false;
      
      saveProjectsToStorage(projects);
      return true;
    } catch (error) {
      console.error('Error importing projects:', error);
      return false;
    }
  },
  importProject: (data: string): ProjectWithTasks | undefined => {
    try {
      const project = JSON.parse(data) as ProjectWithTasks;
      if (!project || !project.id || !project.name || !Array.isArray(project.tasks)) return undefined;
      return ProjectService.mergeProject(project);
    } catch (e) {
      console.error('Error importing single project:', e);
      return undefined;
    }
  },

  // Merge incoming project snapshot into storage, resolving per-task by updatedAt
  mergeProject: (incoming: ProjectWithTasks): ProjectWithTasks => {
    const projects = getProjectsFromStorage();
    const idx = projects.findIndex(p => p.id === incoming.id);
    if (idx === -1) {
      projects.push(incoming);
      saveProjectsToStorage(projects);
      return incoming;
    }
    const existing = projects[idx];
    const byId = new Map(existing.tasks.map(t => [t.id, t] as const));
    for (const t of incoming.tasks) {
      const cur = byId.get(t.id);
      if (!cur) {
        byId.set(t.id, t);
      } else {
        // choose newer by updatedAt
        const newer = (new Date(t.updatedAt).getTime() >= new Date(cur.updatedAt).getTime()) ? t : cur;
        byId.set(t.id, newer);
      }
    }
    const mergedTasks = Array.from(byId.values());
    const merged: ProjectWithTasks = {
      ...existing,
      ...incoming,
      tasks: mergedTasks,
      updatedAt: new Date(Math.max(new Date(existing.updatedAt).getTime(), new Date(incoming.updatedAt).getTime())).toISOString(),
    };
    projects[idx] = merged;
    saveProjectsToStorage(projects);
    return merged;
  },
};
