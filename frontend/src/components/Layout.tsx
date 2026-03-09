import React from 'react';
import { Layout, Model, TabNode } from 'flexlayout-react';
import 'flexlayout-react/style/light.css';
import { SegmentList } from './SegmentList';

const json = {
    global: {},
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
                        name: "Editor",
                        component: "editor"
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
                        name: "Translation Memory",
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

export const MainLayout: React.FC = () => {
    const [model] = React.useState(() => Model.fromJson(json));

    const factory = (node: TabNode) => {
        const component = node.getComponent();

        if (component === "editor") {
            return <SegmentList />;
        }
        if (component === "tm") {
            return <div style={{ padding: '24px' }}>Concordance Search / TM Panel</div>;
        }
        if (component === "termbase") {
            return <div style={{ padding: '24px' }}>Termbase Panel</div>;
        }

        return <div>Unhandled Component</div>;
    };

    return (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
            <Layout model={model} factory={factory} />
        </div>
    );
};
