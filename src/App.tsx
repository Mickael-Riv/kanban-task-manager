import React from 'react';
import { Header } from './components/Header';
import { ProjectSidebar } from './components/ProjectSidebar';
import { KanbanBoard } from './components/KanbanBoard';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <KanbanBoard />
      </div>
    </div>
  );
}

export default App
