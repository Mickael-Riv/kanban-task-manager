import { useState } from 'react';
import { Header } from './components/Header';
import { ProjectSidebar } from './components/ProjectSidebar';
import { KanbanBoard } from './components/KanbanBoard';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden relative">
        <div className="hidden md:block h-full">
          <ProjectSidebar />
        </div>
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-full transform transition-transform duration-200 ease-out">
              <div className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-xl">
                <ProjectSidebar onClose={() => setSidebarOpen(false)} />
              </div>
            </div>
          </>
        )}
        <KanbanBoard />
      </div>
    </div>
  );
}

export default App
