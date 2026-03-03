import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Trash2, Save, X, Send, MessageSquare, ChevronsUp, Minus, ChevronsDown } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function extractText(node) {
  if (!node) return '';
  if (node.text) return node.text;
  if (node.content) return node.content.map(extractText).join('\n');
  return '';
}

function textToADF(text) {
  return {
    type: 'doc',
    version: 1,
    content: text.split('\n').filter(Boolean).map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
}

function formatCommentTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function TicketCard({ ticket, index, onUpdate, onDelete, currentUser }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [commentText, setCommentText] = useState('');
  const f = ticket.fields;
  const priorityConfig = {
    Highest: { color: 'text-red-600', Icon: ChevronsUp },
    High: { color: 'text-red-500', Icon: ChevronsUp },
    Medium: { color: 'text-orange-500', Icon: Minus },
    Low: { color: 'text-blue-500', Icon: ChevronsDown },
    Lowest: { color: 'text-blue-400', Icon: ChevronsDown },
  };
  const typeIcons = { Epic: '/icons/epic.png', Story: '/icons/story.png', Task: '/icons/task.png' };
  const typeName = f.issuetype?.name || 'Task';

  function startEditing(e) {
    e.stopPropagation();
    setEditSummary(f.summary || '');
    setEditDescription(extractText(f.description));
    setEditing(true);
    setOpen(true);
  }

  function saveEdit() {
    const updated = {
      ...ticket,
      fields: {
        ...ticket.fields,
        summary: editSummary,
        description: textToADF(editDescription),
      },
    };
    onUpdate(index, updated);
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function handleDelete(e) {
    e.stopPropagation();
    onDelete(index);
  }

  function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim() || !currentUser) return;
    const updated = {
      ...ticket,
      _comments: [...(ticket._comments || []), {
        userName: currentUser.name,
        content: commentText.trim(),
        timestamp: new Date().toISOString(),
      }],
    };
    onUpdate(index, updated);
    setCommentText('');
  }

  function handleDeleteComment(ci) {
    const updated = {
      ...ticket,
      _comments: ticket._comments.filter((_, i) => i !== ci),
    };
    onUpdate(index, updated);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-soft hover:shadow-card transition-all duration-200 overflow-hidden group/card">
      <div className="p-4 cursor-pointer flex items-start justify-between gap-3" onClick={() => !editing && setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {typeIcons[typeName] ? (
              <span className="flex items-center gap-1.5">
                <img src={typeIcons[typeName]} alt={typeName} className="w-4 h-4 rounded" />
                <span className="text-xs font-medium text-gray-600">{typeName}</span>
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-600">{typeName}</span>
            )}
            {f.priority?.name && (() => {
              const cfg = priorityConfig[f.priority.name];
              const PriorityIcon = cfg?.Icon;
              return (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${cfg?.color || 'text-gray-400'}`}>
                  {PriorityIcon && <PriorityIcon size={14} />}
                  {f.priority.name}
                </span>
              );
            })()}
            {f.labels?.map(l => <span key={l} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">{l}</span>)}
          </div>
          {editing ? (
            <input
              className="w-full font-semibold text-gray-900 text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
              value={editSummary}
              onChange={e => setEditSummary(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <h3 className="font-semibold text-gray-900 text-sm">{f.summary}</h3>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {!editing && (
            <>
              <button onClick={startEditing} className="p-1 text-gray-300 hover:text-accent-600 opacity-0 group-hover/card:opacity-100 transition-all" title="Edit ticket">
                <Pencil size={14} />
              </button>
              <button onClick={handleDelete} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-all" title="Delete ticket">
                <Trash2 size={14} />
              </button>
            </>
          )}
          {!editing && (open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />)}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {editing ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea
                className="w-full h-40 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 resize-none font-mono leading-relaxed"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
                  <X size={12} /> Cancel
                </button>
                <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-accent-600 hover:bg-accent-700 rounded-lg transition-colors">
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500 whitespace-pre-wrap leading-relaxed mb-3 break-words overflow-hidden">{extractText(f.description)}</div>
              <details className="group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-accent-600 transition-colors">View raw JSON</summary>
                <pre className="mt-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto overflow-y-auto max-h-60 break-all whitespace-pre-wrap">{JSON.stringify(ticket, null, 2)}</pre>
              </details>
            </>
          )}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare size={12} className="text-gray-400" />
              <span className="text-xs font-medium text-gray-500">
                Comments{(ticket._comments?.length > 0) && ` (${ticket._comments.length})`}
              </span>
            </div>
            {ticket._comments?.length > 0 && (
              <div className="space-y-2 mb-2">
                {ticket._comments.map((c, ci) => (
                  <div key={ci} className="flex items-start gap-2 group/comment">
                    <div className={`w-5 h-5 rounded-full ${getAvatarColor(c.userName)} flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mt-0.5`}>
                      {c.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{c.userName}</span>
                        <span className="text-[10px] text-gray-400">{formatCommentTime(c.timestamp)}</span>
                        {currentUser && c.userName === currentUser.name && (
                          <button onClick={() => handleDeleteComment(ci)} className="opacity-0 group-hover/comment:opacity-100 text-gray-300 hover:text-red-500 transition-all" title="Delete">
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap">{c.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100"
                onClick={e => e.stopPropagation()}
              />
              <button type="submit" disabled={!commentText.trim()} className="flex items-center gap-1 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg text-xs transition-all">
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
