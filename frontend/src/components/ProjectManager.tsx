import React, { useEffect, useState } from 'react';
import { useAppStore, Project } from '../store';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function ProjectManager() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filePath, setFilePath] = useState('');
  const [projectName, setProjectName] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ru');
  const [isLoading, setIsLoading] = useState(false);

  const { setActiveProject, activeProjectId } = useAppStore();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/projects/list');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    }
  };

  const handleImport = async () => {
    if (!filePath || !projectName) return;
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/projects/import-epub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: filePath,
          project_name: projectName,
          source_lang: sourceLang,
          target_lang: targetLang
        })
      });
      if (res.ok) {
        setFilePath('');
        setProjectName('');
        await fetchProjects();
      } else {
        const errorData = await res.json();
        alert(`Import failed: ${errorData.detail}`);
      }
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = async (id: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/projects/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id })
      });
      if (res.ok) {
        setActiveProject(id);
      } else {
        alert("Failed to open project");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 p-8 overflow-y-auto">
      <h1 className="text-3xl font-bold mb-8 text-white">Project Manager</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-8 max-w-2xl">
        <h2 className="text-xl font-semibold mb-4 text-white">Import EPUB</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Project Name</label>
            <Input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="E.g., Master and Margarita"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Absolute File Path</label>
            <Input
              value={filePath}
              onChange={e => setFilePath(e.target.value)}
              placeholder="/path/to/book.epub"
            />
            <p className="text-xs text-slate-500 mt-1">Provide the absolute path to the EPUB file on your system.</p>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-1">Source Lang</label>
              <Input value={sourceLang} onChange={e => setSourceLang(e.target.value)} placeholder="en" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-1">Target Lang</label>
              <Input value={targetLang} onChange={e => setTargetLang(e.target.value)} placeholder="ru" />
            </div>
          </div>
          <Button onClick={handleImport} disabled={isLoading} className="w-full mt-2">
            {isLoading ? 'Importing...' : 'Import Project'}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">Recent Projects</h2>
        {projects.length === 0 ? (
          <p className="text-slate-500 italic">No projects found. Import an EPUB to get started.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(proj => (
              <div
                key={proj.id}
                className={`p-4 rounded-lg border transition-colors ${activeProjectId === proj.id ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
              >
                <h3 className="font-medium text-lg text-white mb-1 truncate">{proj.name}</h3>
                <div className="text-sm text-slate-400 mb-4">
                  {proj.source_lang.toUpperCase()} ➔ {proj.target_lang.toUpperCase()}
                </div>
                <Button
                  onClick={() => handleOpen(proj.id)}
                  variant={activeProjectId === proj.id ? "default" : "secondary"}
                  className="w-full"
                >
                  {activeProjectId === proj.id ? 'Current' : 'Open'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}