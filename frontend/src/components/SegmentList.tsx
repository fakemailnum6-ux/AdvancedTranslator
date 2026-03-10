import React, { useCallback, useEffect, useRef } from 'react';
import { VariableSizeList as List } from 'react-window';
import { useAppStore } from '../store';
import { SegmentEditor } from './Editor';
import { Pencil, Check, Lock, Sparkles } from 'lucide-react';

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
        // Eliminating vertical padding to make it look like a single continuous paragraph block.
        return (
          <div style={style} className="px-6 flex">
            <div
              ref={rowRef}
              className={`flex-1 px-3 py-1 my-0.5 rounded transition-colors text-[16px] leading-8 font-serif cursor-pointer ${
                isActive
                ? 'bg-blue-500/10 text-slate-100 shadow-[inset_3px_0_0_0_#3b82f6]'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
              onClick={() => setActiveSegmentId(segment.id)}
            >
              {segment.source_text}
            </div>
          </div>
        );
      }

      // EDITOR PANE (Target - Continuous Flow)
      return (
        <div style={style} className="px-2 lg:px-8 flex group">
          {/* Status gutter (absolute left, outside the text flow) */}
          <div className="w-12 shrink-0 flex flex-col items-center pt-2.5 opacity-40 group-hover:opacity-100 transition-opacity select-none">
            {renderStatusIcon(segment.status)}
            {isActive && <span className="text-[9px] mt-1 text-slate-500 font-mono">{segment.segment_index}</span>}
          </div>

          <div
            ref={rowRef}
            className={`flex-1 transition-all duration-200 cursor-text rounded-md px-3 py-1 my-0.5 ${
              isActive
              ? 'bg-slate-800/60 shadow-[inset_3px_0_0_0_#3b82f6]'
              : 'hover:bg-slate-800/30'
            }`}
            onClick={() => {
              if (!isActive) setActiveSegmentId(segment.id);
            }}
          >
            {isActive ? (
              <div className="py-1">
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
              <div className="text-[16px] leading-8 font-serif text-slate-300 whitespace-pre-wrap">
                {segment.status === 'NEW' && segment.target_text === '' ? (
                   <div className="animate-pulse flex space-x-2 mt-2 w-2/3">
                      <div className="h-4 bg-slate-800/50 rounded w-full"></div>
                   </div>
                ) : (
                   segment.target_text || <span className="text-slate-600 italic">Empty segment...</span>
                )}
              </div>
            )}
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
