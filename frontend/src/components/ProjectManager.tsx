import { useEffect, useState } from 'react';
import { useAppStore, type Project } from '../store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

export function ProjectManager({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ru');
  const [isLoading, setIsLoading] = useState(false);

  const { setActiveProject, activeProjectId, loadDemoProject } = useAppStore();

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
    if (!file || !projectName) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_name', projectName);
      formData.append('source_lang', sourceLang);
      formData.append('target_lang', targetLang);

      const res = await fetch('http://localhost:8000/api/projects/import-epub', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setFile(null);
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
        onOpenChange(false); // Close dialog
      } else {
        alert("Failed to open project");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-950 text-slate-200 border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-2xl">Project Manager</DialogTitle>
          <DialogDescription>
            Import a new EPUB or open an existing project to start translating.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 my-4">
          <Button onClick={() => { loadDemoProject(); onOpenChange(false); }} variant="secondary">
            Try Demo Project (UI Showcase)
          </Button>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium mb-4 text-white">Import New EPUB</h2>
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
            <label className="block text-sm font-medium text-slate-400 mb-1">Select EPUB File</label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept=".epub"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    const selectedFile = e.target.files[0];
                    setFile(selectedFile);

                    if (!projectName) {
                      setProjectName(selectedFile.name.replace('.epub', ''));
                    }
                  }
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Selected file: <span className="text-slate-300 font-mono">{file?.name || 'None'}</span>
            </p>
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
          <h2 className="text-lg font-medium mb-4 text-white">Recent Projects</h2>
          {projects.length === 0 ? (
            <p className="text-slate-500 italic">No projects found. Import an EPUB to get started.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
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
      </DialogContent>
    </Dialog>
  );
}