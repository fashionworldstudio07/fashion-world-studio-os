/* Services Page — Manage salon services, categorize catalog, toggle status (Admins only) */
import { useEffect, useState } from 'react';
import { Scissors, Plus, X, ToggleLeft, ToggleRight, Loader2, Sparkles } from 'lucide-react';
import api from '../services/api';
import type { Service } from '../types';
import { toast } from '../components/common/Toast';
import { useAuthStore } from '../store/authStore';

const CATEGORY_COLORS: Record<string, string> = {
  hair: '#D4AF37', skin: '#22C55E', nails: '#EC4899', makeup: '#8B5CF6',
};

export default function ServicesPage() {
  const { user } = useAuthStore();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'hair', base_price: 0, duration_minutes: 30, is_custom: true });
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const r = await api.get('/services', { params: { active_only: false } });
      setServices(r.data);
    } catch { toast('error', 'Failed to load services'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchServices(); }, []);

  const addService = async () => {
    if (!form.name) return;
    try {
      await api.post('/services', form);
      setShowAdd(false);
      setForm({ name: '', category: 'hair', base_price: 0, duration_minutes: 30, is_custom: true });
      toast('success', 'Service added successfully!');
      fetchServices();
    } catch (e: any) {
      toast('error', e.response?.data?.detail || 'Failed to add service');
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    if (user?.role !== 'admin') {
      toast('error', 'Only admins can toggle service statuses');
      return;
    }
    setActionLoading(service.id);
    try {
      if (service.is_active) {
        // Deactivate using DELETE
        await api.delete(`/services/${service.id}`);
        toast('success', `Deactivated ${service.name}`);
      } else {
        // Activate using PUT
        await api.put(`/services/${service.id}`, { is_active: true });
        toast('success', `Activated ${service.name}`);
      }
      fetchServices();
    } catch (e: any) {
      toast('error', e.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scissors className="w-6 h-6" style={{ color: 'var(--color-gold)' }} />
            Services Catalog
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{services.length} registered salon services</p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold gold-gradient text-black hover:opacity-90 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add Service
          </button>
        )}
      </div>

      {showAdd && (
        <div className="material-card p-6 animate-scale-in space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--color-gold)' }} />
              Create New Salon Service
            </h3>
            <button onClick={() => setShowAdd(false)}><X className="w-4 h-4" style={{ color: 'var(--color-text-muted)' }} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Service Name *"
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              <option value="hair">Hair</option>
              <option value="skin">Skin</option>
              <option value="nails">Nails</option>
              <option value="makeup">Makeup</option>
            </select>
            <input type="number" value={form.base_price} onChange={(e) => setForm({ ...form, base_price: +e.target.value })} placeholder="Price (₹)"
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
            <input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: +e.target.value })} placeholder="Duration (min)"
              className="px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }} />
          </div>
          <button onClick={addService} className="px-6 py-2 rounded-xl text-sm font-semibold gold-gradient text-black">Save Service</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#D4AF37', borderTopColor: 'transparent' }} />
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
          <Scissors className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No services registered</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="material-card p-5 flex flex-col justify-between transition-all hover:scale-[1.01]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${CATEGORY_COLORS[s.category || 'hair']}15` }}>
                      <Scissors className="w-5 h-5" style={{ color: CATEGORY_COLORS[s.category || 'hair'] }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{s.category} • {s.duration_minutes || 0} min</p>
                    </div>
                  </div>

                  {user?.role === 'admin' ? (
                    <button
                      onClick={() => toggleServiceStatus(s)}
                      disabled={actionLoading === s.id}
                      className="text-sm rounded-lg p-1 hover:bg-white/5 transition-all text-gray-400 disabled:opacity-50"
                      title={s.is_active ? 'Deactivate Service' : 'Activate Service'}
                    >
                      {actionLoading === s.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : s.is_active ? (
                        <ToggleRight className="w-6 h-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-500" />
                      )}
                    </button>
                  ) : (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${s.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] mt-4">
                <span className="text-xs text-[var(--color-text-muted)]">Base Fare</span>
                <p className="text-lg font-bold" style={{ color: 'var(--color-gold)' }}>₹{(s.base_price || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
