import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { MainLayout } from './components/Layout';
import { ProjectManager } from './components/ProjectManager';
import { Button } from './components/ui/button';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const { activeProjectId, currentChapter, setSegments, setChapters, setCurrentChapter } = useAppStore();

  useEffect(() => {
    if (activeProjectId && activeProjectId !== 'demo-project') {
      setLoading(true);
      fetch(`http://localhost:8000/api/projects/${activeProjectId}/chapters`)
        .then(res => res.json())
        .then(data => {
          if (data.chapters && data.chapters.length > 0) {
            setChapters(data.chapters);
            setCurrentChapter(data.chapters[0]); // Auto-open first chapter
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to load chapters", err);
          setLoading(false);
        });
    }
  }, [activeProjectId, setChapters, setCurrentChapter]);

  useEffect(() => {
    if (activeProjectId && currentChapter && activeProjectId !== 'demo-project') {
      // Fetch initial chunk from backend
      fetch(`http://localhost:8000/api/chapters/${currentChapter}/segments?limit=50&offset=0`)
        .then(res => res.json())
        .then(data => {
          if (data.items) {
            setSegments(data.items);
          }
        })
        .catch(err => {
          console.error("Failed to load segments", err);
        });
    }
  }, [activeProjectId, currentChapter, setSegments]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-100">
        Loading project data...
      </div>
    );
  }

  const [projectManagerOpen, setProjectManagerOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-slate-100 dark bg-background">
      {/* Top Navbar (Global App Shell) */}
      <div className="h-12 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur flex items-center px-4 justify-between shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="font-bold text-slate-200">Workspace</div>
          {activeProjectId && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                {activeProjectId === 'demo-project' ? 'Demo Project' : `Project: ${activeProjectId.slice(0, 8)}...`}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Saved</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setProjectManagerOpen(true)}>
            {activeProjectId ? 'Switch Project' : 'Open Project'}
          </Button>
          {activeProjectId && (
            <Button variant="ghost" size="sm" onClick={() => useAppStore.getState().setActiveProject(null)}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <MainLayout />
      </div>

      <ProjectManager open={projectManagerOpen} onOpenChange={setProjectManagerOpen} />
    </div>
  );
}

export default App;
