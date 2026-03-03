import React, { useState, useEffect } from 'react';
import { FileText, Plus, Loader2, Trash2, Clock } from 'lucide-react';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PRDList({ token, onNewPRD, onOpenPRD }) {
  const [prds, setPrds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPRDs();
  }, []);

  async function fetchPRDs() {
    try {
      const res = await fetch('/api/prds', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPrds(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function deletePRD(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this PRD? This cannot be undone.')) return;

    const res = await fetch(`/api/prds/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setPrds(prds.filter(p => p.id !== id));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-accent-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your PRDs</h2>
          <p className="text-sm text-gray-500">{prds.length} document{prds.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onNewPRD}
          className="flex items-center gap-2 bg-accent-600 hover:bg-accent-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 shadow-soft"
        >
          <Plus size={16} />
          New PRD
        </button>
      </div>

      {prds.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <FileText size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm mb-1">No PRDs yet</p>
          <p className="text-gray-400 text-xs">Create your first PRD from a meeting transcript</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prds.map(prd => (
            <div
              key={prd.id}
              onClick={() => onOpenPRD(prd.id)}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-accent-200 hover:shadow-card transition-all duration-200 cursor-pointer group flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{prd.title || 'Untitled PRD'}</h3>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md shrink-0">{prd.project_key}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{prd.creator_name}</span>
                  <span className="inline-block bg-accent-50 text-accent-600 px-1.5 py-0.5 rounded text-[10px] font-medium">{prd.creator_job_title}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(prd.updated_at)}</span>
                </div>
              </div>
              <button
                onClick={(e) => deletePRD(prd.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1"
                title="Delete PRD"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
