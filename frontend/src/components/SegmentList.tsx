import React, { useCallback, useEffect, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import { useAppStore } from '../store';
import { SegmentEditor } from './Editor';
import { Bot, Pencil, Check, Lock, Sparkles } from 'lucide-react';

const ROW_HEIGHT_ESTIMATE = 80;

export const SegmentList: React.FC<{ isReference?: boolean }> = ({ isReference = false }) => {
  const { segments, updateSegment, activeSegmentId, setActiveSegmentId } = useAppStore();
  const listRef = useRef<List>(null);
  const sizeMap = useRef<{ [key: number]: number }>({});

  const setRowHeight = useCallback((index: number, size: number) => {
    sizeMap.current = { ...sizeMap.current, [index]: size };
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  }, []);

  const getSize = (index: number) => sizeMap.current[index] || ROW_HEIGHT_ESTIMATE;

  // Sync scroll for reference pane when active segment changes
  useEffect(() => {
    if (activeSegmentId && isReference && listRef.current) {
      const index = segments.findIndex(s => s.id === activeSegmentId);
      if (index !== -1) {
        listRef.current.scrollToItem(index, "smart");
      }
    }
  }, [activeSegmentId, isReference, segments]);

  const handleUpdate = async (id: string, newTarget: string, version: number, status: string = 'EDITED') => {
    if (isReference) return;
    try {
      // Optimistic update
      updateSegment(id, newTarget, status as any, version + 1);

      // Call backend API
      const response = await fetch(`http://localhost:8000/api/segments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_text: newTarget,
          status: status,
          version: version,
          inline_tags: {}, // Dummy
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
           console.error(`Conflict saving segment ${id}`);
           // Revert logic here if conflict
        } else {
           console.error(`Failed to save segment ${id}`);
        }
      } else {
        console.log(`Saved segment ${id} with target ${newTarget}`);
      }

    } catch (e) {
      console.error('Error saving segment:', e);
      // Revert in real app
    }
  };

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const segment = segments[index];
      if (!segment) return null;

      const getStatusBorder = (status: string) => {
        switch(status) {
          case 'DRAFT':
          case 'AI_TRANSLATED':
             return 'border-orange-400';
          case 'EDITED':
             return 'border-blue-500';
          case 'APPROVED':
             return 'border-green-500';
          case 'LOCKED':
             return 'border-gray-500';
          case 'NEW':
          default:
             return 'border-transparent';
        }
      };

      const getStatusBg = (status: string) => {
        if (status === 'APPROVED') return 'bg-green-50 dark:bg-green-900/20';
        if (status === 'LOCKED') return 'bg-gray-100 dark:bg-gray-800/50';
        return 'bg-transparent';
      };

      const isActive = activeSegmentId === segment.id;
      const rowRef = useRef<HTMLDivElement>(null);

      // Report row height to react-window
      useEffect(() => {
        if (rowRef.current) {
          setRowHeight(index, rowRef.current.getBoundingClientRect().height + 16); // padding
        }
      }, [segment.source_text, segment.target_text, index, setRowHeight]);

      const renderStatusIcon = (status: string) => {
         switch(status) {
           case 'DRAFT':
           case 'AI_TRANSLATED':
              return <Sparkles size={14} className="text-purple-400" />;
           case 'EDITED':
              return <Pencil size={14} className="text-blue-400" />;
           case 'APPROVED':
              return <Check size={14} className="text-green-500" />;
           case 'LOCKED':
              return <Lock size={14} className="text-slate-600" />;
           default:
              return <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />;
         }
      };

      if (isReference) {
        // READONLY SOURCE PANE (Continuous Flow)
        return (
          <div style={style} className="px-2 py-1">
            <div
              ref={rowRef}
              className={`px-3 py-2 rounded-md transition-colors text-[15px] leading-relaxed cursor-pointer ${
                isActive
                ? 'bg-blue-500/10 text-slate-200 shadow-[inset_3px_0_0_0_#3b82f6]'
                : 'text-slate-400 hover:text-slate-300'
              }`}
              onClick={() => setActiveSegmentId(segment.id)}
            >
              {segment.source_text}
            </div>
          </div>
        );
      }

      // EDITOR PANE (Target)
      return (
        <div style={style} className="px-2 py-1">
          <div
            ref={rowRef}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 cursor-text ${
              isActive
              ? 'bg-slate-800/80 border-blue-500/30 shadow-sm ring-1 ring-blue-500/20'
              : 'bg-transparent border-transparent hover:bg-slate-800/40'
            }`}
            onClick={() => {
              if (!isActive) setActiveSegmentId(segment.id);
            }}
          >
            <div className="flex flex-col items-center gap-2 mt-1 w-6 shrink-0 opacity-70">
              <span className="text-[10px] text-slate-500 font-mono">{segment.segment_index}</span>
              {renderStatusIcon(segment.status)}
            </div>

            <div className="flex-1 min-w-0">
              {isActive ? (
                <div className="bg-slate-950/50 rounded-md border border-slate-700/50 shadow-inner p-1">
                  <SegmentEditor
                    initialValue={segment.target_text}
                    isLocked={segment.status === 'LOCKED'}
                    onChange={() => {}}
                    onBlur={(value) => {
                      if (value !== segment.target_text) {
                        handleUpdate(segment.id, value, segment.version, 'EDITED');
                      }
                    }}
                    onEnter={() => {
                       // Move focus logic
                    }}
                    onCtrlEnter={() => {
                       handleUpdate(segment.id, segment.target_text, segment.version, 'APPROVED');
                    }}
                  />
                </div>
              ) : (
                <div className="text-[15px] leading-relaxed text-slate-300 whitespace-pre-wrap py-1">
                  {segment.status === 'NEW' && segment.target_text === '' ? (
                     <div className="animate-pulse flex space-x-2 mt-1 w-2/3">
                        <div className="h-4 bg-slate-800 rounded w-full"></div>
                     </div>
                  ) : (
                     segment.target_text || <span className="text-slate-600 italic">Empty segment...</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    },
    [segments, handleUpdate, activeSegmentId, isReference, setActiveSegmentId, setRowHeight]
  );

  if (segments.length === 0) {
      return null;
  }

  return (
    <div className="absolute inset-0">
      <List
        ref={listRef}
        height={window.innerHeight - 150} // approximate fallback
        itemCount={segments.length}
        itemSize={getSize}
        width={'100%'}
        className="hide-scrollbar"
      >
        {Row}
      </List>
    </div>
  );
};
