import React, { useState } from 'react';
import type { TaskStatus, Priority } from '../types';

type Props = {
  onSubmit: (values: { title: string; description: string; status: TaskStatus; externalLink?: string; priority?: Priority; dueDate?: string; labels?: string[] }) => void;
  onCancel: () => void;
  initial?: { title?: string; description?: string; status?: TaskStatus; externalLink?: string; priority?: Priority; dueDate?: string; labels?: string[] };
};

export const TaskForm: React.FC<Props> = ({ onSubmit, onCancel, initial }) => {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'todo');
  const [externalLink, setExternalLink] = useState(initial?.externalLink ?? '');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [labels, setLabels] = useState((initial?.labels ?? []).join(', '));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const parsedLabels = labels
      .split(',')
      .map((l) => l.trim())
      .filter(Boolean);
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
      externalLink: externalLink.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      labels: parsedLabels.length ? parsedLabels : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input className="input" placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex gap-2">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
          <option value="todo">To do</option>
          <option value="in-progress">In progress</option>
          <option value="done">Done</option>
        </select>
        <input className="input" placeholder="External link (optional)" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
          <option value="low">Low priority</option>
          <option value="medium">Medium priority</option>
          <option value="high">High priority</option>
        </select>
        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <input className="input" placeholder="Labels (comma-separated)" value={labels} onChange={(e) => setLabels(e.target.value)} />
      <div className="flex gap-2">
        <button type="submit" className="btn btn-primary flex-1">Save</button>
        <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
};
