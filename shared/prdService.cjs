/**
 * prdService.cjs — PRD generation with map-reduce support for long transcripts.
 *
 * For transcripts ≤ 8,000 words: single-pass (existing behavior).
 * For transcripts > 8,000 words: map-reduce (chunk → summarize → merge → PRD).
 */

'use strict';

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { chunkTranscript } = require('./transcriptChunker.cjs');

// --- Load prompts ---

const prdPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/prdPrompt.txt'),
  'utf-8'
).trim();

const summaryPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/summaryPrompt.txt'),
  'utf-8'
).trim();

const chunkSummaryPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/chunkSummaryPrompt.txt'),
  'utf-8'
).trim();

const mergeSummaryPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/mergeSummaryPrompt.txt'),
  'utf-8'
).trim();

// --- Constants ---

const LONG_TRANSCRIPT_THRESHOLD = 8000; // words
const MODEL = 'gpt-4o';

// GPT-4o pricing (per 1K tokens, as of 2024)
const COST_PER_1K_INPUT = 0.0025;
const COST_PER_1K_OUTPUT = 0.01;

// --- Token tracking ---

/**
 * Accumulate token usage from an OpenAI completion response.
 */
function trackUsage(completion, tracker) {
  if (!completion.usage || !tracker) return;
  tracker.inputTokens += completion.usage.prompt_tokens || 0;
  tracker.outputTokens += completion.usage.completion_tokens || 0;
  tracker.calls += 1;
}

/**
 * Create a fresh usage tracker.
 */
function createUsageTracker() {
  return { inputTokens: 0, outputTokens: 0, calls: 0 };
}

/**
 * Calculate estimated cost from usage tracker.
 */
function estimateCost(tracker) {
  const inputCost = (tracker.inputTokens / 1000) * COST_PER_1K_INPUT;
  const outputCost = (tracker.outputTokens / 1000) * COST_PER_1K_OUTPUT;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

/**
 * Count words in a string.
 */
function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Extract title from PRD markdown content.
 */
function extractTitle(prd) {
  const titleMatch = prd.match(/^#\s+(?:\*\*)?(.+?)(?:\*\*)?$/m);
  return titleMatch ? titleMatch[1].replace(/\*\*/g, '').trim() : 'Untitled PRD';
}

// --- Map phase: summarize individual chunks ---

/**
 * Summarize a single transcript chunk.
 * Includes retry logic — retries up to 2 times on failure.
 *
 * @param {object} openai - OpenAI client
 * @param {object} chunk - Chunk object from transcriptChunker
 * @param {number} chunkIndex - 0-based index
 * @param {number} totalChunks - Total number of chunks
 * @param {object} tracker - Usage tracker
 * @param {function} [onProgress] - Optional progress callback
 * @returns {Promise<{summary: string, chunkIndex: number, success: boolean, error?: string}>}
 */
async function summarizeChunk(openai, chunk, chunkIndex, totalChunks, tracker, onProgress) {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (onProgress) {
        onProgress({
          phase: 'map',
          message: `Processing chunk ${chunkIndex + 1}/${totalChunks}...`,
          chunkIndex,
          totalChunks,
          attempt,
        });
      }

      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.2,
        messages: [
          { role: 'system', content: chunkSummaryPrompt },
          {
            role: 'user',
            content: `This is section ${chunkIndex + 1} of ${totalChunks} from a meeting transcript.\n\nSpeakers in this section: ${chunk.speakers.join(', ')}\n\n---\n\n${chunk.text}`,
          },
        ],
      });

      trackUsage(completion, tracker);
      return {
        summary: completion.choices[0].message.content,
        chunkIndex,
        success: true,
      };
    } catch (error) {
      console.error(`[prdService] Chunk ${chunkIndex + 1} attempt ${attempt + 1} failed:`, error.message);
      if (attempt === maxRetries) {
        return {
          summary: '',
          chunkIndex,
          success: false,
          error: error.message,
        };
      }
      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
}

// --- Reduce phase: merge chunk summaries ---

/**
 * Merge multiple chunk summaries into a single coherent summary.
 */
async function mergeSummaries(openai, chunkResults, tracker, onProgress) {
  if (onProgress) {
    onProgress({ phase: 'reduce', message: 'Merging summaries...' });
  }

  const successfulSummaries = chunkResults
    .filter(r => r.success)
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map(r => `### Section ${r.chunkIndex + 1}\n\n${r.summary}`)
    .join('\n\n---\n\n');

  const failedChunks = chunkResults.filter(r => !r.success);
  if (failedChunks.length > 0) {
    console.warn(`[prdService] ${failedChunks.length} chunk(s) failed and will be missing from the merged summary:`,
      failedChunks.map(r => `chunk ${r.chunkIndex + 1}: ${r.error}`));
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: mergeSummaryPrompt },
      {
        role: 'user',
        content: `Here are summaries from ${chunkResults.length} sections of a meeting transcript. ${failedChunks.length > 0 ? `Note: ${failedChunks.length} section(s) could not be processed.` : ''}\n\n${successfulSummaries}`,
      },
    ],
  });

  trackUsage(completion, tracker);
  return completion.choices[0].message.content;
}

// --- Completeness check ---

/**
 * Warn if the merged summary seems thin relative to input size.
 */
function checkCompleteness(mergedSummary, totalWords, chunkCount, failedCount) {
  const summaryWords = countWords(mergedSummary);
  const ratio = summaryWords / totalWords;
  const warnings = [];

  // A good summary should be at least 5% of the input for long docs
  if (ratio < 0.03 && totalWords > 10000) {
    warnings.push(`Summary seems thin: ${summaryWords} words from ${totalWords} word transcript (${(ratio * 100).toFixed(1)}% ratio)`);
  }

  if (failedCount > 0) {
    warnings.push(`${failedCount} of ${chunkCount} chunks failed — summary may be incomplete`);
  }

  if (warnings.length > 0) {
    console.warn('[prdService] Completeness warnings:', warnings.join('; '));
  }

  return warnings;
}

// --- Public API ---

/**
 * Generate a PRD from a meeting transcript using GPT-4o.
 * Automatically uses map-reduce for long transcripts (> 8,000 words).
 *
 * @param {string} transcript - The parsed meeting transcript text
 * @param {string} apiKey - OpenAI API key
 * @param {object} [options] - Optional configuration
 * @param {function} [options.onProgress] - Progress callback: ({phase, message, ...}) => void
 * @returns {Promise<{ prd: string, title: string, usage: object, warnings: string[] }>}
 */
async function generatePRD(transcript, apiKey, options = {}) {
  const openai = new OpenAI({ apiKey });
  const tracker = createUsageTracker();
  const { onProgress } = options;
  const wordCount = countWords(transcript);
  let warnings = [];

  let inputForPRD = transcript;

  // --- Map-reduce for long transcripts ---
  if (wordCount > LONG_TRANSCRIPT_THRESHOLD) {
    console.log(`[prdService] Long transcript detected: ${wordCount} words. Using map-reduce pipeline.`);

    // 1. Chunk
    const { chunks, metadata } = chunkTranscript(transcript);
    console.log(`[prdService] Split into ${metadata.chunkCount} chunks (${metadata.totalWords} total words)`);

    if (onProgress) {
      onProgress({
        phase: 'chunking',
        message: `Transcript split into ${metadata.chunkCount} chunks (${metadata.totalWords.toLocaleString()} words)`,
        totalChunks: metadata.chunkCount,
        totalWords: metadata.totalWords,
      });
    }

    // 2. Map: summarize each chunk in parallel
    const chunkPromises = chunks.map((chunk, i) =>
      summarizeChunk(openai, chunk, i, chunks.length, tracker, onProgress)
    );
    const chunkResults = await Promise.allSettled(chunkPromises);

    // Unwrap settled results
    const results = chunkResults.map((settled, i) => {
      if (settled.status === 'fulfilled') return settled.value;
      return { summary: '', chunkIndex: i, success: false, error: settled.reason?.message || 'Unknown error' };
    });

    const successCount = results.filter(r => r.success).length;
    if (successCount === 0) {
      throw new Error('All chunk summaries failed. Cannot generate PRD.');
    }

    // 3. Reduce: merge summaries
    const mergedSummary = await mergeSummaries(openai, results, tracker, onProgress);

    // 4. Completeness check
    const failedCount = results.filter(r => !r.success).length;
    warnings = checkCompleteness(mergedSummary, wordCount, chunks.length, failedCount);

    inputForPRD = mergedSummary;
  }

  // --- Generate PRD (single pass from transcript or merged summary) ---
  if (onProgress) {
    onProgress({ phase: 'prd', message: 'Generating PRD...' });
  }

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      { role: 'system', content: prdPrompt },
      { role: 'user', content: `Here is the Teams meeting transcript:\n\n${inputForPRD}` },
    ],
  });

  trackUsage(completion, tracker);
  const prd = completion.choices[0].message.content;
  const title = extractTitle(prd);
  const cost = estimateCost(tracker);

  console.log(`[prdService] PRD generated. Usage: ${tracker.inputTokens} in / ${tracker.outputTokens} out tokens, ${tracker.calls} API calls, est. cost: $${cost.totalCost.toFixed(4)}`);

  return {
    prd,
    title,
    usage: { ...tracker, ...cost },
    warnings,
  };
}

/**
 * Generate a concise meeting summary from a transcript using GPT-4o.
 * Uses map-reduce for long transcripts.
 *
 * @param {string} transcript - The parsed meeting transcript text
 * @param {string} apiKey - OpenAI API key
 * @param {object} [options] - Optional configuration
 * @param {function} [options.onProgress] - Progress callback
 * @returns {Promise<{ summary: string, usage: object }>}
 */
async function generateSummary(transcript, apiKey, options = {}) {
  const openai = new OpenAI({ apiKey });
  const tracker = createUsageTracker();
  const { onProgress } = options;
  const wordCount = countWords(transcript);

  let inputForSummary = transcript;

  if (wordCount > LONG_TRANSCRIPT_THRESHOLD) {
    console.log(`[prdService] Long transcript for summary: ${wordCount} words. Using map-reduce.`);

    const { chunks, metadata } = chunkTranscript(transcript);

    if (onProgress) {
      onProgress({
        phase: 'chunking',
        message: `Transcript split into ${metadata.chunkCount} chunks`,
        totalChunks: metadata.chunkCount,
        totalWords: metadata.totalWords,
      });
    }

    const chunkPromises = chunks.map((chunk, i) =>
      summarizeChunk(openai, chunk, i, chunks.length, tracker, onProgress)
    );
    const chunkResults = await Promise.allSettled(chunkPromises);

    const results = chunkResults.map((settled, i) => {
      if (settled.status === 'fulfilled') return settled.value;
      return { summary: '', chunkIndex: i, success: false, error: settled.reason?.message || 'Unknown error' };
    });

    const successCount = results.filter(r => r.success).length;
    if (successCount === 0) {
      throw new Error('All chunk summaries failed. Cannot generate summary.');
    }

    const mergedSummary = await mergeSummaries(openai, results, tracker, onProgress);
    // For summary, the merged summary IS the summary — no need for another pass
    const cost = estimateCost(tracker);
    console.log(`[prdService] Summary generated (map-reduce). Est. cost: $${cost.totalCost.toFixed(4)}`);
    return { summary: mergedSummary, usage: { ...tracker, ...cost } };
  }

  // Short transcript — single pass
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      { role: 'system', content: summaryPrompt },
      { role: 'user', content: `Here is the Teams meeting transcript:\n\n${transcript}` },
    ],
  });

  trackUsage(completion, tracker);
  const summary = completion.choices[0].message.content;
  const cost = estimateCost(tracker);

  return { summary, usage: { ...tracker, ...cost } };
}

/**
 * Apply a natural language edit to an existing PRD using GPT-4o.
 *
 * @param {string} currentPrd - The current PRD content
 * @param {string} editInstruction - The user's edit request
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<{ prd: string, title: string }>}
 */
async function editPRD(currentPrd, editInstruction, apiKey) {
  const openai = new OpenAI({ apiKey });

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content: 'You are a senior product manager editing a PRD. Apply the user\'s requested change to the PRD below. Return the complete updated PRD in the same markdown format. Do not explain what you changed — just return the full updated PRD.',
      },
      { role: 'user', content: `Current PRD:\n\n${currentPrd}\n\n---\n\nRequested edit: ${editInstruction}` },
    ],
  });

  const prd = completion.choices[0].message.content;
  const title = extractTitle(prd);

  return { prd, title };
}

module.exports = { generatePRD, generateSummary, editPRD, countWords, LONG_TRANSCRIPT_THRESHOLD };
