import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';

export const ContinuousDocument: React.FC<{ isReference?: boolean }> = ({ isReference = false }) => {
  const { activeProjectId, currentChapter, chapterData, updateChapterTargetText } = useAppStore();

  // Local state for immediate typing feedback
  const [localText, setLocalText] = useState('');

  // Update local state when chapterData changes (e.g., when a new chapter is loaded)
  useEffect(() => {
    if (chapterData) {
      setLocalText(isReference ? chapterData.source_text : chapterData.target_text);
    } else {
      setLocalText('');
    }
  }, [chapterData, isReference]);

  // Handle typing and auto-save debounce
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setLocalText(newText);
    updateChapterTargetText(newText);
  };

  useEffect(() => {
    if (isReference || !activeProjectId || activeProjectId === 'demo-project' || !currentChapter || !chapterData) return;

    // Only set up debounce if we're not in demo project and this is the target editor
    const timeoutId = setTimeout(() => {
      fetch(`http://localhost:8000/api/chapters/${currentChapter}/text`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_text: localText,
          status: chapterData.status,
          version: chapterData.version
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          useAppStore.getState().setChapterData({
            ...chapterData,
            target_text: localText,
            version: data.new_version
          });
        }
      })
      .catch(err => console.error("Failed to save chapter", err));
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localText, activeProjectId, currentChapter, isReference]);

  if (isReference) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-[17px] leading-relaxed font-serif text-slate-300 whitespace-pre-wrap select-text">
        {localText || 'No source text available.'}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full h-full">
      <textarea
        className="w-full h-full bg-transparent resize-none outline-none border-none text-[17px] leading-relaxed font-serif text-slate-200 whitespace-pre-wrap placeholder:text-neutral-600"
        value={localText}
        onChange={handleChange}
        placeholder="Start typing your translation here..."
        spellCheck={false}
      />
    </div>
  );
};
