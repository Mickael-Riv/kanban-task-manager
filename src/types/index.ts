export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  projectId: string;
  externalLink?: string;
  priority?: Priority;
  dueDate?: string; // ISO date string
  labels?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

export type DropResult = {
  draggableId: string;
  type: string;
  source: {
    index: number;
    droppableId: TaskStatus;
  };
  destination: {
    index: number;
    droppableId: TaskStatus;
  } | null;
};

export type Column = {
  id: TaskStatus;
  title: string;
  tasks: Task[];
};
