import React, { useMemo, useState, useCallback } from 'react';
import type { TaskStatus, Task } from '../types';
import { useAppContext } from '../context/AppContext';
import { TaskForm } from './TaskForm';
import { TaskCard } from './TaskCard';

const STATUS_TITLES: Record<TaskStatus, string> = {
  'todo': 'To do',
  'in-progress': 'In progress',
  'done': 'Done',
};

export const KanbanBoard: React.FC = () => {
  const { state, createTask, updateTask, deleteTask, moveTask } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [addingStatus, setAddingStatus] = useState<TaskStatus>('todo');
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [labelFilter, setLabelFilter] = useState('');

  const columns = useMemo(() => {
    const byStatus: Record<TaskStatus, Task[]> = {
      'todo': [],
      'in-progress': [],
      'done': [],
    };
    const tasks = state.currentProject?.tasks ?? [];
    const q = query.trim().toLowerCase();
    const label = labelFilter.trim().toLowerCase();
    for (const t of tasks) {
      // filters
      if (q) {
        const hay = `${t.title} ${t.description}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) continue;
      if (label) {
        const labels = (t.labels ?? []).map((l) => l.toLowerCase());
        if (!labels.some((l) => l.includes(label))) continue;
      }
      byStatus[t.status].push(t);
    }
    return byStatus;
  }, [state.currentProject, query, priorityFilter, labelFilter]);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.setData('text/task-id', task.id);
    e.dataTransfer.setData('text/project-id', task.projectId);
    e.dataTransfer.setData('text/source-status', task.status);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropToColumn = useCallback(async (e: React.DragEvent<HTMLDivElement>, destStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/task-id');
    const projectId = e.dataTransfer.getData('text/project-id');
    if (!taskId || !projectId || !state.currentProject || state.currentProject.id !== projectId) return;
    const destIndex = columns[destStatus].length; // append at end for simplicity
    await moveTask(projectId, taskId, destStatus, destIndex);
  }, [columns, moveTask, state.currentProject]);

  if (!state.currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select or create a project to start.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden">
      <div className="border-b border-gray-200 dark:border-gray-700 p-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <input
          className="input w-full sm:max-w-sm"
          placeholder="Search tasks..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2 w-full sm:w-auto">
          <select className="input w-full sm:w-auto" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}>
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <input
            className="input w-full sm:max-w-xs"
            placeholder="Filter by label..."
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
          />
        </div>
      </div>
      <div className="h-full overflow-auto p-4 pb-6">
        <div className="flex gap-4 min-w-full pr-4">
          {(Object.keys(STATUS_TITLES) as TaskStatus[]).map((status) => (
            <div
              key={status}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropToColumn(e, status)}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">{STATUS_TITLES[status]} <span className="text-xs text-gray-500">({columns[status].length})</span></h2>
                <button className="btn btn-secondary text-xs px-2 py-1" onClick={() => { setIsAdding(true); setAddingStatus(status); }}>
                  Add
                </button>
              </div>

              {isAdding && addingStatus === status && (
                <div className="card mb-3">
                  <TaskForm
                    initial={{ status }}
                    onCancel={() => setIsAdding(false)}
                    onSubmit={async (values) => {
                      await createTask(
                        state.currentProject!.id,
                        values.title,
                        values.description,
                        values.status,
                        values.externalLink,
                        { priority: values.priority, dueDate: values.dueDate, labels: values.labels }
                      );
                      setIsAdding(false);
                    }}
                  />
                </div>
              )}

              {columns[status].map((task) => (
                <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)}>
                  <TaskCard
                    task={task}
                    onUpdate={async (updates) => {
                      await updateTask(task.projectId, task.id, updates);
                    }}
                    onDelete={async () => { await deleteTask(task.projectId, task.id); }}
                    onChangeStatus={async (newStatus) => { await updateTask(task.projectId, task.id, { status: newStatus }); }}
                  />
                </div>
              ))}

              {columns[status].length === 0 && (
                <div className="text-sm text-gray-500">No tasks</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
