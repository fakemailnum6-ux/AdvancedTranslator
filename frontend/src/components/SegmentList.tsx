import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useAppStore } from '../store';
import { SegmentEditor } from './Editor';
import { Bot, Pencil, Check, Lock } from 'lucide-react';

export const SegmentList: React.FC = () => {
  const { segments, updateSegment } = useAppStore();

  const handleUpdate = async (id: string, newTarget: string, version: number, status: string = 'EDITED') => {
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

      const renderStatusIcon = (status: string) => {
         switch(status) {
           case 'DRAFT':
           case 'AI_TRANSLATED':
              return <Bot size={16} className="text-orange-500" />;
           case 'EDITED':
              return <Pencil size={16} className="text-blue-500" />;
           case 'APPROVED':
              return <Check size={16} className="text-green-500" />;
           case 'LOCKED':
              return <Lock size={16} className="text-gray-500" />;
           default:
              return null;
         }
      };

      return (
        <div style={style} className={`flex items-start gap-4 border-b border-border py-4 px-6 box-border border-l-4 ${getStatusBorder(segment.status)} ${getStatusBg(segment.status)}`}>
          <div className="w-10 text-muted-foreground text-xs font-mono pt-2">
            {segment.segment_index}
          </div>
          <div className="flex-1 px-2 border-r border-border text-foreground pt-2 text-sm leading-relaxed">
            {segment.source_text}
          </div>
          <div className="w-8 flex flex-col items-center justify-start pt-2 gap-2">
            {renderStatusIcon(segment.status)}
          </div>
          <div className="flex-1 px-2 text-sm">
            <SegmentEditor
              initialValue={segment.target_text}
              isLocked={segment.status === 'LOCKED'}
              onChange={() => {
                // To be implemented in next step
              }}
              onBlur={(value) => {
                if (value !== segment.target_text) {
                  handleUpdate(segment.id, value, segment.version, 'EDITED');
                }
              }}
              onEnter={() => {
                // Move focus down logic ideally via ref
                console.log('Navigate next');
              }}
              onCtrlEnter={() => {
                 // Confirm and move down
                 handleUpdate(segment.id, segment.target_text, segment.version, 'APPROVED');
              }}
            />
          </div>
        </div>
      );
    },
    [segments, handleUpdate]
  );

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--panel-bg)' }}>
      <div style={{ padding: '8px 24px', background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--text-color)' }}>
        Translation Editor
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
        {segments.length > 0 ? (
          <List
            height={800} // Hardcoded for demo, normally use AutoSizer
            itemCount={segments.length}
            itemSize={120} // Approximate height per row
            width="100%"
          >
            {Row}
          </List>
        ) : (
          <div style={{ padding: '24px' }}>Loading segments or none available...</div>
        )}
      </div>
    </div>
  );
};
