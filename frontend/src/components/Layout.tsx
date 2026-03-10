import React from 'react';
import { Layout, Model, TabNode } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import { SegmentList } from './SegmentList';
import { ConcordancePanel } from './ConcordancePanel';

const json = {
    global: {
        tabEnableClose: false,
        tabEnableRename: false,
        tabSetHeaderHeight: 0, // Header is hidden entirely via CSS
        splitterSize: 6,
    },
    borders: [], // No bottom borders/tabs anymore
    layout: {
        type: "row",
        weight: 100,
        children: [
            {
                type: "tabset",
                weight: 50,
                selected: 0,
                children: [
                    {
                        type: "tab",
                        name: "Reference",
                        component: "reference_pane",
                        enableDrag: false,
                        enableClose: false
                    }
                ]
            },
            {
                type: "tabset",
                weight: 50,
                selected: 0,
                children: [
                    {
                        type: "tab",
                        name: "Editor",
                        component: "editor_pane",
                        enableDrag: false,
                        enableClose: false
                    }
                ]
            }
        ]
    }
};

import { useAppStore } from '../store';
import { Menu, Book, Settings, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';

export const MainLayout: React.FC = () => {
    const [model] = React.useState(() => Model.fromJson(json));
    const { chapters, currentChapter, setCurrentChapter, isSidebarOpen, toggleSidebar } = useAppStore();

    const factory = (node: TabNode) => {
        const component = node.getComponent();

        if (component === "editor_pane") {
            return (
                <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
                    <div className="h-10 shrink-0 border-b border-slate-800/60 bg-slate-900/50 flex items-center px-4 justify-between">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">RU</span>
                            <span className="text-sm font-medium text-slate-200">Target Translation</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-slate-400 hover:text-slate-100"><Maximize2 className="h-3 w-3 mr-1" />Focus</Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto relative p-4 lg:p-8">
                        {/* Editor Component Will Go Here */}
                        <SegmentList />
                    </div>
                </div>
            );
        }

        if (component === "reference_pane") {
            return (
                <div className="flex flex-col h-full bg-slate-900 overflow-hidden">
                    <div className="h-10 shrink-0 border-b border-slate-800/60 bg-slate-900/50 flex items-center px-4 justify-between">
                        <div className="flex items-center gap-2">
                            <span className="bg-slate-700 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">EN</span>
                            <span className="text-sm font-medium text-slate-200">Source Text</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto relative p-4 lg:p-8 opacity-80 pointer-events-none select-text">
                        {/* We reuse segment list for now, but will customize to be readonly Source */}
                        <div className="text-slate-400 italic">Source text sync will render here...</div>
                        <SegmentList isReference={true} />
                    </div>
                </div>
            );
        }

        return <div className="text-slate-500 flex items-center justify-center h-full">Empty Pane</div>;
    };

    return (
        <div className="flex h-full w-full bg-transparent overflow-hidden">

            {/* Collapsible Left Sidebar (Activity Bar style) */}
            <div className={`transition-all duration-300 ease-in-out border-r border-slate-800/60 bg-slate-950/40 flex flex-col shrink-0 ${isSidebarOpen ? 'w-64' : 'w-[60px]'}`}>
                <div className="h-12 border-b border-slate-800/60 flex items-center justify-between px-3">
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800">
                        <Menu className="h-4 w-4" />
                    </Button>
                    {isSidebarOpen && <span className="font-semibold text-xs text-slate-300 uppercase tracking-wider">Files</span>}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1 mt-2">
                    {chapters.map((chap) => (
                        <button
                            key={chap}
                            onClick={() => setCurrentChapter(chap)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                                currentChapter === chap
                                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                            }`}
                            title={chap}
                        >
                            <Book className="h-4 w-4 shrink-0" />
                            {isSidebarOpen && <span className="text-sm truncate">{chap}</span>}
                        </button>
                    ))}
                    {chapters.length === 0 && isSidebarOpen && (
                        <div className="p-3 text-sm text-slate-500 italic text-center">No documents</div>
                    )}
                </div>

                <div className="p-2 border-t border-slate-800/60">
                    <button className="w-full flex items-center justify-center gap-3 p-2 text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-800 transition-colors">
                        <Settings className="h-4 w-4 shrink-0" />
                        {isSidebarOpen && <span className="text-sm">Settings</span>}
                    </button>
                </div>
            </div>

            {/* Main FlexLayout Workspace (Panes Area) */}
            <div className="flex-1 relative bg-transparent p-2">
                <Layout model={model} factory={factory} />
            </div>
        </div>
    );
};
