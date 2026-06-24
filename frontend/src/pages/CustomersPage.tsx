/* Customers Page — List, search, customer details modal, and transaction histories */
import { useEffect, useState } from 'react';
import { Users, Search, Plus, Phone, Repeat, X, Trash2, Loader2 } from 'lucide-react';
import api from '../services/api';
import type { Customer, Transaction } from '../types';
import { toast } from '../components/common/Toast';
import { useAuthStore } from '../store/authStore';

export default function CustomersPage() {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', gender: 'female', notes: '' });

  // Detail Modal State
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [deletingCustId, setDeletingCustId] = useState<number | null>(null);

  const fetchCustomers = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get('/customers', { params: { search: q || undefined, page_size: 50 } });
      setCustomers(res.data.customers);
      setTotal(res.data.total);
    } catch { toast('error', 'Failed to load customers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const handleSearch = () => fetchCustomers(search);

  const addCustomer = async () => {
    if (!newCust.name) return;
    try {
      await api.post('/customers', newCust);
      setShowAdd(false);
      setNewCust({ name: '', phone: '', gender: 'female', notes: '' });
      toast('success', 'Customer added!');
      fetchCustomers();
    } catch (e: any) { toast('error', e.response?.data?.detail || 'Failed to add customer'); }
  };

  const deleteCustomer = (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening modal
    setDeletingCustId(id);
  };

  const openCustomerDetails = async (customer: Customer) => {
    setSelectedCust(customer);
    setTxLoading(true);
    setTransactions([]);
    try {
      const res = await api.get('/transactions', { params: { customer_id: customer.id, page_size: 50 } });
      setTransactions(res.data.transactions);
    } catch {
      toast('error', 'Failed to load transaction history');
    } finally {
      setTxLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6" style={{ color: 'var(--color-gold)' }} />
            Customers Catalog
          </h1>
          <p className="secondary-text">{total} registered clients</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold gold-gradient text-black hover:opacity-90 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} />
          <input
            id="customer-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
          />
        </div>
        <button onClick={handleSearch} className="px-5 py-2.5 rounded-xl text-sm font-medium gold-gradient text-black">Search</button>
      </div>

      {/* Add Customer Form */}
      {showAdd && (
        <div className="material-card p-6 animate-scale-in space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">New Customer Registration</h3>
            <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="Name *"
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <input value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} placeholder="Phone"
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <select value={newCust.gender} onChange={(e) => setNewCust({ ...newCust, gender: e.target.value })}
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
            <input value={newCust.notes} onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })} placeholder="Notes/Preferences"
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <button onClick={addCustomer} className="px-6 py-2 rounded-xl text-sm font-semibold gold-gradient text-black">Save Customer</button>
        </div>
      )}

      {/* Customer List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No customers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <div
              key={c.id}
              onClick={() => openCustomerDetails(c)}
              className="material-card p-5 cursor-pointer relative group transition-all hover:scale-[1.01]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold gold-gradient text-black shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    {c.phone && (
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Phone className="w-3 h-3" /> {c.phone}
                      </p>
                    )}
                  </div>
                </div>

                {user?.role === 'admin' && (
                  <button
                    onClick={(e) => deleteCustomer(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-all shrink-0"
                    title="Delete customer profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center mt-4">
                <div className="rounded-lg py-2" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--color-gold)' }}>{c.total_visits}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Visits</p>
                </div>
                <div className="rounded-lg py-2" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <p className="text-xs font-bold" style={{ color: '#22C55E' }}>₹{c.lifetime_value.toLocaleString('en-IN')}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>LTV</p>
                </div>
                <div className="rounded-lg py-2" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <p className="text-xs font-bold">{c.last_visit ? new Date(c.last_visit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Last Visit</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Detail & Transaction History Modal */}
      {selectedCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl material-card max-h-[85vh] flex flex-col overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg gold-gradient text-black">
                  {selectedCust.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{selectedCust.name}</h2>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    Member since {new Date(selectedCust.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedCust(null)} className="p-1 rounded-lg hover:bg-[var(--color-surface-2)]">
                <X className="w-5 h-5" style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Profile Card details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <p className="text-xs text-[var(--color-text-muted)]">Phone Number</p>
                  <p className="text-sm font-semibold mt-1">{selectedCust.phone || 'None'}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <p className="text-xs text-[var(--color-text-muted)]">Gender</p>
                  <p className="text-sm font-semibold capitalize mt-1">{selectedCust.gender || '—'}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <p className="text-xs text-[var(--color-text-muted)]">Total Visits</p>
                  <p className="text-sm font-bold mt-1 text-[var(--color-gold)]">{selectedCust.total_visits}</p>
                </div>
                <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                  <p className="text-xs text-[var(--color-text-muted)]">Lifetime Value</p>
                  <p className="text-sm font-bold mt-1 text-green-500">₹{selectedCust.lifetime_value.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {selectedCust.notes && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--color-surface-2)', borderLeft: '3px solid var(--color-gold)' }}>
                  <h4 className="text-xs font-semibold text-[var(--color-gold)] uppercase tracking-wider mb-1">Notes & Preferences</h4>
                  <p className="text-sm opacity-95">{selectedCust.notes}</p>
                </div>
              )}

              {/* Transactions list */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Repeat className="w-4 h-4 text-[var(--color-gold)]" /> Visit History & Purchases
                </h4>
                {txLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-gold)]" /></div>
                ) : transactions.length === 0 ? (
                  <p className="text-xs text-center py-6 text-[var(--color-text-muted)]">No transactions recorded for this client</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-4 rounded-xl border border-[var(--color-border)]" style={{ backgroundColor: 'var(--color-surface-2)' }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase" style={{
                              backgroundColor: tx.payment_mode === 'upi' ? 'rgba(34,197,94,0.1)' : tx.payment_mode === 'card' ? 'rgba(139,92,246,0.1)' : 'rgba(212,175,55,0.1)',
                              color: tx.payment_mode === 'upi' ? '#22C55E' : tx.payment_mode === 'card' ? '#A78BFA' : 'var(--color-gold)'
                            }}>{tx.payment_mode}</span>
                            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {new Date(tx.service_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            {new Date(tx.service_date).toDateString() !== new Date(tx.created_at).toDateString() && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(212,175,55,0.12)] text-[var(--color-gold)] font-semibold" title="Backdated Entry">
                                📅 Backdated
                              </span>
                            )}
                          </div>
                          <span className="font-bold text-sm">₹{tx.total_amount.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {tx.services.map((s, idx) => (
                            <span key={`${s.service_name}-${idx}`} className="text-[10px] px-2 py-0.5 rounded bg-black/30 border border-white/5 opacity-80">
                              {s.service_name} (₹{s.price})
                            </span>
                          ))}
                        </div>
                        {tx.notes && <p className="text-xs mt-2 italic text-[var(--color-text-muted)]">Note: {tx.notes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Customer Deletion Confirmation Modal */}
      {deletingCustId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-2xl p-6 gold-border animate-scale-in"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <h3 className="text-base font-semibold text-white mb-2">Delete Customer Profile?</h3>
            <p className="text-xs mb-6" style={{ color: 'var(--color-text-muted)' }}>
              Are you sure you want to delete this customer? All transaction history and billing references will remain, but the customer profile will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const id = deletingCustId;
                  setDeletingCustId(null);
                  try {
                    await api.delete(`/customers/${id}`);
                    toast('success', 'Customer profile deleted successfully');
                    if (selectedCust?.id === id) setSelectedCust(null);
                    fetchCustomers();
                  } catch (err: any) {
                    toast('error', err.response?.data?.detail || 'Failed to delete customer');
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500 hover:bg-red-600 transition-colors text-white cursor-pointer"
              >
                Delete Profile
              </button>
              <button
                onClick={() => setDeletingCustId(null)}
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
