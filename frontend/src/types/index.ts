/* TypeScript interfaces matching the backend schemas */

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'admin' | 'staff';
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginResponse {
  user: User;
  tokens: TokenResponse;
}

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  gender: string | null;
  email: string | null;
  notes: string | null;
  first_visit: string | null;
  last_visit: string | null;
  total_visits: number;
  lifetime_value: number;
  created_at: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  page_size: number;
}

export interface Service {
  id: number;
  name: string;
  category: string | null;
  base_price: number | null;
  duration_minutes: number | null;
  is_active: boolean;
  is_custom: boolean;
  created_at: string;
}

export interface TransactionService {
  id: number;
  service_name: string;
  price: number;
  quantity: number;
}

export interface Transaction {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  staff_id: number | null;
  total_amount: number;
  payment_mode: string;
  raw_input: string | null;
  input_type: string | null;
  notes: string | null;
  service_date: string;
  created_at: string;
  services: TransactionService[];
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  page_size: number;
}

export interface AIExtractedData {
  customer_name: string | null;
  phone: string | null;
  services: string[];
  total_amount: number | null;
  payment_mode: string;
  notes: string | null;
  service_date: string | null;
  confidence: number;
}

export interface SmartEntryResponse {
  extracted: AIExtractedData;
  raw_input: string;
  requires_confirmation: boolean;
}

export interface KPISummary {
  today_revenue: number;
  today_customers: number;
  week_revenue: number;
  month_revenue: number;
  year_revenue: number;
  avg_bill_value: number;
  repeat_customer_rate: number;
  total_customers: number;
}

export interface RevenueTrendItem {
  date: string;
  revenue: number;
  customers: number;
}

export interface ServiceBreakdown {
  service_name: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface PaymentBreakdown {
  mode: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface DashboardData {
  kpi: KPISummary;
  revenue_trend: RevenueTrendItem[];
  top_services: ServiceBreakdown[];
  payment_breakdown: PaymentBreakdown[];
}
