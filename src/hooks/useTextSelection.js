import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Tracks text selection within a container ref.
 * Returns the selected text, anchor data, and popover positioning.
 *
 * Popover coordinates are viewport-relative (for use with fixed positioning).
 * Selection state only updates on mouseup to avoid re-renders during drag
 * that would destroy the browser selection.
 */
export default function useTextSelection(containerRef, enabled = true) {
  const [selection, setSelection] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);
  const clearTimeoutRef = useRef(null);
  const mouseDownRef = useRef(false);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setPopoverPos(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearSelection();
      return;
    }

    function checkSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        // Delay clearing to allow button clicks on the popover
        clearTimeoutRef.current = setTimeout(() => {
          clearSelection();
        }, 200);
        return;
      }

      // Check that the selection is within our container
      const container = containerRef?.current;
      if (!container) return;

      const range = sel.getRangeAt(0);
      if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
        return;
      }

      const text = sel.toString().trim();
      if (!text || text.length < 3) return;

      // Viewport-relative coordinates for fixed positioning
      const rect = range.getBoundingClientRect();

      setPopoverPos({
        top: rect.top - 45,
        left: rect.left + rect.width / 2,
      });

      setSelection({
        text,
        prefix: '',
        suffix: '',
        start: null,
        end: null,
        range: range.cloneRange(),
      });
    }

    function handleMouseDown() {
      mouseDownRef.current = true;
      // Clear any pending clear timeout when starting a new selection
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
    }

    function handleMouseUp() {
      mouseDownRef.current = false;
      // Small delay to let the browser finalize the selection
      setTimeout(checkSelection, 10);
    }

    function handleSelectionChange() {
      // Skip state updates while mouse is dragging to prevent re-renders
      // that would destroy the in-progress browser selection
      if (mouseDownRef.current) return;

      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

      checkSelection();
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, [enabled, containerRef, clearSelection]);

  return { selection, popoverPos, clearSelection };
}
