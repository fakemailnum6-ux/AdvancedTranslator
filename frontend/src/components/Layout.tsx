import React from 'react';
import { Layout, Model, TabNode } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import { SegmentList } from './SegmentList';
import { ConcordancePanel } from './ConcordancePanel';

const json = {
    global: {
        tabEnableClose: false,
        tabEnableRename: false,
        tabSetHeaderHeight: 32,
    },
    borders: [
      {
         type: "border",
         location: "bottom" as const,
         size: 200,
         children: [
            {
               type: "tab",
               enableClose: false,
               name: "QA Report",
               component: "qa"
            },
            {
               type: "tab",
               enableClose: false,
               name: "Concordance Search",
               component: "concordance"
            }
         ]
      }
    ],
    layout: {
        type: "row",
        weight: 100,
        children: [
            {
                type: "tabset",
                weight: 65,
                selected: 0,
                children: [
                    {
                        type: "tab",
                        name: "Editor",
                        component: "editor",
                        enableDrag: false,
                        enableClose: false
                    }
                ]
            },
            {
                type: "tabset",
                weight: 35,
                selected: 0,
                children: [
                    {
                        type: "tab",
                        name: "TM Matches",
                        component: "tm"
                    },
                    {
                        type: "tab",
                        name: "Termbase",
                        component: "termbase"
                    }
                ]
            }
        ]
    }
};

import { useAppStore } from '../store';

export const MainLayout: React.FC = () => {
    const [model] = React.useState(() => Model.fromJson(json));
    const { chapters, currentChapter, setCurrentChapter } = useAppStore();

    const factory = (node: TabNode) => {
        const component = node.getComponent();

        if (component === "editor") {
            return <SegmentList />;
        }
        if (component === "tm") {
            return <div className="p-6 text-foreground">TM Matches Panel</div>;
        }
        if (component === "termbase") {
            return <div className="p-6 text-foreground">Termbase Panel</div>;
        }
        if (component === "qa") {
            return <div className="p-6 text-foreground">QA Errors List</div>;
        }
        if (component === "concordance") {
            return <ConcordancePanel />;
        }

        return <div className="text-foreground">Unhandled Component</div>;
    };

    return (
        <div className="flex h-full w-full bg-slate-950 text-slate-100 overflow-hidden">
            {/* Sidebar for Navigation */}
            <div className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-800 font-semibold text-sm text-slate-300">
                    Chapters Navigation
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chapters.map((chap) => (
                        <button
                            key={chap}
                            onClick={() => setCurrentChapter(chap)}
                            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                                currentChapter === chap
                                ? 'bg-blue-600/20 text-blue-400 font-medium'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            }`}
                        >
                            {chap}
                        </button>
                    ))}
                    {chapters.length === 0 && (
                        <div className="p-3 text-sm text-slate-500 italic">No chapters loaded</div>
                    )}
                </div>
            </div>

            {/* Main FlexLayout Workspace */}
            <div className="flex-1 relative">
                <Layout model={model} factory={factory} />
            </div>
        </div>
    );
};
