import React from 'react';
import { Layout, Model, TabNode } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import { SegmentList } from './SegmentList';

const json = {
    global: {
        tabEnableClose: true,
        tabEnableRename: false,
        tabSetEnableTabStrip: true, // Allow tab strip so users can drag and add/remove tabs
        tabSetHeaderHeight: 35,
        splitterSize: 6,
    },
    borders: [],
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
                        enableDrag: true,
                        enableClose: true
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
                        enableDrag: true,
                        enableClose: true
                    }
                ]
            }
        ]
    }
};

import { useAppStore } from '../store';
import { Book, Settings, Maximize2, Zap, Sparkles, MoreVertical, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Actions, DockLocation } from 'flexlayout-react';

export const MainLayout: React.FC = () => {
    const [model] = React.useState(() => Model.fromJson(json));
    const { chapters, currentChapter, setCurrentChapter, isSidebarOpen, toggleSidebar } = useAppStore();

    const factory = (node: TabNode) => {
        const component = node.getComponent();

        if (component === "editor_pane") {
            return (
                <div className="flex flex-col h-full bg-neutral-900 overflow-hidden relative group">
                    {/* Header bar that floats slightly over content but pushes it down */}
                    <div className="h-10 shrink-0 border-b border-neutral-800/60 bg-neutral-900/95 backdrop-blur flex items-center px-4 justify-between z-10">
                        <div className="flex items-center gap-3">
                            <span className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ring-1 ring-blue-500/30">RU</span>
                            <span className="text-sm font-medium text-slate-200">Target Translation</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-400 hover:text-purple-300 hover:bg-purple-900/20" title="Smart AI Translation">
                                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI Translate
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-400 hover:text-blue-300 hover:bg-blue-900/20" title="Machine Translation">
                                <Zap className="h-3.5 w-3.5 mr-1.5" /> Quick MT
                            </Button>
                            <div className="w-px h-4 bg-slate-800 mx-1"></div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-100">
                                <Maximize2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-100">
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto relative p-2 lg:p-4 hide-scrollbar">
                        <SegmentList />
                    </div>
                </div>
            );
        }

        if (component === "reference_pane") {
            return (
                <div className="flex flex-col h-full bg-neutral-900 overflow-hidden group">
                    <div className="h-10 shrink-0 border-b border-neutral-800/60 bg-neutral-900/95 backdrop-blur flex items-center px-4 justify-between z-10">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ring-1 ring-slate-700">EN</span>
                            <span className="text-sm font-medium text-slate-200">Source Text</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-100">
                                <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto relative p-2 lg:p-4 opacity-90 select-text hide-scrollbar">
                        <SegmentList isReference={true} />
                    </div>
                </div>
            );
        }

        return <div className="text-slate-500 flex items-center justify-center h-full">Empty Pane</div>;
    };

    const handleAddEditorPane = () => {
        model.doAction(Actions.addNode(
            { type: "tab", component: "editor_pane", name: "Editor", enableClose: true, enableDrag: true },
            model.getRoot().getChildren()[0].getId(),
            DockLocation.RIGHT,
            -1
        ));
    };

    const handleAddReferencePane = () => {
        model.doAction(Actions.addNode(
            { type: "tab", component: "reference_pane", name: "Reference", enableClose: true, enableDrag: true },
            model.getRoot().getChildren()[0].getId(),
            DockLocation.LEFT,
            -1
        ));
    };

    return (
        <div className="flex h-full w-full bg-transparent overflow-hidden">

            {/* Collapsible Left Sidebar (Activity Bar style) */}
            <div className={`transition-all duration-300 ease-in-out border-r border-neutral-800/60 bg-neutral-950/40 flex flex-col shrink-0 ${isSidebarOpen ? 'w-64' : 'w-[60px]'}`}>
                <div className="h-12 border-b border-neutral-800/60 flex items-center px-3 overflow-hidden gap-3">
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800 shrink-0">
                        {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                    </Button>
                    {isSidebarOpen && <span className="font-semibold text-xs text-slate-300 uppercase tracking-wider whitespace-nowrap">Chapters</span>}
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
            <div className="flex-1 relative bg-neutral-950 p-2 flex flex-col">
                <div className="h-10 shrink-0 flex items-center justify-end px-4 gap-2 border-b border-neutral-800/40">
                    <span className="text-xs text-neutral-500 mr-2">Workspace Controls:</span>
                    <Button variant="outline" size="sm" onClick={handleAddReferencePane} className="h-7 text-xs" title="Add Source Text Pane">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Source
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleAddEditorPane} className="h-7 text-xs" title="Add Target Translation Pane">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Translation
                    </Button>
                </div>
                <div className="flex-1 relative">
                    <Layout model={model} factory={factory} />
                </div>
            </div>
        </div>
    );
};
