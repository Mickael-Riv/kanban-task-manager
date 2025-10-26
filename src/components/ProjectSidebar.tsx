import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export const ProjectSidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { state, createProject, deleteProject, loadProject } = useAppContext();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const project = await createProject(name.trim(), description.trim() || undefined);
    if (project) {
      setIsCreating(false);
      setName('');
      setDescription('');
      await loadProject(project.id);
    }
  };

  return (
    <aside className="w-72 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <button
          className="md:hidden inline-flex items-center justify-center p-2 rounded-md border border-gray-300 dark:border-gray-700"
          aria-label="Close menu"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 0 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
        <button className="btn btn-primary w-full" onClick={() => setIsCreating(true)}>New Project</button>
      </div>
      {isCreating && (
        <form onSubmit={handleCreate} className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <input className="input" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary flex-1">Create</button>
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        </form>
      )}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {state.projects.map((p) => (
          <div key={p.id} className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${state.currentProject?.id === p.id ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
               onClick={() => loadProject(p.id)}>
            <div>
              <div className="font-medium text-sm">{p.name}</div>
              {p.description && <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{p.description}</div>}
            </div>
            <button
              className="text-xs text-red-600 hover:underline"
              onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}
              title="Delete project"
            >Delete</button>
          </div>
        ))}
        {state.projects.length === 0 && (
          <div className="text-sm text-gray-500 p-3">No projects yet. Create one to get started.</div>
        )}
      </div>
    </aside>
  );
};
