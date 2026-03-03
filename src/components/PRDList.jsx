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
        <Loader2 size={24} className="animate-spin text-[#787774]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-medium text-[#37352f]">Your PRDs</h2>
          <p className="text-sm text-[#787774]">{prds.length} document{prds.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onNewPRD}
          className="flex items-center gap-2 bg-[#2383e2] hover:bg-[#1b6abf] text-white px-4 py-2 rounded-[3px] font-medium text-sm"
        >
          <Plus size={16} />
          New PRD
        </button>
      </div>

      {prds.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#e9e8e4] rounded-[3px]">
          <FileText size={40} className="mx-auto text-[#9b9a97] mb-3" />
          <p className="text-[#787774] text-sm mb-1">No PRDs yet</p>
          <p className="text-[#9b9a97] text-xs">Create your first PRD from a meeting transcript</p>
        </div>
      ) : (
        <div className="space-y-2">
          {prds.map(prd => (
            <div
              key={prd.id}
              onClick={() => onOpenPRD(prd.id)}
              className="bg-white border border-[#e9e8e4] rounded-[3px] p-4 hover:bg-[rgba(55,53,47,0.08)] cursor-pointer group flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-[#37352f] text-sm truncate">{prd.title || 'Untitled PRD'}</h3>
                  <span className="text-xs bg-[rgba(55,53,47,0.06)] text-[#787774] px-2 py-0.5 rounded-[3px] shrink-0">{prd.project_key}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#9b9a97]">
                  <span>{prd.creator_name}</span>
                  <span className="inline-block bg-[rgba(55,53,47,0.06)] text-[#787774] px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium">{prd.creator_job_title}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(prd.updated_at)}</span>
                </div>
              </div>
              <button
                onClick={(e) => deletePRD(prd.id, e)}
                className="opacity-0 group-hover:opacity-100 text-[#9b9a97] hover:text-[#e03e3e] p-1"
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
