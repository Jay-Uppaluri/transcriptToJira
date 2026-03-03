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
    Highest: { color: 'text-[#e03e3e]', Icon: ChevronsUp },
    High: { color: 'text-[#e03e3e]', Icon: ChevronsUp },
    Medium: { color: 'text-orange-500', Icon: Minus },
    Low: { color: 'text-[#2383e2]', Icon: ChevronsDown },
    Lowest: { color: 'text-[#2383e2]', Icon: ChevronsDown },
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
    <div className="bg-white rounded-[3px] border border-[#e9e8e4] hover:bg-[rgba(55,53,47,0.04)] overflow-hidden group/card">
      <div className="p-4 cursor-pointer flex items-start justify-between gap-3" onClick={() => !editing && setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {typeIcons[typeName] ? (
              <span className="flex items-center gap-1.5">
                <img src={typeIcons[typeName]} alt={typeName} className="w-4 h-4 rounded" />
                <span className="text-xs font-medium text-[#787774]">{typeName}</span>
              </span>
            ) : (
              <span className="text-xs font-medium text-[#787774]">{typeName}</span>
            )}
            {f.priority?.name && (() => {
              const cfg = priorityConfig[f.priority.name];
              const PriorityIcon = cfg?.Icon;
              return (
                <span className={`flex items-center gap-0.5 text-xs font-medium ${cfg?.color || 'text-[#9b9a97]'}`}>
                  {PriorityIcon && <PriorityIcon size={14} />}
                  {f.priority.name}
                </span>
              );
            })()}
            {f.labels?.map(l => <span key={l} className="text-xs bg-[rgba(55,53,47,0.06)] text-[#787774] px-2 py-0.5 rounded-[3px]">{l}</span>)}
          </div>
          {editing ? (
            <input
              className="w-full font-medium text-[#37352f] text-sm bg-white border border-[#e9e8e4] rounded-[3px] px-2 py-1 focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]"
              value={editSummary}
              onChange={e => setEditSummary(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <h3 className="font-medium text-[#37352f] text-sm">{f.summary}</h3>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-1">
          {!editing && (
            <>
              <button onClick={startEditing} className="p-1 text-[#9b9a97] hover:text-[#37352f] opacity-0 group-hover/card:opacity-100" title="Edit ticket">
                <Pencil size={14} />
              </button>
              <button onClick={handleDelete} className="p-1 text-[#9b9a97] hover:text-[#e03e3e] opacity-0 group-hover/card:opacity-100" title="Delete ticket">
                <Trash2 size={14} />
              </button>
            </>
          )}
          {!editing && (open ? <ChevronUp size={16} className="text-[#9b9a97]" /> : <ChevronDown size={16} className="text-[#9b9a97]" />)}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-[#e9e8e4] pt-3">
          {editing ? (
            <div>
              <label className="block text-xs font-medium text-[#787774] mb-1">Description</label>
              <textarea
                className="w-full h-40 bg-white border border-[#e9e8e4] rounded-[3px] p-3 text-xs text-[#37352f] focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2] resize-none font-mono leading-relaxed"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#787774] hover:bg-[rgba(55,53,47,0.08)] rounded-[3px]">
                  <X size={12} /> Cancel
                </button>
                <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-[#2383e2] hover:bg-[#1b6abf] rounded-[3px]">
                  <Save size={12} /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-[#37352f] whitespace-pre-wrap leading-relaxed mb-3 break-words overflow-hidden">{extractText(f.description)}</div>
            </>
          )}
          <div className="mt-3 border-t border-[#e9e8e4] pt-3">
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare size={12} className="text-[#9b9a97]" />
              <span className="text-xs font-medium text-[#787774]">
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
                        <span className="text-xs font-medium text-[#37352f]">{c.userName}</span>
                        <span className="text-[10px] text-[#9b9a97]">{formatCommentTime(c.timestamp)}</span>
                        {currentUser && c.userName === currentUser.name && (
                          <button onClick={() => handleDeleteComment(ci)} className="opacity-0 group-hover/comment:opacity-100 text-[#9b9a97] hover:text-[#e03e3e]" title="Delete">
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#787774] whitespace-pre-wrap">{c.content}</p>
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
                className="flex-1 bg-white border border-[#e9e8e4] rounded-[3px] px-2.5 py-1.5 text-xs text-[#37352f] focus:outline-none focus:border-[#2383e2] focus:ring-1 focus:ring-[#2383e2]"
                onClick={e => e.stopPropagation()}
              />
              <button type="submit" disabled={!commentText.trim()} className="flex items-center gap-1 bg-[#2383e2] hover:bg-[#1b6abf] disabled:opacity-50 text-white px-2.5 py-1.5 rounded-[3px] text-xs">
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
