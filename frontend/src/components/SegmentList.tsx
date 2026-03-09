import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useAppStore } from '../store';
import { SegmentEditor } from './Editor';

export const SegmentList: React.FC = () => {
  const { segments, updateSegment } = useAppStore();

  const handleUpdate = async (id: string, newTarget: string, version: number) => {
    try {
      // Optimistic update
      updateSegment(id, newTarget, 'EDITED', version + 1);

      // Call backend API
      const response = await fetch(`http://localhost:8000/api/segments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_text: newTarget,
          status: 'EDITED',
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

      // Ensure padding inside style so the absolute positioning works nicely
      return (
        <div style={{ ...style, display: 'flex', gap: '16px', borderBottom: '1px solid #eee', padding: '16px 24px', boxSizing: 'border-box' }}>
          <div style={{ width: '40px', color: '#999', fontSize: '12px' }}>
            {segment.segment_index}
          </div>
          <div style={{ flex: 1, padding: '0 8px', borderRight: '1px solid #ccc' }}>
            {segment.source_text}
          </div>
          <div style={{ flex: 1, padding: '0 8px' }}>
            <SegmentEditor
              initialValue={segment.target_text}
              isLocked={segment.status === 'LOCKED'}
              onChange={(value) => {
                // In a real app we'd debounce this
                console.log(`Edited target text: ${value}`);
              }}
              onBlur={() => {
                // Trigger save on blur for simplicity
                handleUpdate(segment.id, segment.target_text, segment.version);
              }}
            />
          </div>
          <div style={{ width: '100px', fontSize: '12px', color: '#666', textAlign: 'right' }}>
            <span style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: segment.status === 'NEW' ? '#e0f2fe' : '#dcfce7'
            }}>
              {segment.status}
            </span>
          </div>
        </div>
      );
    },
    [segments, handleUpdate]
  );

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 24px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>
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
