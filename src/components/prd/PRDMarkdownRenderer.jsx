import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Walks text children of a rendered element and wraps any text that matches
 * a resolved comment anchor in a <mark> highlight span.
 */
function highlightText(children, resolvedAnchors, onHighlightClick) {
  if (!resolvedAnchors || resolvedAnchors.length === 0) return children;

  return React.Children.map(children, child => {
    if (typeof child !== 'string') return child;

    const segments = [];
    let remaining = child;
    let key = 0;

    // Try to match each anchor against this text
    for (const anchor of resolvedAnchors) {
      if (!anchor.text) continue;
      const idx = remaining.indexOf(anchor.text);
      if (idx === -1) continue;

      if (idx > 0) {
        segments.push(remaining.slice(0, idx));
      }

      const colorClass = anchor.commentType === 'suggestion'
        ? 'bg-[rgba(45,170,219,0.2)] hover:bg-[rgba(45,170,219,0.35)] border-b-2 border-[rgba(45,170,219,0.5)]'
        : 'bg-[rgba(255,212,0,0.3)] hover:bg-[rgba(255,212,0,0.45)] border-b-2 border-[rgba(255,212,0,0.6)]';

      const statusClass = anchor.status !== 'open'
        ? 'opacity-40 line-through'
        : 'cursor-pointer';

      segments.push(
        <mark
          key={`hl-${anchor.commentId}-${key++}`}
          className={`${colorClass} ${statusClass} rounded-sm px-0.5 transition-colors no-transition`}
          data-comment-id={anchor.commentId}
          onClick={(e) => {
            e.stopPropagation();
            onHighlightClick?.(anchor.commentId);
          }}
        >
          {anchor.text}
        </mark>
      );

      remaining = remaining.slice(idx + anchor.text.length);
    }

    if (segments.length === 0) return child;
    segments.push(remaining);
    return segments;
  });
}

function createAnnotatedComponent(tag, resolvedAnchors, onHighlightClick) {
  const Tag = tag;
  return function AnnotatedElement({ children, ...props }) {
    return (
      <Tag {...props}>
        {highlightText(children, resolvedAnchors, onHighlightClick)}
      </Tag>
    );
  };
}

const PRDMarkdownRenderer = React.memo(function PRDMarkdownRenderer({ content, resolvedAnchors, onHighlightClick, containerRef }) {
  const components = useMemo(() => {
    const tags = ['p', 'li', 'td', 'th', 'strong', 'em'];
    const comps = {};
    for (const tag of tags) {
      comps[tag] = createAnnotatedComponent(tag, resolvedAnchors, onHighlightClick);
    }
    return comps;
  }, [resolvedAnchors, onHighlightClick]);

  return (
    <div ref={containerRef} className="notion-doc">
      <div className="prose prose-lg prose-gray max-w-none">
        <ReactMarkdown components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
});

export default PRDMarkdownRenderer;
