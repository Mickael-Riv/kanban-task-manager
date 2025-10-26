import React, { useMemo, useState, useCallback } from 'react';
import type { TaskStatus, Task } from '../types';
import { useAppContext } from '../context/AppContext';
import { TaskForm } from './TaskForm';
import { TaskCard } from './TaskCard';

export const KanbanBoard: React.FC = () => {
  const { state, createTask, updateTask, deleteTask, moveTask, addColumn, updateColumnTitle, moveColumn, deleteColumn } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [addingStatus, setAddingStatus] = useState<TaskStatus>('todo');
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [labelFilter, setLabelFilter] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const statusConfigs = useMemo(() => {
    const cols = state.currentProject?.columns;
    if (cols && cols.length) return cols.slice().sort((a,b)=> (a.order ?? 0) - (b.order ?? 0));
    return [
      { id: 'todo', title: 'To do', order: 0 },
      { id: 'in-progress', title: 'In progress', order: 1 },
      { id: 'done', title: 'Done', order: 2 },
    ];
  }, [state.currentProject]);

  const columns = useMemo(() => {
    const byStatus: Record<string, Task[]> = {};
    for (const s of statusConfigs) byStatus[s.id] = [];
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
      if (!byStatus[t.status]) byStatus[t.status] = [];
      byStatus[t.status].push(t);
    }
    return byStatus;
  }, [state.currentProject, query, priorityFilter, labelFilter, statusConfigs]);

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
    const destIndex = (columns[destStatus] ?? []).length; // append at end for simplicity
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
        <div className="flex items-center gap-2 ml-auto text-sm text-gray-600 dark:text-gray-300">
          <span title="Realtime status" className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">{state.realtimeStatus}</span>
          <span title="Active sessions" className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">{state.sessionsCount ?? 1} online</span>
        </div>
      </div>
      {/* Mobile FAB for quick add */}
      <button
        className="sm:hidden fixed bottom-4 right-4 rounded-full bg-primary-600 text-white w-14 h-14 shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        title="Add task"
        aria-label="Add task"
        onClick={() => {
          if (!state.currentProject) return;
          const first = statusConfigs[0];
          setAddingStatus((first?.id as TaskStatus) ?? 'todo');
          setIsAdding(true);
          // scroll to first column on mobile
          try { document.querySelector('.kanban-column')?.scrollIntoView({ behavior: 'smooth', inline: 'start' }); } catch {}
        }}
      >+
      </button>
      <div className="border-b border-gray-200 dark:border-gray-700 p-3 flex items-center gap-2">
        <input className="input w-full sm:max-w-xs" placeholder="New column title" value={newColumnTitle} onChange={(e)=>setNewColumnTitle(e.target.value)} aria-label="New column title" />
        <button
          className="btn btn-secondary"
          title="Add column"
          aria-label="Add column"
          onClick={async ()=>{
            if (!state.currentProject || !newColumnTitle.trim()) return;
            await addColumn(state.currentProject.id, newColumnTitle.trim());
            setNewColumnTitle('');
          }}
        >Add column</button>
      </div>
      <div className="h-full p-4 pb-20">
        <div className="flex gap-4 min-w-full pr-4 overflow-x-auto snap-x snap-mandatory">
          {statusConfigs.map((cfg, idx) => (
            <div
              key={cfg.id}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropToColumn(e, cfg.id)}
            >
              <div className="flex items-center justify-between mb-3 gap-2 sticky top-0 z-10 pb-2 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur">
                <div className="flex items-center gap-2">
                  {editingColumnId === cfg.id ? (
                    <>
                      <input className="input input-sm w-40" value={editingTitle} onChange={(e)=>setEditingTitle(e.target.value)} aria-label="Column title" />
                      <button
                        className="btn btn-primary btn-sm"
                        title="Save column title"
                        aria-label="Save column title"
                        onClick={async ()=>{
                          if (!state.currentProject) return;
                          await updateColumnTitle(state.currentProject.id, cfg.id, editingTitle.trim() || cfg.title);
                          setEditingColumnId(null);
                          setEditingTitle('');
                        }}
                      >Save</button>
                      <button className="btn btn-secondary btn-sm" title="Cancel" aria-label="Cancel" onClick={()=>{ setEditingColumnId(null); setEditingTitle(''); }}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <h2 className="font-semibold">{cfg.title} <span className="text-xs text-gray-500">{`(${(columns[cfg.id] ?? []).length})`}</span></h2>
                      <button className="btn btn-secondary btn-sm" title="Edit column title" aria-label="Edit column title" onClick={()=>{ setEditingColumnId(cfg.id); setEditingTitle(cfg.title); }}>Edit</button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-primary text-xs px-3 py-1"
                    title="Add task to this column"
                    aria-label="Add task"
                    onClick={() => { setIsAdding(true); setAddingStatus(cfg.id as TaskStatus); }}
                  >Add task</button>
                <div className="relative">
                  <button
                    className="btn btn-secondary text-xs px-2 py-1"
                    title="Column actions"
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === cfg.id}
                    onClick={() => setOpenMenuId(openMenuId === cfg.id ? null : cfg.id)}
                  >Actions ▾</button>
                  {openMenuId === cfg.id && (
                    <div className="absolute right-0 mt-2 w-44 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow">
                      <button
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit column title"
                        onClick={() => { setEditingColumnId(cfg.id); setEditingTitle(cfg.title); setOpenMenuId(null); }}
                      >Edit title</button>
                      <button
                        className="block w-full text-left px-3 py-2 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Move column left"
                        disabled={idx === 0}
                        onClick={async ()=>{ if (!state.currentProject) return; await moveColumn(state.currentProject.id, cfg.id, Math.max(0, idx-1)); setOpenMenuId(null); }}
                      >Move left</button>
                      <button
                        className="block w-full text-left px-3 py-2 text-sm disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Move column right"
                        disabled={idx >= statusConfigs.length - 1}
                        onClick={async ()=>{ if (!state.currentProject) return; await moveColumn(state.currentProject.id, cfg.id, Math.min(statusConfigs.length - 1, idx+1)); setOpenMenuId(null); }}
                      >Move right</button>
                      <button
                        className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        title="Delete column"
                        disabled={statusConfigs.length <= 1}
                        onClick={async ()=>{
                          if (!state.currentProject) return;
                          const ok = window.confirm('Delete column and migrate its tasks to a neighbor?');
                          if (!ok) return;
                          await deleteColumn(state.currentProject.id, cfg.id);
                          setOpenMenuId(null);
                        }}
                      >Delete column</button>
                    </div>
                  )}
                </div>
                </div>
              </div>

              {isAdding && addingStatus === (cfg.id as TaskStatus) && (
                <div className="card mb-3">
                  <TaskForm
                    initial={{ status: cfg.id as TaskStatus }}
                    statuses={statusConfigs.map(s=>({ id: s.id as TaskStatus, title: s.title }))}
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

              {(columns[cfg.id] ?? []).map((task) => (
                <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task)}>
                  <TaskCard
                    task={task}
                    statuses={statusConfigs.map(s=>({ id: s.id as TaskStatus, title: s.title }))}
                    onUpdate={async (updates) => {
                      await updateTask(task.projectId, task.id, updates);
                    }}
                    onDelete={async () => { await deleteTask(task.projectId, task.id); }}
                    onChangeStatus={async (newStatus) => { await updateTask(task.projectId, task.id, { status: newStatus }); }}
                  />
                </div>
              ))}

              {((columns[cfg.id] ?? []).length === 0) && (
                <div className="text-sm text-gray-500">No tasks</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
