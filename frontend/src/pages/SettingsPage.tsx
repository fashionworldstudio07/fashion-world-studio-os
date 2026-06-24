/* Settings Page — CRUD settings, integration tests, daily reports, automation logs */
import { useState, useEffect } from 'react';
import { Settings, Send, MessageSquare, Clock, CheckCircle, XCircle, Loader2, Save, Mail } from 'lucide-react';
import api from '../services/api';
import { toast } from '../components/common/Toast';

interface AutoLog {
  id: number;
  type: string;
  status: string;
  message: string | null;
  recipient: string;
  error: string | null;
  sent_at: string | null;
}

export default function SettingsPage() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState('');
  const [logs, setLogs] = useState<AutoLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState<any>(null);

  // App Settings CRUD State
  const [dbSettings, setDbSettings] = useState({
    SALON_NAME: 'Fashion World Studio',
    SALON_CITY: 'Dehradun',
    SALON_STATE: 'Uttarakhand',
    DEFAULT_WHATSAPP_RECIPIENT: '',
    DEFAULT_EMAIL_RECIPIENT: '',
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASSWORD: '',
  });

  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadLogs();
    loadDbSettings();
  }, []);

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/reports/automation-logs');
      setLogs(res.data);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  };

  const loadDbSettings = async () => {
    try {
      const res = await api.get('/settings');
      const settingsMap = { ...dbSettings };
      res.data.forEach((item: any) => {
        if (item.key in settingsMap) {
          (settingsMap as any)[item.key] = item.value || '';
        }
      });
      setDbSettings(settingsMap);
    } catch { /* ignore fallback values */ }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const payload = {
        settings: Object.entries(dbSettings).map(([key, value]) => ({
          key,
          value,
          category: key.startsWith('SMTP') || key.includes('EMAIL') ? 'email' : key.includes('WHATSAPP') ? 'whatsapp' : 'general',
        })),
      };
      await api.put('/settings', payload);
      toast('success', 'Settings saved successfully!');
    } catch {
      toast('error', 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const testGemini = async () => {
    setLoading('gemini');
    try {
      const r = await api.get('/test/gemini');
      setTestResult({ type: 'Gemini AI', ...r.data });
      toast('success', 'Gemini connected successfully!');
    } catch (e: any) {
      setTestResult({ type: 'Gemini AI', status: 'error', error: e.message });
      toast('error', 'Gemini connection failed');
    } finally { setLoading(''); }
  };

  const testWhatsApp = async () => {
    setLoading('whatsapp');
    try {
      const r = await api.get('/test/whatsapp');
      setTestResult({ type: 'WhatsApp', ...r.data });
      toast('success', 'WhatsApp test message sent!');
    } catch (e: any) {
      setTestResult({ type: 'WhatsApp', status: 'error', error: e.message });
      toast('error', 'WhatsApp test failed');
    } finally { setLoading(''); }
  };

  const sendDailyReport = async (method: 'whatsapp' | 'email') => {
    setLoading(method);
    try {
      const endpoint = method === 'whatsapp' ? '/reports/whatsapp/daily' : '/reports/email/daily';
      const r = await api.post(endpoint);
      setDailyStats(r.data.stats);
      if (r.data.status === 'sent') {
        toast('success', `Daily report sent via ${method === 'whatsapp' ? 'WhatsApp' : 'Email'}!`);
      } else {
        toast('warning', r.data.error || 'Report generated but send may have failed');
      }
      loadLogs();
    } catch (e: any) {
      toast('error', e.response?.data?.detail || `Failed to send ${method} report`);
    } finally { setLoading(''); }
  };

  const getDailyStats = async () => {
    setLoading('stats');
    try {
      const r = await api.get('/reports/daily-stats');
      setDailyStats(r.data);
      toast('info', 'Daily stats loaded');
    } catch { toast('error', 'Failed to load stats'); }
    finally { setLoading(''); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings className="w-6 h-6" style={{ color: 'var(--color-gold)' }} />
          Settings & Configurations
        </h1>
        <p className="secondary-text mt-1">Manage business details, credentials, and notification settings</p>
      </div>

      {/* Salon Settings CRUD */}
      <div className="material-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold flex items-center gap-2">
            💇 Business Profile & Notification Targets
          </h3>
          <button
            onClick={saveSettings}
            disabled={savingSettings}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-black gold-gradient transition-all hover:opacity-90 disabled:opacity-50"
          >
            {savingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Configurations
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gold)]">General Information</h4>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Salon Name</label>
              <input
                value={dbSettings.SALON_NAME}
                onChange={(e) => setDbSettings({ ...dbSettings, SALON_NAME: e.target.value })}
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>City</label>
                <input
                  value={dbSettings.SALON_CITY}
                  onChange={(e) => setDbSettings({ ...dbSettings, SALON_CITY: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>State</label>
                <input
                  value={dbSettings.SALON_STATE}
                  onChange={(e) => setDbSettings({ ...dbSettings, SALON_STATE: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gold)]">Notification Targets</h4>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Default WhatsApp Recipient</label>
              <input
                value={dbSettings.DEFAULT_WHATSAPP_RECIPIENT}
                onChange={(e) => setDbSettings({ ...dbSettings, DEFAULT_WHATSAPP_RECIPIENT: e.target.value })}
                placeholder="e.g., 919582480417"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Default Email Recipient</label>
              <input
                value={dbSettings.DEFAULT_EMAIL_RECIPIENT}
                onChange={(e) => setDbSettings({ ...dbSettings, DEFAULT_EMAIL_RECIPIENT: e.target.value })}
                placeholder="e.g., manager@fashionworld.com"
                className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              />
            </div>
          </div>

          {/* SMTP Config */}
          <div className="md:col-span-2 space-y-4 pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gold)]">SMTP Email Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>SMTP Host</label>
                <input
                  value={dbSettings.SMTP_HOST}
                  onChange={(e) => setDbSettings({ ...dbSettings, SMTP_HOST: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>SMTP Port</label>
                <input
                  value={dbSettings.SMTP_PORT}
                  onChange={(e) => setDbSettings({ ...dbSettings, SMTP_PORT: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>SMTP User</label>
                <input
                  value={dbSettings.SMTP_USER}
                  onChange={(e) => setDbSettings({ ...dbSettings, SMTP_USER: e.target.value })}
                  placeholder="SMTP User Email"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>SMTP Password</label>
                <input
                  type="password"
                  value={dbSettings.SMTP_PASSWORD}
                  onChange={(e) => setDbSettings({ ...dbSettings, SMTP_PASSWORD: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                  style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Tests */}
      <div className="material-card p-6">
        <h3 className="text-sm font-semibold mb-4">🔌 API Connection Diagnostics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={testGemini} disabled={loading === 'gemini'}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all hover:bg-[var(--color-surface-2)]"
            style={{ border: '1px solid var(--color-border)' }}>
            <span className="flex items-center gap-2">🤖 Verify Gemini AI API Connection</span>
            {loading === 'gemini' ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-gold)' }} /> : <Send className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />}
          </button>
          <button onClick={testWhatsApp} disabled={loading === 'whatsapp'}
            className="flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all hover:bg-[var(--color-surface-2)]"
            style={{ border: '1px solid var(--color-border)' }}>
            <span className="flex items-center gap-2">📱 Send Test WhatsApp Msg</span>
            {loading === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--color-gold)' }} /> : <Send className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />}
          </button>
        </div>

        {testResult && (
          <div className="mt-4 p-4 rounded-xl text-sm" style={{
            backgroundColor: testResult.status === 'connected' || testResult.status === 'sent' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${testResult.status === 'connected' || testResult.status === 'sent' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            color: testResult.status === 'connected' || testResult.status === 'sent' ? '#22C55E' : '#EF4444',
          }}>
            <p className="font-semibold">{testResult.type}: {testResult.status}</p>
            {testResult.response && (
              <p className="mt-1 opacity-80 whitespace-pre-wrap font-mono text-[10px]">
                {typeof testResult.response === 'object' ? JSON.stringify(testResult.response, null, 2) : testResult.response}
              </p>
            )}
            {testResult.model && <p className="mt-1 opacity-80">Model: {testResult.model}</p>}
            {testResult.error && (
              <p className="mt-1 opacity-80 whitespace-pre-wrap font-mono text-[10px]">
                {typeof testResult.error === 'object' ? JSON.stringify(testResult.error, null, 2) : testResult.error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Manual Report Dispatchers */}
      <div className="material-card p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          📢 Dispatch Daily Business Summary Reports
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
          Manually compute today's metrics and dispatch them instantly to WhatsApp or Email.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={getDailyStats} disabled={loading === 'stats'}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
            {loading === 'stats' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Preview Raw Stats
          </button>
          <button onClick={() => sendDailyReport('whatsapp')} disabled={loading === 'whatsapp'}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-black gold-gradient hover:opacity-90"
          >
            {loading === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            Dispatch via WhatsApp
          </button>
          <button onClick={() => sendDailyReport('email')} disabled={loading === 'email'}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-black gold-gradient hover:opacity-90"
          >
            {loading === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Dispatch via Email
          </button>
        </div>

        {dailyStats && (
          <div className="mt-4 p-4 rounded-xl space-y-2" style={{ backgroundColor: 'var(--color-surface-2)' }}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span style={{ color: 'var(--color-text-muted)' }}>Date:</span> <span className="font-medium">{dailyStats.date}</span></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Revenue:</span> <span className="font-medium" style={{ color: 'var(--color-gold)' }}>₹{(dailyStats.revenue || 0).toLocaleString('en-IN')}</span></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Customers Served:</span> <span className="font-medium">{dailyStats.customers}</span></div>
              <div><span style={{ color: 'var(--color-text-muted)' }}>Avg Bill Value:</span> <span className="font-medium">₹{(dailyStats.avg_bill || 0).toLocaleString('en-IN')}</span></div>
              <div className="col-span-2"><span style={{ color: 'var(--color-text-muted)' }}>Top Service:</span> <span className="font-medium">{dailyStats.top_service}</span></div>
              <div className="col-span-2"><span style={{ color: 'var(--color-text-muted)' }}>Payments breakdown:</span> <span className="font-medium text-xs">{dailyStats.payment_summary}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Automation Logs */}
      <div className="material-card p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          📊 Automation Logs
        </h3>
        {logsLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--color-gold)' }} /></div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-muted)' }}>No automation logs yet — trigger a report to create one</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                <div className="flex items-center gap-3">
                  {log.status === 'sent' ? <CheckCircle className="w-4 h-4" style={{ color: '#22C55E' }} /> : <XCircle className="w-4 h-4" style={{ color: '#EF4444' }} />}
                  <div>
                    <span className="font-medium capitalize">{log.type} report</span>
                    {log.error && <p className="text-xs text-red-500 mt-0.5 max-w-md truncate">{log.error}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{
                    backgroundColor: log.status === 'sent' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: log.status === 'sent' ? '#22C55E' : '#EF4444'
                  }}>{log.status}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {log.sent_at ? new Date(log.sent_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
