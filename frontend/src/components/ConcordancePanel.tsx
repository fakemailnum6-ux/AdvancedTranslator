import React from 'react';

export const ConcordancePanel: React.FC = () => {
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<any[]>([]);

    const handleSearch = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/tm/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit: 10 })
            });
            if (res.ok) {
                const data = await res.json();
                setResults(data.results);
            }
        } catch (e) {
            console.error('Failed to search Concordance', e);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card text-foreground p-4">
            <h3 className="text-sm font-semibold mb-2">Concordance Search</h3>
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 px-2 py-1 bg-input border border-border rounded text-sm outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Search TM..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                    onClick={handleSearch}
                    className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition-opacity"
                >
                    Search
                </button>
            </div>

            <div className="flex-1 overflow-auto flex flex-col gap-2">
                {results.length === 0 && <div className="text-muted-foreground text-sm text-center mt-8">No results found.</div>}
                {results.map((r, i) => (
                    <div key={i} className="p-2 border border-border rounded text-sm flex flex-col gap-1 bg-background hover:bg-muted transition-colors cursor-pointer">
                        <div className="font-medium text-blue-400">{r.source_text}</div>
                        <div className="text-green-400">{r.target_text}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};
