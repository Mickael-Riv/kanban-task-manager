import React from 'react';
import { useAppContext } from '../context/AppContext';
import { ProjectService } from '../services/ProjectService';

export const Header: React.FC = () => {
  const { state, exportProjects, importProjects } = useAppContext();

  const handleExport = () => {
    const data = exportProjects();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-projects.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    if (!state.currentProject) return;
    const payload = ProjectService.exportProject(state.currentProject.id);
    if (!payload) return;
    const base64 = btoa(unescape(encodeURIComponent(payload)));
    const envWs = (import.meta as any).env?.VITE_WS_URL as string | undefined;
    const wsUrl = localStorage.getItem('kanban_ws_url') || envWs;
    const wsParam = wsUrl ? `&ws=${btoa(unescape(encodeURIComponent(wsUrl)))}` : '';
    const url = `${window.location.origin}${window.location.pathname}#share=${base64}${wsParam}`;
    navigator.clipboard?.writeText(url).then(() => {
      // eslint-disable-next-line no-alert
      alert('Share link copied to clipboard');
    }).catch(() => {
      // Fallback
      // eslint-disable-next-line no-alert
      alert('Share link ready: ' + url);
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    importProjects(text);
    e.target.value = '';
  };

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold">K</div>
        <h1 className="text-lg font-semibold">Kanban Task Manager</h1>
        {state.currentProject && (
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">/ {state.currentProject.name}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {state.currentProject && (
          <button className="btn btn-secondary" onClick={handleShare}>Share</button>
        )}
        <button className="btn btn-secondary" onClick={handleExport}>Export</button>
        <label className="btn btn-primary cursor-pointer">
          Import
          <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </label>
      </div>
    </header>
  );
};
