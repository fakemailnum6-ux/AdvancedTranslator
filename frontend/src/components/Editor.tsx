import React, { useMemo } from 'react';
import { createEditor } from 'slate';
import type { Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';

// A minimal Slate editor for target text segments
interface SegmentEditorProps {
  initialValue: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  isLocked: boolean;
  onEnter?: () => void;
  onCtrlEnter?: () => void;
}

export const SegmentEditor: React.FC<SegmentEditorProps> = ({ initialValue, onChange, onBlur, isLocked, onEnter, onCtrlEnter }) => {
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

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      if (event.ctrlKey) {
        event.preventDefault();
        onCtrlEnter?.();
      } else if (!event.shiftKey) {
        event.preventDefault();
        onEnter?.();
      }
    }
  };

  return (
    <div className={`p-2 border rounded-md ${isLocked ? 'bg-background border-transparent' : 'bg-card border-border'} font-sans`}>
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
          onBlur={() => {
            const text = editor.children.map((n: any) => n.children.map((c: any) => c.text).join('')).join('\n');
            onBlur(text);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Translate here..."
          className={`min-h-[40px] outline-none ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}
        />
      </Slate>
    </div>
  );
};
