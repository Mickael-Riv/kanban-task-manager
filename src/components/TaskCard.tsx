import React, { useMemo, useState } from 'react';
import type { Task, TaskStatus } from '../types';
import { TaskForm } from './TaskForm';

type Props = {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onChangeStatus: (status: TaskStatus) => void;
  statuses?: Array<{ id: TaskStatus; title: string }>;
};

export const TaskCard: React.FC<Props> = ({ task, onUpdate, onDelete, onChangeStatus, statuses }) => {
  const [isEditing, setIsEditing] = useState(false);

  const dueBadge = useMemo(() => {
    if (!task.dueDate) return null;
    const today = new Date();
    const due = new Date(task.dueDate);
    // strip time
    today.setHours(0,0,0,0);
    due.setHours(0,0,0,0);
    let color = 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    if (due < today) color = 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
    else if ((due.getTime() - today.getTime()) <= 2*24*60*60*1000) color = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>Due {due.toLocaleDateString()}</span>
    );
  }, [task.dueDate]);

  const priorityBadge = useMemo(() => {
    const pr = task.priority || 'medium';
    const map: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      medium: 'bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[pr]}`}>{pr}</span>;
  }, [task.priority]);

  if (isEditing) {
    return (
      <div className="kanban-item">
        <TaskForm
          initial={{ title: task.title, description: task.description, status: task.status, externalLink: task.externalLink }}
          onCancel={() => setIsEditing(false)}
          onSubmit={(values) => { onUpdate(values); setIsEditing(false); }}
        />
      </div>
    );
  }

  return (
    <div className="kanban-item">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-medium">{task.title}</div>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            {priorityBadge}
            {dueBadge}
            {(task.labels ?? []).map((l) => (
              <span key={l} className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">{l}</span>
            ))}
          </div>
          {task.description && <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap mt-1">{task.description}</div>}
          {task.externalLink && (
            <a className="text-xs text-primary-600 hover:underline mt-2 inline-block" href={task.externalLink} target="_blank" rel="noreferrer">External link</a>
          )}
        </div>
        <select
          className="input w-auto text-xs px-2 py-1"
          value={task.status}
          onChange={(e) => onChangeStatus(e.target.value as TaskStatus)}
          title="Change status"
        >
          {(statuses && statuses.length > 0) ? (
            statuses.map(s => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))
          ) : (
            <>
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </>
          )}
        </select>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          className="btn btn-secondary flex-1"
          title="Edit task"
          aria-label="Edit task"
          onClick={() => setIsEditing(true)}
        >Edit task</button>
        <button
          className="btn btn-secondary btn-sm text-red-600 border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1"
          title="Delete task"
          aria-label="Delete task"
          onClick={onDelete}
        >Delete</button>
      </div>
    </div>
  );
};
