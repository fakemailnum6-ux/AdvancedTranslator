import { useEffect } from 'react';
import { MainLayout } from './components/Layout';
import { useAppStore } from './store';
import './App.css';

function App() {
  const { setSegments } = useAppStore();

  useEffect(() => {
    // Load segments from the backend API
    const loadSegments = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/chapters/ch_1/segments?offset=0&limit=50');
        if (response.ok) {
          const data = await response.json();
          setSegments(data.items);
        } else {
          console.error('Failed to fetch segments');
        }
      } catch (error) {
        console.error('Error fetching segments:', error);

        // Fallback to dummy segments if backend is not running during simple test
        const dummySegments = Array.from({ length: 50 }).map((_, i) => ({
          id: `seg_${i}`,
          chapter_id: 'ch_1',
          segment_index: i,
          source_text: `This is dummy segment ${i} with an inline <1>tag</1>.`,
          target_text: `Это фиктивный сегмент ${i} с тегом.`,
          inline_tags: { "1": { prefix: "<b>", suffix: "</b>" } },
          status: i % 5 === 0 ? 'LOCKED' : (i % 2 === 0 ? 'NEW' : 'EDITED'),
          version: 1,
        }));
        setSegments(dummySegments as any);
      }
    };

    loadSegments();
  }, [setSegments]);

  return (
    <div className="App">
      <MainLayout />
    </div>
  );
}

export default App;
