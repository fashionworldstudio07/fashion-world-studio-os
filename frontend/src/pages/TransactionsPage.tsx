/* Transactions Page — List, date filters, export, void/delete */
import { useEffect, useState } from 'react';
import { Receipt, IndianRupee, Trash2, FileSpreadsheet, FileText, Filter } from 'lucide-react';
import api from '../services/api';
import type { Transaction } from '../types';
import { toast } from '../components/common/Toast';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState('');
  const [voidingId, setVoidingId] = useState<number | null>(null);

  const fetchTx = async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: p, page_size: 20 };
      if (startDate) params.date_from = startDate;
      if (endDate) params.date_to = endDate;
      const r = await api.get('/transactions', { params });
      setTransactions(r.data.transactions);
      setTotal(r.data.total);
      setPage(p);
    } catch { toast('error', 'Failed to load transactions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTx(); }, []);

  const applyFilters = () => { fetchTx(1); };
  const clearFilters = () => { setStartDate(''); setEndDate(''); setTimeout(() => fetchTx(1), 0); };

  const deleteTransaction = (id: number) => {
    setVoidingId(id);
  };

  const exportFile = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      const params: Record<string, any> = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const url = format === 'excel' ? '/export/transactions/excel' : '/export/transactions/pdf';
      const resp = await api.get(url, { params, responseType: 'blob' });
      const blob = new Blob([resp.data]);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = format === 'excel'
        ? `FW_Transactions_${new Date().toISOString().slice(0,10)}.xlsx`
        : `FW_Report_${new Date().toISOString().slice(0,10)}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast('success', `${format === 'excel' ? 'Excel' : 'PDF'} downloaded!`);
    } catch { toast('error', `Failed to export ${format}`); }
    finally { setExporting(''); }
  };

  const paymentColors: Record<string, string> = { upi: '#3B82F6', cash: '#22C55E', card: '#8B5CF6' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="secondary-text">{total} total records</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all"
            style={{ backgroundColor: showFilters ? 'rgba(212,175,55,0.15)' : 'var(--color-surface)', border: '1px solid var(--color-border)', color: showFilters ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>
            <Filter className="w-3.5 h-3.5" /> Filters
          </button>
          <button onClick={() => exportFile('excel')} disabled={exporting === 'excel'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80"
            style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E', border: '1px solid rgba(34,197,94,0.2)' }}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={() => exportFile('pdf')} disabled={exporting === 'pdf'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all hover:opacity-80"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Date Filters */}
      {showFilters && (
        <div className="material-card p-4 animate-scale-in flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', colorScheme: 'dark' }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)', colorScheme: 'dark' }} />
          </div>
          <button onClick={applyFilters} className="px-4 py-2 rounded-lg text-sm font-medium gold-gradient text-black">Apply</button>
          <button onClick={clearFilters} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--color-text-muted)' }}>Clear</button>
        </div>
      )}

      {/* Transaction List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((t) => (
            <div key={t.id} className="material-card p-5 transition-all hover:scale-[1.005]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.15)' }}>
                    <IndianRupee className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.customer_name || 'Walk-in Customer'}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {t.services.map((s, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>
                          {s.service_name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-gold)' }}>₹{t.total_amount.toLocaleString('en-IN')}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded-md capitalize" style={{ backgroundColor: `${paymentColors[t.payment_mode] || '#666'}20`, color: paymentColors[t.payment_mode] || '#888' }}>
                        {t.payment_mode}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(t.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </span>
                      {new Date(t.service_date).toDateString() !== new Date(t.created_at).toDateString() && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(212,175,55,0.12)] text-[var(--color-gold)] font-semibold flex items-center gap-0.5" title="Backdated Entry">
                          📅 Backdated
                        </span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => deleteTransaction(t.id)} className="p-2 rounded-lg hover:bg-[var(--color-surface-2)] transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {total > 20 && (
            <div className="flex justify-center gap-2 pt-4">
              <button disabled={page <= 1} onClick={() => fetchTx(page - 1)} className="px-4 py-2 rounded-lg text-sm disabled:opacity-30"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>Prev</button>
              <span className="px-4 py-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>Page {page} of {Math.ceil(total / 20)}</span>
              <button disabled={page * 20 >= total} onClick={() => fetchTx(page + 1)} className="px-4 py-2 rounded-lg text-sm disabled:opacity-30"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>Next</button>
            </div>
          )}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {voidingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-2xl p-6 gold-border animate-scale-in"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <h3 className="text-base font-semibold text-white mb-2">Void Transaction?</h3>
            <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
              This will permanently delete the transaction and subtract the amount from the client's visit history and lifetime value. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const id = voidingId;
                  setVoidingId(null);
                  try {
                    await api.delete(`/transactions/${id}`);
                    toast('success', 'Transaction voided successfully');
                    fetchTx(page);
                  } catch {
                    toast('error', 'Failed to void transaction');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 transition-colors text-white cursor-pointer"
              >
                Void Record
              </button>
              <button
                onClick={() => setVoidingId(null)}
                className="px-4 py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                style={{
                  backgroundColor: 'var(--color-surface-2)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
