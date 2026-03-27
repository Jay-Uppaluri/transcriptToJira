/**
 * transcriptChunker.cjs — Smart transcript chunking for long meetings.
 *
 * Splits transcripts into semantic chunks based on topic shifts, speaker changes,
 * and pauses. Designed for map-reduce summarization with GPT-4o.
 *
 * Each chunk targets 3,000–5,000 words with ~200 word overlap for context continuity.
 */

'use strict';

const DEFAULT_OPTIONS = {
  targetChunkWords: 4000,   // Sweet spot for GPT-4o comprehension
  minChunkWords: 2000,      // Don't create tiny chunks
  maxChunkWords: 5500,      // Hard ceiling per chunk
  overlapWords: 200,        // Context overlap between chunks
};

/**
 * Parse a VTT-style timestamp (HH:MM:SS.mmm or MM:SS.mmm) into seconds.
 * Returns null if not parseable.
 */
function parseTimestamp(ts) {
  if (!ts) return null;
  const parts = ts.trim().split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return null;
}

/**
 * Parse transcript text into an array of line objects with metadata.
 * Handles both "Speaker: text" format and raw text.
 */
function parseLines(text) {
  const rawLines = text.split('\n').filter(l => l.trim());
  const lines = [];

  for (const raw of rawLines) {
    const speakerMatch = raw.match(/^([^:]{1,60}):\s+(.+)$/);
    const timestampMatch = raw.match(/\[(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)\]/);

    lines.push({
      raw,
      speaker: speakerMatch ? speakerMatch[1].trim() : null,
      text: speakerMatch ? speakerMatch[2].trim() : raw.trim(),
      timestamp: timestampMatch ? parseTimestamp(timestampMatch[1]) : null,
      wordCount: (speakerMatch ? speakerMatch[2] : raw).trim().split(/\s+/).length,
    });
  }

  return lines;
}

/**
 * Score how good a split point is at a given line index.
 * Higher score = better place to split.
 */
function scoreSplitPoint(lines, index) {
  if (index <= 0 || index >= lines.length) return -Infinity;

  let score = 0;
  const prev = lines[index - 1];
  const curr = lines[index];

  // Speaker change is a moderate signal
  if (prev.speaker && curr.speaker && prev.speaker !== curr.speaker) {
    score += 3;
  }

  // Large timestamp gap suggests a topic break or pause
  if (prev.timestamp != null && curr.timestamp != null) {
    const gap = curr.timestamp - prev.timestamp;
    if (gap > 120) score += 10;       // >2 min gap — strong break
    else if (gap > 60) score += 6;    // >1 min gap
    else if (gap > 30) score += 3;    // >30s gap
  }

  // Topic shift keywords at the start of a line
  const topicShiftPatterns = [
    /^(alright|okay|so|next|moving on|let's talk about|another thing|switching to|now let's)/i,
    /^(agenda item|topic|item \d|point \d)/i,
  ];
  for (const pattern of topicShiftPatterns) {
    if (pattern.test(curr.text)) {
      score += 5;
      break;
    }
  }

  // Closing phrases on previous line suggest a section ended
  const closingPatterns = [
    /\b(any questions|anything else|let's move on|that's it for|wrap up)\b/i,
  ];
  for (const pattern of closingPatterns) {
    if (pattern.test(prev.text)) {
      score += 4;
      break;
    }
  }

  return score;
}

/**
 * Build overlap text from the end of the previous chunk.
 * Returns the last ~overlapWords words as context.
 */
function buildOverlap(lines, endIndex, overlapWords) {
  const words = [];
  for (let i = endIndex - 1; i >= 0 && words.length < overlapWords; i--) {
    const lineWords = lines[i].raw.split(/\s+/);
    words.unshift(...lineWords);
  }
  // Take only the last overlapWords
  return words.slice(-overlapWords).join(' ');
}

/**
 * Extract unique speakers from a range of lines.
 */
function extractSpeakers(lines) {
  const speakers = new Set();
  for (const line of lines) {
    if (line.speaker) speakers.add(line.speaker);
  }
  return [...speakers];
}

/**
 * Get the first and last timestamps from a range of lines.
 */
function getTimeRange(lines) {
  let startTime = null;
  let endTime = null;
  for (const line of lines) {
    if (line.timestamp != null) {
      if (startTime === null) startTime = line.timestamp;
      endTime = line.timestamp;
    }
  }
  return { startTime, endTime };
}

/**
 * Chunk a transcript into semantically meaningful segments.
 *
 * @param {string} text - The full transcript text
 * @param {object} [options] - Chunking options
 * @param {number} [options.targetChunkWords=4000] - Target words per chunk
 * @param {number} [options.minChunkWords=2000] - Minimum words per chunk
 * @param {number} [options.maxChunkWords=5500] - Maximum words per chunk
 * @param {number} [options.overlapWords=200] - Words of overlap between chunks
 * @returns {{ chunks: Array<{text: string, startTime: number|null, endTime: number|null, speakers: string[], wordCount: number, index: number}>, metadata: {totalWords: number, chunkCount: number} }}
 */
function chunkTranscript(text, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines = parseLines(text);
  const totalWords = lines.reduce((sum, l) => sum + l.wordCount, 0);

  // If transcript is short enough, return as single chunk
  if (totalWords <= opts.maxChunkWords) {
    const { startTime, endTime } = getTimeRange(lines);
    return {
      chunks: [{
        text,
        startTime,
        endTime,
        speakers: extractSpeakers(lines),
        wordCount: totalWords,
        index: 0,
      }],
      metadata: { totalWords, chunkCount: 1 },
    };
  }

  // Find optimal split points
  const chunks = [];
  let chunkStart = 0;

  while (chunkStart < lines.length) {
    // Accumulate words up to targetChunkWords
    let wordsSoFar = 0;
    let idealEnd = chunkStart;
    for (let i = chunkStart; i < lines.length; i++) {
      wordsSoFar += lines[i].wordCount;
      idealEnd = i + 1;
      if (wordsSoFar >= opts.targetChunkWords) break;
    }

    // If we're near the end, just take everything remaining
    let remainingWords = 0;
    for (let i = idealEnd; i < lines.length; i++) {
      remainingWords += lines[i].wordCount;
    }
    if (remainingWords < opts.minChunkWords) {
      idealEnd = lines.length;
    }

    // If this isn't the last chunk, find the best split point in a window
    let splitAt = idealEnd;
    if (idealEnd < lines.length) {
      const windowStart = Math.max(chunkStart + Math.floor((idealEnd - chunkStart) * 0.6), chunkStart + 1);
      const windowEnd = Math.min(idealEnd + Math.floor((idealEnd - chunkStart) * 0.2), lines.length);

      let bestScore = -Infinity;
      let bestSplit = idealEnd;

      for (let i = windowStart; i <= windowEnd; i++) {
        const score = scoreSplitPoint(lines, i);
        if (score > bestScore) {
          bestScore = score;
          bestSplit = i;
        }
      }
      splitAt = bestSplit;
    }

    // Build chunk
    const chunkLines = lines.slice(chunkStart, splitAt);
    const { startTime, endTime } = getTimeRange(chunkLines);
    const chunkText = chunkLines.map(l => l.raw).join('\n');
    const chunkWordCount = chunkLines.reduce((sum, l) => sum + l.wordCount, 0);

    // Prepend overlap context from previous chunk (except for the first chunk)
    let finalText = chunkText;
    if (chunks.length > 0 && opts.overlapWords > 0) {
      const overlap = buildOverlap(lines, chunkStart, opts.overlapWords);
      if (overlap) {
        finalText = `[... continued from previous section ...]\n${overlap}\n\n---\n\n${chunkText}`;
      }
    }

    chunks.push({
      text: finalText,
      startTime,
      endTime,
      speakers: extractSpeakers(chunkLines),
      wordCount: chunkWordCount,
      index: chunks.length,
    });

    chunkStart = splitAt;
  }

  return {
    chunks,
    metadata: { totalWords, chunkCount: chunks.length },
  };
}

module.exports = { chunkTranscript, parseTimestamp };
