import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle, XCircle, ArrowRight, Send, ChevronDown, ChevronUp, Trash2, ExternalLink, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function VTTUpload({ token, connection, provider }) {
  const [file, setFile] = useState(null);
  const [projectKey, setProjectKey] = useState('KAN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Multi-step state: 'upload' | 'prd' | 'tickets' | 'submitted'
  const [step, setStep] = useState('upload');
  const [transcript, setTranscript] = useState('');
  const [prd, setPrd] = useState('');
  const [prdTitle, setPrdTitle] = useState('');
  const [tickets, setTickets] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [expandedTranscript, setExpandedTranscript] = useState(false);
  const [progressMessages, setProgressMessages] = useState([]);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const fileInputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.vtt') || f.type === 'text/vtt')) setFile(f);
    else setError('Please upload a .vtt file');
  }

  function handleFileSelect(e) {
    const f = e.target.files[0];
    if (f) { setFile(f); setError(''); }
  }

  /**
   * Estimate processing time based on word count.
   * ~10s for short, ~5s per chunk for long transcripts.
   */
  function getEstimatedTime(wordCount) {
    if (wordCount <= 8000) return 10;
    const chunks = Math.ceil(wordCount / 4000);
    return chunks * 5 + 15; // parallel chunks + merge + PRD gen
  }

  async function processFile() {
    if (!file) return;
    setLoading(true);
    setError('');
    setProgressMessages([]);

    const formData = new FormData();
    formData.append('vttFile', file);
    formData.append('projectKey', projectKey);

    try {
      // First, try the streaming endpoint for progress updates
      const res = await fetch('/api/vtt/upload-stream', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: formData,
      });

      const contentType = res.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // SSE mode — read progress events
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'progress') {
                setProgressMessages(prev => [...prev, event.message]);
                if (event.totalWords) {
                  setEstimatedTime(getEstimatedTime(event.totalWords));
                }
              } else if (event.type === 'complete') {
                setTranscript(event.transcript);
                setPrd(event.prd);
                setPrdTitle(event.prdTitle || 'Untitled PRD');
                setTickets(event.tickets || []);
                setStep('prd');
              } else if (event.type === 'error') {
                throw new Error(event.error);
              }
            } catch (parseErr) {
              if (parseErr.message !== 'Unexpected end of JSON input') throw parseErr;
            }
          }
        }
      } else {
        // Non-SSE fallback (short transcripts or server doesn't support SSE)
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setTranscript(data.transcript);
        setPrd(data.prd);
        setPrdTitle(data.prdTitle || 'Untitled PRD');
        setTickets(data.tickets || []);
        setStep('prd');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setProgressMessages([]);
      setEstimatedTime(null);
    }
  }

  async function submitTickets() {
    if (!tickets.length) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/vtt/submit-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ tickets }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSubmitResult(data);
      setStep('submitted');
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  function removeTicket(index) {
    setTickets(prev => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setFile(null);
    setTranscript('');
    setPrd('');
    setPrdTitle('');
    setTickets([]);
    setSubmitResult(null);
    setError('');
    setStep('upload');
    setExpandedTranscript(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const priorityColors = {
    Highest: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Low: 'bg-blue-100 text-blue-700',
    Lowest: 'bg-gray-100 text-gray-600',
  };

  // Step indicator
  const steps = [
    { key: 'upload', label: 'Upload' },
    { key: 'prd', label: 'PRD' },
    { key: 'tickets', label: 'Tickets' },
    { key: 'submitted', label: 'Done' },
  ];
  const currentStepIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#37352f] mb-2">Upload Meeting Transcript</h1>
        <p className="text-[#787774] text-base">Upload a .vtt file → Generate PRD → Create {provider?.itemLabelPlural || 'tickets'}.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${i < currentStepIndex ? 'bg-green-100 text-green-700' : i === currentStepIndex ? 'bg-[#2383e2] text-white' : 'bg-[#f1f1ef] text-[#787774]'}`}>
              {i < currentStepIndex ? <CheckCircle size={14} /> : <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">{i + 1}</span>}
              {s.label}
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${i < currentStepIndex ? 'bg-green-300' : 'bg-[#e9e8e4]'}`} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex items-center gap-2">
          <XCircle size={16} /> {error}
          <button onClick={() => setError('')} className="ml-auto text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
              ${file ? 'border-green-300 bg-green-50' : 'border-[#e9e8e4] hover:border-[#c4c3bf] bg-[#fbfbfa]'}`}
          >
            <input ref={fileInputRef} type="file" accept=".vtt" onChange={handleFileSelect} className="hidden" />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={24} className="text-green-600" />
                <span className="text-[#37352f] font-medium">{file.name}</span>
                <span className="text-[#787774] text-sm">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ) : (
              <div>
                <Upload size={32} className="mx-auto mb-3 text-[#787774]" />
                <p className="text-[#37352f] font-medium mb-1">Drop a .vtt file here or click to browse</p>
                <p className="text-[#787774] text-sm">Supports WebVTT transcript files from Teams meetings</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-[#37352f] mb-1">Project Key</label>
              <input
                type="text"
                value={projectKey}
                onChange={e => setProjectKey(e.target.value.toUpperCase())}
                className="px-3 py-2 border border-[#e9e8e4] rounded-md text-sm w-32 focus:outline-none focus:ring-2 focus:ring-[#2383e2]"
              />
            </div>
            <button
              onClick={processFile}
              disabled={!file || loading}
              className="mt-6 px-6 py-2 bg-[#2383e2] text-white rounded-md text-sm font-medium hover:bg-[#1b6ec2] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : <><ArrowRight size={16} /> Generate PRD & Tickets</>}
            </button>
          </div>

          {/* Progress messages for long transcripts */}
          {loading && progressMessages.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Processing long transcript...
                  {estimatedTime && <span className="font-normal text-blue-600 ml-1">(est. ~{estimatedTime}s)</span>}
                </span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {progressMessages.map((msg, i) => (
                  <p key={i} className={`text-xs ${i === progressMessages.length - 1 ? 'text-blue-700 font-medium' : 'text-blue-500'}`}>
                    {i === progressMessages.length - 1 ? '▶' : '✓'} {msg}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: PRD Review */}
      {step === 'prd' && (
        <div className="space-y-6">
          {/* Transcript preview */}
          <div className="border border-[#e9e8e4] rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedTranscript(!expandedTranscript)}
              className="w-full px-4 py-3 bg-[#fbfbfa] flex items-center justify-between text-sm font-medium text-[#37352f] hover:bg-[#f1f1ef]"
            >
              <span>📝 Parsed Transcript ({transcript.split('\n').length} lines)</span>
              {expandedTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedTranscript && (
              <pre className="p-4 text-xs text-[#787774] max-h-64 overflow-y-auto whitespace-pre-wrap">{transcript}</pre>
            )}
          </div>

          {/* PRD Content */}
          <div className="border border-[#e9e8e4] rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#fbfbfa] border-b border-[#e9e8e4] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#37352f]">{prdTitle}</h2>
                <p className="text-sm text-[#787774] mt-0.5">Generated PRD — review before proceeding to tickets</p>
              </div>
            </div>
            <div className="p-6 prose prose-sm max-w-none prose-headings:text-[#37352f] prose-p:text-[#37352f] prose-li:text-[#37352f] prose-strong:text-[#37352f] max-h-[500px] overflow-y-auto">
              <ReactMarkdown>{prd}</ReactMarkdown>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button onClick={reset} className="px-4 py-2 text-sm border border-[#e9e8e4] rounded-md hover:bg-[#f1f1ef] flex items-center gap-2">
              <ArrowLeft size={16} /> Start Over
            </button>
            <button
              onClick={() => setStep('tickets')}
              className="px-6 py-2 bg-[#2383e2] text-white rounded-md text-sm font-medium hover:bg-[#1b6ec2] flex items-center gap-2"
            >
              Review {tickets.length} Tickets <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Tickets Review */}
      {step === 'tickets' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#37352f]">
              {provider?.itemLabelPlural || 'Tickets'} ({tickets.length})
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setStep('prd')} className="px-4 py-2 text-sm border border-[#e9e8e4] rounded-md hover:bg-[#f1f1ef] flex items-center gap-2">
                <ArrowLeft size={16} /> Back to PRD
              </button>
              <button
                onClick={submitTickets}
                disabled={submitting || !tickets.length}
                className="px-6 py-2 bg-[#2383e2] text-white rounded-md text-sm font-medium hover:bg-[#1b6ec2] disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Creating...</> : <><Send size={16} /> Create {tickets.length} {provider?.itemLabelPlural || 'Tickets'}</>}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {tickets.map((ticket, i) => {
              const f = ticket.fields || {};
              const desc = f.description?.content?.[0]?.content?.[0]?.text || '';
              const priority = f.priority?.name || 'Medium';
              const issueType = f.issuetype?.name || 'Task';
              const labels = f.labels || [];
              return (
                <div key={i} className="border border-[#e9e8e4] rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[priority] || priorityColors.Medium}`}>
                          {priority}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          {issueType}
                        </span>
                      </div>
                      <h3 className="font-medium text-[#37352f]">{f.summary}</h3>
                      <p className="text-sm text-[#787774] mt-1 line-clamp-2">{desc}</p>
                      {labels.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {labels.map((label, j) => (
                            <span key={j} className="px-2 py-0.5 bg-[#f1f1ef] text-[#787774] rounded text-xs">{label}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeTicket(i)} className="text-[#c4c3bf] hover:text-red-500 p-1" title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 4: Submission Results */}
      {step === 'submitted' && submitResult && (
        <div className="space-y-6">
          <div className={`p-6 rounded-lg border ${submitResult.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle size={24} className={submitResult.failed === 0 ? 'text-green-600' : 'text-yellow-600'} />
              <h2 className="text-xl font-semibold text-[#37352f]">
                {submitResult.created} of {submitResult.total} tickets created
              </h2>
            </div>
            {submitResult.failed > 0 && (
              <p className="text-sm text-yellow-700 mt-1">
                {submitResult.failed} ticket{submitResult.failed > 1 ? 's' : ''} failed — see details below.
              </p>
            )}
          </div>

          {/* Successful tickets */}
          {submitResult.results.filter(r => r.success).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2">Created Successfully</h3>
              <div className="space-y-2">
                {submitResult.results.filter(r => r.success).map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-md border bg-white border-[#e9e8e4]">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-[#37352f]">{r.summary}</span>
                    </div>
                    {r.data?.key && (
                      <a
                        href={`${(submitResult.siteUrl || '').replace(/\/$/, '')}/browse/${r.data.key}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2383e2] text-sm font-medium flex items-center gap-1 hover:underline flex-shrink-0"
                      >
                        {r.data.key} <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed tickets */}
          {submitResult.results.filter(r => !r.success).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2">Failed</h3>
              <div className="space-y-2">
                {submitResult.results.filter(r => !r.success).map((r, i) => (
                  <div key={i} className="p-4 rounded-md border bg-red-50 border-red-200">
                    <div className="flex items-start gap-2">
                      <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-[#37352f] block">{r.summary}</span>
                        <div className="mt-2 p-3 bg-white rounded border border-red-100">
                          <p className="text-sm font-medium text-red-800 mb-1">Why it failed:</p>
                          <p className="text-sm text-red-700">{r.error || 'Unknown error — no details returned from Jira'}</p>
                          {r.status && <p className="text-xs text-red-400 mt-1">HTTP {r.status}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="px-6 py-2 bg-[#2383e2] text-white rounded-md text-sm font-medium hover:bg-[#1b6ec2]">
              Upload Another Transcript
            </button>
            {submitResult.failed > 0 && (
              <button onClick={() => setStep('tickets')} className="px-4 py-2 text-sm border border-[#e9e8e4] rounded-md hover:bg-[#f1f1ef] flex items-center gap-2">
                <ArrowLeft size={16} /> Back to Fix & Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
