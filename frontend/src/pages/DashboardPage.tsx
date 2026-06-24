import { useEffect, useState } from 'react';
import {
  IndianRupee, Users, TrendingUp, CreditCard,
  CalendarDays, Repeat, Sparkles, RefreshCw, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import type { DashboardData } from '../types';
import { toast } from '../components/common/Toast';

const GOLD = '#D4A017';
const CHART_COLORS = [
  '#D4A017', // Gold
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#D946EF', // Fuchsia
  '#84CC16', // Lime
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<string[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsGenAt, setInsightsGenAt] = useState<string | null>(null);

  const fetchDashboardData = () => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/transactions', { params: { page: 1, page_size: 5 } }),
      api.get('/insights/latest')
    ])
      .then(([dashRes, txRes, insightsRes]) => {
        setData(dashRes.data);
        setRecentTx(txRes.data.transactions || []);
        if (insightsRes.data.insights?.length) {
          // Filter out error strings from showing in insights state
          const cleanInsights = insightsRes.data.insights.filter(
            (ins: string) => !ins.toLowerCase().includes("unable to generate") && !ins.toLowerCase().includes("failed")
          );
          setInsights(cleanInsights);
          setInsightsGenAt(insightsRes.data.generated_at);
        }
      })
      .catch(() => toast('error', 'Failed to load dashboard data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const generateInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await api.get('/insights/generate');
      if (res.data && res.data.insights) {
        // Filter errors
        const cleanInsights = res.data.insights.filter(
          (ins: string) => !ins.toLowerCase().includes("unable to generate") && !ins.toLowerCase().includes("failed")
        );
        if (cleanInsights.length === 0) {
          throw new Error("Invalid insights returned");
        }
        setInsights(cleanInsights);
        setInsightsGenAt(res.data.generated_at);
        toast('success', 'AI insights generated!');
      } else {
        throw new Error("No data");
      }
    } catch {
      toast('error', 'AI insights unavailable right now. Try again later.');
    } finally {
      setInsightsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A017]" />
      </div>
    );
  }

  const kpi = data?.kpi;
  const todayRevChange = kpi?.today_revenue_change_pct ?? 0;
  const todayCustChange = kpi?.today_customers_change ?? 0;
  const weekRevChange = kpi?.week_revenue_change_pct ?? 0;
  const monthRevChange = kpi?.month_revenue_change_pct ?? 0;
  const repeatRate = kpi?.repeat_customer_rate ?? 0;

  const kpiCards = [
    {
      label: "Today's Revenue",
      value: `₹${(kpi?.today_revenue || 0).toLocaleString('en-IN')}`,
      icon: IndianRupee,
      trend: todayRevChange >= 0 ? `+${todayRevChange}%` : `${todayRevChange}%`,
      trendLabel: "vs yesterday",
      trendColor: todayRevChange > 0 ? 'var(--success)' : todayRevChange < 0 ? '#EF4444' : 'var(--text-secondary)'
    },
    {
      label: "Today's Customers",
      value: kpi?.today_customers || 0,
      icon: Users,
      trend: todayCustChange >= 0 ? `+${todayCustChange}` : `${todayCustChange}`,
      trendLabel: "vs yesterday",
      trendColor: todayCustChange > 0 ? 'var(--success)' : todayCustChange < 0 ? '#EF4444' : 'var(--text-secondary)'
    },
    {
      label: "Monthly Revenue",
      value: `₹${(kpi?.month_revenue || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      trend: monthRevChange >= 0 ? `+${monthRevChange}%` : `${monthRevChange}%`,
      trendLabel: "MoM growth",
      trendColor: monthRevChange > 0 ? 'var(--success)' : monthRevChange < 0 ? '#EF4444' : 'var(--text-secondary)'
    },
    {
      label: "Avg Bill Value",
      value: `₹${(kpi?.avg_bill_value || 0).toLocaleString('en-IN')}`,
      icon: CreditCard,
      trend: `₹${(kpi?.avg_bill_value || 0).toLocaleString('en-IN')}`,
      trendLabel: "avg per client",
      trendColor: (kpi?.avg_bill_value || 0) > 0 ? 'var(--success)' : 'var(--text-secondary)'
    },
    {
      label: "Weekly Revenue",
      value: `₹${(kpi?.week_revenue || 0).toLocaleString('en-IN')}`,
      icon: CalendarDays,
      trend: weekRevChange >= 0 ? `+${weekRevChange}%` : `${weekRevChange}%`,
      trendLabel: "vs last week",
      trendColor: weekRevChange > 0 ? 'var(--success)' : weekRevChange < 0 ? '#EF4444' : 'var(--text-secondary)'
    },
    {
      label: "Repeat Rate",
      value: `${repeatRate}%`,
      icon: Repeat,
      trend: repeatRate > 50 ? "High" : repeatRate > 25 ? "Healthy" : repeatRate > 0 ? "Moderate" : "0%",
      trendLabel: repeatRate > 0 ? "retention" : "no repeats yet",
      trendColor: repeatRate > 25 ? 'var(--success)' : repeatRate > 0 ? '#F59E0B' : 'var(--text-secondary)'
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12 w-full max-w-full">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard Summary</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Real-time business performance analytics and AI reports</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        {kpiCards.map((card, i) => (
          <div
            key={i}
            className="card flex flex-row lg:flex-col justify-between items-center lg:items-stretch h-14 lg:h-auto p-3 lg:p-5"
          >
            <div className="flex lg:flex-row flex-col justify-between lg:items-start w-full">
              <span className="text-[10px] lg:text-[11px] font-medium tracking-[0.08em] uppercase text-[#6b7280] truncate">
                {card.label}
              </span>
              <card.icon className="hidden lg:block w-5 h-5 text-[#D4A017] flex-shrink-0" />
            </div>
            <div className="mt-0 lg:mt-2">
              <span className="text-[16px] lg:text-[28px] font-bold text-[#D4A017] leading-none">
                {card.value}
              </span>
            </div>
            <div className="hidden lg:block text-[11px] text-[var(--text-secondary)] mt-2 border-t border-[rgba(255,255,255,0.05)] pt-2 w-full truncate">
              <span className="font-semibold mr-1" style={{ color: card.trendColor }}>{card.trend}</span>
              <span>{card.trendLabel}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section: Revenue Trend & Services Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        {/* Revenue Trend Area Chart */}
        <div className="flex flex-col bg-[#1a1f2e] border border-[rgba(212,160,23,0.15)] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Revenue Trend (30 Days)</h3>
            <p className="text-xs text-[var(--text-secondary)]">Daily business billing performance logs</p>
          </div>
          <div className="w-full h-[200px] lg:h-[280px]">
            <ResponsiveContainer width="99%" height="100%">
              <AreaChart data={data?.revenue_trend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#FFF' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                  formatter={(val: any) => [`₹${(val || 0).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke={GOLD} fill="url(#goldGrad)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Services Donut Chart */}
        <div className="flex flex-col bg-[#1a1f2e] border border-[rgba(212,160,23,0.15)] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Services Donut</h3>
            <p className="text-xs text-[var(--text-secondary)]">Revenue contribution by salon service</p>
          </div>
          <div className="w-full h-[260px] lg:h-[300px] flex items-center justify-between gap-4 overflow-hidden relative">
            {(data?.top_services || []).length > 0 ? (
              <>
                <div className="w-[120px] sm:w-[150px] lg:w-[180px] h-full flex-shrink-0">
                  <ResponsiveContainer width="99%" height="100%">
                    <PieChart>
                      <Pie
                        data={data?.top_services}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        dataKey="revenue"
                        nameKey="service_name"
                        paddingAngle={3}
                      >
                        {(data?.top_services || []).map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#FFF' }}
                        formatter={(val: any) => [`₹${(val || 0).toLocaleString('en-IN')}`, 'Revenue']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Scrollable vertical legend */}
                <div className="flex-1 flex flex-col justify-start gap-2 overflow-y-auto max-h-full pr-2 scrollbar-thin">
                  {(data?.top_services || []).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-[rgba(255,255,255,0.03)] last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-[var(--text-primary)] font-medium truncate" title={item.service_name}>
                          {item.service_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[var(--text-secondary)] font-semibold flex-shrink-0">
                        <span>{item.percentage}%</span>
                        <span className="text-[9px] text-[#6b7280]">({`₹${(item.revenue || 0).toLocaleString('en-IN')}`})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <span className="text-xs text-[var(--text-secondary)]">No service data available</span>
            )}
          </div>
        </div>
      </div>

      {/* Bar Chart: Last 30 Days Bar Chart */}
      <div className="flex flex-col bg-[#1a1f2e] border border-[rgba(212,160,23,0.15)] rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] w-full">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Last 30 Days Bar Chart</h3>
          <p className="text-xs text-[var(--text-secondary)]">Daily revenue fluctuations</p>
        </div>
        <div className="w-full h-[200px] lg:h-[260px]">
          {(data?.revenue_trend || []).length > 0 ? (
            <ResponsiveContainer width="99%" height="100%">
              <BarChart data={data?.revenue_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '11px', color: '#FFF' }}
                  formatter={(val: any) => [`₹${(val || 0).toLocaleString('en-IN')}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill={GOLD} radius={[4, 4, 0, 0]} barSize={12}>
                  {(data?.revenue_trend || []).map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-center py-10 text-[var(--text-secondary)]">No trend data available</p>
          )}
        </div>
      </div>

      {/* Bottom Grid: Payment Split | Monthly Trend | Live Client Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Column 1: Payment Split */}
        <div className="flex flex-col bg-[#1a1f2e] border border-[rgba(212,160,23,0.15)] rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] h-[220px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Payment Split</h3>
          <div className="flex-1 flex items-center justify-between gap-4 overflow-hidden">
            <div className="w-[100px] h-[100px]">
              {(data?.payment_breakdown || []).length > 0 ? (
                <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                    <Pie data={data?.payment_breakdown} cx="50%" cy="50%" innerRadius={24} outerRadius={40} dataKey="amount" nameKey="mode">
                      {(data?.payment_breakdown || []).map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">No data</div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-center gap-1.5 overflow-y-auto max-h-full">
              {(data?.payment_breakdown || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="capitalize text-[var(--text-primary)] font-medium truncate">{item.mode}</span>
                  </div>
                  <span className="text-[var(--text-secondary)] font-semibold">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Monthly Trend */}
        <div className="flex flex-col bg-[#1a1f2e] border border-[rgba(212,160,23,0.15)] rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] h-[220px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Monthly Trend</h3>
          <div className="flex-1 flex flex-col justify-between py-2">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-2">
              <span className="text-xs text-[var(--text-secondary)]">This Month Revenue</span>
              <span className="text-sm font-bold text-[#D4A017]">₹{(kpi?.month_revenue || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] py-2">
              <span className="text-xs text-[var(--text-secondary)]">Avg Client Ticket</span>
              <span className="text-sm font-bold text-[var(--success)]">₹{(kpi?.avg_bill_value || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-[var(--text-secondary)]">Repeat Customers</span>
              <span className="text-sm font-bold text-[#3B82F6]">{kpi?.repeat_customer_rate}%</span>
            </div>
          </div>
        </div>

        {/* Column 3: Live Client Feed (Today) */}
        <div className="flex flex-col bg-[#1a1f2e] border border-[rgba(212,160,23,0.15)] rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] lg:h-[220px] overflow-hidden">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Live Client Feed</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {recentTx.length > 0 ? (
              recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)]">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate">{tx.customer_name || 'Walk-in Customer'}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">
                      {tx.services.map((s: any) => s.service_name).join(', ')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[#D4A017]">₹{tx.total_amount}</p>
                    <p className="text-[9px] text-[var(--text-secondary)]">{tx.payment_mode.toUpperCase()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[var(--text-secondary)] py-4">No recent bookings</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="card p-5 border-l-4 border-l-[#D4A017] w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-[var(--text-primary)]">
            <Sparkles className="w-4 h-4 text-[#D4A017]" />
            AI Business Insights
          </h3>
          <div className="flex items-center gap-2">
            {insights.length > 0 && (
              <button
                onClick={() => setInsights([])}
                className="px-2.5 py-1.5 rounded-lg text-[11px] transition-colors hover:bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] cursor-pointer"
              >
                Clear Insights
              </button>
            )}
            <button
              onClick={generateInsights}
              disabled={insightsLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 cursor-pointer text-black gold-gradient"
            >
              {insightsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{insightsLoading ? 'Analyzing...' : 'Generate Insights'}</span>
            </button>
          </div>
        </div>
        {insights.length > 0 ? (
          <div className="space-y-2.5">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.02)]">
                <span className="text-sm mt-0.5">💡</span>
                <p className="text-xs leading-relaxed text-[var(--text-primary)]">{insight}</p>
              </div>
            ))}
            {insightsGenAt && (
              <p className="text-[9px] text-right text-[var(--text-secondary)]">
                Generated: {new Date(insightsGenAt).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-center py-8 text-[var(--text-secondary)]">
            Tap the button to run the AI analyzer on top of client LTV, trends, and payment modes.
          </p>
        )}
      </div>
    </div>
  );
}
