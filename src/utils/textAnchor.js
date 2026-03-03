/**
 * Text anchoring utilities for inline comments.
 * Uses selected text + surrounding context (prefix/suffix) for resilient matching.
 */

const CONTEXT_CHARS = 40;

/**
 * Strip markdown formatting to get plain text for matching against rendered content.
 */
function stripMarkdown(md) {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/---+/g, '')
    .replace(/\n{2,}/g, '\n');
}

/**
 * Create a text anchor from a browser text selection.
 */
export function createAnchorFromSelection(selectedText, markdown) {
  const plain = stripMarkdown(markdown);
  const idx = plain.indexOf(selectedText);
  if (idx === -1) {
    // Try fuzzy find in raw markdown
    const mdIdx = markdown.indexOf(selectedText);
    return {
      text: selectedText,
      prefix: mdIdx > 0 ? markdown.slice(Math.max(0, mdIdx - CONTEXT_CHARS), mdIdx) : '',
      suffix: mdIdx >= 0 ? markdown.slice(mdIdx + selectedText.length, mdIdx + selectedText.length + CONTEXT_CHARS) : '',
      start: mdIdx >= 0 ? mdIdx : null,
      end: mdIdx >= 0 ? mdIdx + selectedText.length : null,
    };
  }

  return {
    text: selectedText,
    prefix: plain.slice(Math.max(0, idx - CONTEXT_CHARS), idx),
    suffix: plain.slice(idx + selectedText.length, idx + selectedText.length + CONTEXT_CHARS),
    start: idx,
    end: idx + selectedText.length,
  };
}

/**
 * Resolve an anchor back to its position in the current markdown.
 * Uses 3-strategy approach: exact offset -> context match -> first occurrence.
 */
export function resolveAnchor(anchor, markdown) {
  if (!anchor || !anchor.text || !markdown) return null;

  const plain = stripMarkdown(markdown);
  const { text, prefix, suffix, start } = anchor;

  // Strategy 1: Exact offset match
  if (start != null && plain.slice(start, start + text.length) === text) {
    return { text, start, end: start + text.length };
  }

  // Strategy 2: Context-matched (prefix + text + suffix)
  if (prefix || suffix) {
    const searchStr = (prefix || '') + text + (suffix || '');
    const contextIdx = plain.indexOf(searchStr);
    if (contextIdx >= 0) {
      const matchStart = contextIdx + (prefix || '').length;
      return { text, start: matchStart, end: matchStart + text.length };
    }

    // Try with just prefix
    if (prefix) {
      const prefixSearch = prefix + text;
      const prefixIdx = plain.indexOf(prefixSearch);
      if (prefixIdx >= 0) {
        const matchStart = prefixIdx + prefix.length;
        return { text, start: matchStart, end: matchStart + text.length };
      }
    }

    // Try with just suffix
    if (suffix) {
      const suffixSearch = text + suffix;
      const suffixIdx = plain.indexOf(suffixSearch);
      if (suffixIdx >= 0) {
        return { text, start: suffixIdx, end: suffixIdx + text.length };
      }
    }
  }

  // Strategy 3: First occurrence fallback
  const fallbackIdx = plain.indexOf(text);
  if (fallbackIdx >= 0) {
    return { text, start: fallbackIdx, end: fallbackIdx + text.length };
  }

  return null;
}

/**
 * Resolve all comment anchors and return highlight-ready data.
 * Only resolves inline comments (not general), sorted by document position.
 */
export function resolveAnchors(comments, markdown) {
  if (!comments || !markdown) return [];

  const anchors = [];
  for (const comment of comments) {
    if (comment.comment_type === 'general' || !comment.selection_text) continue;

    const resolved = resolveAnchor({
      text: comment.selection_text,
      prefix: comment.selection_prefix,
      suffix: comment.selection_suffix,
      start: comment.selection_start,
    }, markdown);

    if (resolved) {
      anchors.push({
        commentId: comment.id,
        text: resolved.text,
        start: resolved.start,
        end: resolved.end,
        commentType: comment.comment_type,
        status: comment.status,
      });
    }
  }

  // Sort by document position (earlier first) so highlights don't conflict
  anchors.sort((a, b) => a.start - b.start);
  return anchors;
}
