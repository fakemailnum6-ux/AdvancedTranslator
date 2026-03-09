import React, { useMemo } from 'react';
import { createEditor } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';

// A minimal Slate editor for target text segments
interface SegmentEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  isLocked: boolean;
}

export const SegmentEditor: React.FC<SegmentEditorProps> = ({ initialValue, onChange, onBlur, isLocked }) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  // Transform initial string value into Slate's document structure
  const initialNodes: Descendant[] = useMemo(() => {
    return [
      {
        type: 'paragraph',
        children: [{ text: initialValue || '' }],
      } as any,
    ];
  }, [initialValue]);

  return (
    <div style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', background: isLocked ? '#f5f5f5' : '#fff' }}>
      <Slate
        editor={editor}
        initialValue={initialNodes}
        onChange={(value) => {
          const isAstChange = editor.operations.some(
            (op: any) => 'set_selection' !== op.type
          )
          if (isAstChange) {
            // Serialize to plain text for this demo.
            // A real app would handle serialization to/from nodes with inline tags.
            const text = value.map((n: any) => n.children.map((c: any) => c.text).join('')).join('\n');
            onChange(text);
          }
        }}
      >
        <Editable
          readOnly={isLocked}
          onBlur={onBlur}
          placeholder="Translate here..."
          style={{ minHeight: '40px', outline: 'none' }}
        />
      </Slate>
    </div>
  );
};
