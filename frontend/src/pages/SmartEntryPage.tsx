/* Smart Entry Page - Voice + Text AI-powered billing */
import { useRef, useState, useEffect } from 'react';
import { Calendar, Check, Loader2, Mic, MicOff, Sparkles, Send } from 'lucide-react';
import api from '../services/api';
import type { SmartEntryResponse } from '../types';
import { toast } from '../components/common/Toast';

type EntrySource = 'text' | 'voice';

interface EditableSmartEntry {
  customer_name: string;
  phone: string;
  services: string[];
  total_amount: number;
  payment_mode: string;
  notes: string;
  service_date?: string;
}

export default function SmartEntryPage() {
  const [text, setText] = useState('');
  const [entrySource, setEntrySource] = useState<EntrySource>('text');
  const [processedSource, setProcessedSource] = useState<EntrySource>('text');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<SmartEntryResponse | null>(null);
  const [editData, setEditData] = useState<EditableSmartEntry | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState('en-IN');
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  const fetchRecentEntries = async () => {
    try {
      const res = await api.get('/transactions', { params: { page: 1, page_size: 5 } });
      setRecentEntries(res.data.transactions || []);
    } catch {}
  };

  useEffect(() => {
    fetchRecentEntries();
  }, []);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast('error', 'Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLanguage;
    finalTranscriptRef.current = text.trim() ? `${text.trim()} ` : '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += `${transcript.trim()} `;
        } else {
          interimTranscript += transcript;
        }
      }

      setText(`${finalTranscriptRef.current}${interimTranscript}`.trim());
    };

    recognition.onerror = (e: any) => {
      toast('error', `Voice error: ${e.error}`);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setEntrySource('voice');
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const getPastDaysDiff = (dateStr: string): number => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const today = new Date();
    d.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = today.getTime() - d.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const processEntry = async () => {
    if (!text.trim()) return;

    const source = entrySource;
    if (isListening) stopListening();

    setLoading(true);

    try {
      const res = await api.post<SmartEntryResponse>('/transactions/smart-entry', {
        text: text.trim(),
        input_type: source,
      });

      setExtracted(res.data);
      setProcessedSource(source);
      setEditData({
        customer_name: res.data.extracted.customer_name || '',
        phone: res.data.extracted.phone || '',
        services: res.data.extracted.services,
        total_amount: res.data.extracted.total_amount || 0,
        payment_mode: res.data.extracted.payment_mode || 'cash',
        notes: res.data.extracted.notes || '',
        service_date: res.data.extracted.service_date || new Date().toISOString().split('T')[0],
      });
      toast('success', 'AI processed input successfully!');
    } catch (err: any) {
      toast('error', err.response?.data?.detail || 'AI processing failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmEntry = async () => {
    if (!editData) return;

    if (editData.service_date) {
      const diff = getPastDaysDiff(editData.service_date);
      if (diff < 0) {
        toast('error', 'Future dates are not allowed.');
        return;
      }
    }

    setLoading(true);

    try {
      await api.post('/transactions/smart-entry/confirm', {
        customer_name: editData.customer_name,
        phone: editData.phone || null,
        services: editData.services,
        total_amount: editData.total_amount,
        payment_mode: editData.payment_mode,
        notes: editData.notes,
        raw_input: extracted?.raw_input,
        input_type: processedSource,
        ai_extracted_json: extracted ? JSON.stringify(extracted.extracted) : null,
        service_date: editData.service_date ? `${editData.service_date}T12:00:00` : null,
      });

      toast('success', 'Smart Entry saved successfully!');
      setText('');
      setEntrySource('text');
      setProcessedSource('text');
      finalTranscriptRef.current = '';
      setExtracted(null);
      setEditData(null);
      fetchRecentEntries();
    } catch (err: any) {
      toast('error', err.response?.data?.detail || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  const cancelEntry = () => {
    setExtracted(null);
    setEditData(null);
  };

  const setExampleText = (example: string) => {
    setText(example);
    setEntrySource('text');
    finalTranscriptRef.current = '';
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fade-in pb-12">
      {/* Header Title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Smart Entry</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Speak or type naturally - AI extracts billing data automatically
        </p>
      </div>

      {/* Main Form container */}
      <div className="card p-6 flex flex-col gap-5">
        
        {/* Suggestion examples */}
        <div className="flex flex-wrap gap-2">
          {[
            'Priya Sharma came for hair spa and haircut, total bill eighteen hundred paid by UPI',
            'Riya aayi thi facial ke liye, 1000 cash',
            'Neha haircut aur manicure, total 1200 card',
          ].map((example) => (
            <button
              key={example}
              onClick={() => setExampleText(example)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:border-[rgba(212,160,23,0.4)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] cursor-pointer"
            >
              {example}
            </button>
          ))}
        </div>

        {/* Text Input area */}
        <textarea
          id="smart-entry-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setEntrySource('text');
            finalTranscriptRef.current = '';
          }}
          placeholder="Type or speak: 'Priya came for Hair Spa, bill 1800 UPI'..."
          className="w-full min-h-[140px] px-4 py-3 rounded-xl text-sm bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[#D4A017] focus:outline-none focus:ring-2 focus:ring-[#D4A017] focus:border-[#D4A017] resize-none transition-all"
        />

        {/* Controls: Language Select + Voice Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-[var(--text-secondary)] shrink-0 select-none">Language:</span>
            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs outline-none cursor-pointer border bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-primary)] w-full sm:w-[180px]"
            >
              <option value="en-IN">English/Hinglish (Latin)</option>
              <option value="hi-IN">Hindi (हिंदी script)</option>
            </select>
          </div>
          
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isListening 
                ? 'bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse' 
                : 'bg-[rgba(212,160,23,0.1)] text-[#D4A017] border border-[rgba(212,160,23,0.2)] hover:bg-[rgba(212,160,23,0.15)]'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                <span>Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start Voice Recording</span>
              </>
            )}
          </button>
        </div>

        {/* Process with AI Button */}
        <div className="flex justify-center w-full border-t border-[rgba(255,255,255,0.05)] pt-4">
          <button
            id="smart-entry-process"
            onClick={processEntry}
            disabled={!text.trim() || loading}
            className="w-full sm:max-w-[480px] h-[52px] flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all gold-gradient text-black hover:opacity-90 disabled:opacity-40 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'AI Processing...' : 'Process with AI'}</span>
          </button>
        </div>

        {/* Troubleshooting Instructions */}
        <div className="mt-2 pt-4 border-t border-[rgba(255,255,255,0.05)] text-xs text-[var(--text-secondary)] space-y-1 select-none">
          <p className="font-semibold text-white mb-1">🎤 Troubleshooting Voice to Text:</p>
          <p>1. Ensure microphone access is allowed in your browser address bar settings.</p>
          <p>2. Google Chrome and Microsoft Edge browsers are recommended for native Web Speech support.</p>
          <p>3. If using Brave Browser, enable "Google Services for Speech Recognition" in Brave settings.</p>
        </div>
      </div>

      {/* Edit Extracted Data Panel */}
      {editData && (
        <div className="card p-6 animate-slide-in flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              <Sparkles className="w-4 h-4 text-[#D4A017]" />
              AI Extracted Data - Please Confirm
            </h3>
            <span
              className="text-xs px-2 py-1 rounded-lg whitespace-nowrap bg-[rgba(212,175,55,0.15)] text-[var(--color-gold)] font-medium"
            >
              {processedSource === 'voice' ? 'Voice' : 'Text'} -{' '}
              {Math.round((extracted?.extracted.confidence || 0) * 100)}% Confidence
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">
                Customer Name
              </label>
              <input
                value={editData.customer_name}
                onChange={(e) => setEditData({ ...editData, customer_name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4A017] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">
                Phone
              </label>
              <input
                value={editData.phone}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4A017] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">
                Total Amount (Rs)
              </label>
              <input
                type="number"
                value={editData.total_amount}
                onChange={(e) => setEditData({ ...editData, total_amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4A017] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">
                Payment Mode
              </label>
              <select
                value={editData.payment_mode}
                onChange={(e) => setEditData({ ...editData, payment_mode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4A017] transition-all"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 flex items-center gap-1.5 text-[var(--text-secondary)]">
                <Calendar className="w-3.5 h-3.5 text-[#D4A017]" />
                Service Date
              </label>
              <input
                type="date"
                value={editData.service_date || ''}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEditData({ ...editData, service_date: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[#D4A017] transition-all"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {editData.service_date && getPastDaysDiff(editData.service_date) > 90 && (
              <div
                className="md:col-span-2 p-3 rounded-xl text-xs flex items-center gap-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
              >
                ⚠️ Entering entry for {new Date(editData.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (more than 90 days ago) — confirm?
              </div>
            )}

            {editData.service_date && getPastDaysDiff(editData.service_date) < 0 && (
              <div
                className="md:col-span-2 p-3 rounded-xl text-xs flex items-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20"
              >
                ❌ Future dates are not allowed. Please select today or a past date.
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1 text-[var(--text-secondary)]">
                Services
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {editData.services.map((service, index) => (
                  <span
                    key={`${service}-${index}`}
                    className="px-2.5 py-1 rounded-lg text-xs bg-[rgba(212,175,55,0.15)] text-[#D4A017]"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4 border-t border-[rgba(255,255,255,0.05)] pt-4">
            <button
              onClick={confirmEntry}
              disabled={loading || (!!editData.service_date && getPastDaysDiff(editData.service_date) < 0)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all text-black gold-gradient hover:opacity-90 disabled:opacity-40 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Confirm & Save'}</span>
            </button>
            <button
              onClick={cancelEntry}
              className="px-6 py-2.5 rounded-xl text-sm transition-colors border border-[var(--border-subtle)] text-[var(--text-secondary)] bg-[var(--bg-elevated)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recent Entries Section */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Recent Entries</h3>
        <div className="flex flex-col gap-3">
          {recentEntries.map((log) => (
            <div 
              key={log.id} 
              className="bg-[#1a1f2e] border border-[rgba(212,160,23,0.15)] rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.002]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{log.customer_name || 'Walk-in Customer'}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    {new Date(log.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {log.services.map((s: any, idx: number) => (
                      <span 
                        key={idx} 
                        className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.03)] text-[var(--text-secondary)] border border-[rgba(255,255,255,0.05)]"
                      >
                        {s.service_name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#D4A017]">₹{log.total_amount.toLocaleString('en-IN')}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-md capitalize bg-[rgba(212,160,23,0.1)] text-[#D4A017] inline-block mt-1">
                    {log.payment_mode}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {recentEntries.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)] text-center py-6">No recent entries found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
