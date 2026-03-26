'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Box,
  ChartNoAxesCombined,
  DollarSign,
  PackageSearch,
  ShoppingCart,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiGet } from '@/lib/api';

type TimePeriod = 'last7days' | 'last30days' | 'currentMonth' | 'currentYear' | 'lastYear';

type ApiOrder = {
  id?: string;
  _id?: string;
  customer?: string;
  name?: string;
  email?: string;
  product?: string;
  productName?: string;
  quantity?: number;
  items?: number;
  status?: string;
  orderStatus?: string;
  paid?: boolean;
  paymentStatus?: string;
  amount?: number;
  totalAmount?: number;
  price?: number;
  unitPrice?: number;
  refundAmount?: number;
  refunded?: boolean;
  createdAt?: string;
};

type VariantStockItem = {
  color?: string;
  size?: string;
  stock?: number;
};

type ApiProduct = {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  subCategory?: string;
  stock?: number;
  price?: number;
  variantStock?: VariantStockItem[];
};

type ApiUser = {
  role?: string;
};

type RevenuePoint = {
  label: string;
  gross: number;
  refunds: number;
  net: number;
};

type MonthRevenuePoint = {
  month: string;
  net: number;
};

type KeyValueDatum = {
  label: string;
  value: number;
};

type TopProductDatum = {
  product: string;
  units: number;
  revenue: number;
};

type MetricCard = {
  label: string;
  value: string;
  helper: string;
  tone: string;
};

const ORDER_PENDING = new Set(['pending']);
const ORDER_PROCESSING = new Set(['processing']);
const ORDER_SHIPPED = new Set(['shipped']);
const ORDER_DELIVERED = new Set(['delivered']);
const ORDER_CANCELLED = new Set(['cancelled']);
const STAFF_ROLES = new Set(['staff', 'admin', 'manager']);

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f59e0b',
  Processing: '#3b82f6',
  Shipped: '#06b6d4',
  Delivered: '#22c55e',
  Cancelled: '#ef4444',
};

const PIE_COLORS = ['#0f766e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];
const WEEKDAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const numberFormatter = new Intl.NumberFormat('en-US');
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const normalizeStatus = (value: string | undefined) => String(value || '').trim().toLowerCase();

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const getOrderQuantity = (order: ApiOrder) => {
  const quantity = toPositiveNumber(order.quantity);
  if (quantity > 0) return quantity;
  const items = toPositiveNumber(order.items);
  return items > 0 ? items : 1;
};

const getOrderAmount = (order: ApiOrder) => {
  const directAmount = toPositiveNumber(order.totalAmount ?? order.amount);
  if (directAmount > 0) return directAmount;

  const price = toPositiveNumber(order.price ?? order.unitPrice);
  const quantity = getOrderQuantity(order);
  return price * quantity;
};

const getRefundAmount = (order: ApiOrder) => {
  const directRefund = toPositiveNumber(order.refundAmount);
  if (directRefund > 0) return directRefund;

  if (order.refunded) {
    return getOrderAmount(order);
  }

  const status = normalizeStatus(order.orderStatus || order.status);
  if (status === 'cancelled' || status === 'refunded') {
    return getOrderAmount(order);
  }

  return 0;
};

const toOrderDate = (order: ApiOrder) => {
  if (!order.createdAt) return null;
  const date = new Date(order.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateRangeForPeriod = (period: TimePeriod): { start: Date; end: Date } => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  switch (period) {
    case 'last7days': {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      return { start, end: today };
    }
    case 'last30days': {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 29);
      return { start, end: today };
    }
    case 'currentMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    }
    case 'currentYear': {
      const start = new Date(today.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    }
    case 'lastYear': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
    default: {
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - 6);
      return { start, end: today };
    }
  }
};

const formatDayLabel = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const inRange = (date: Date, start: Date, end: Date) => date >= start && date <= end;

const valueFormatter = (value: unknown) => {
  const num = Number(value) || 0;
  return currencyFormatter.format(num);
};

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('last30days');
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError('');

        const [ordersData, productsData, usersData] = await Promise.all([
          apiGet<ApiOrder[]>('/admin/orders'),
          apiGet<ApiProduct[]>('/admin/products'),
          apiGet<ApiUser[]>('/admin/users'),
        ]);

        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setProducts(Array.isArray(productsData) ? productsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const analytics = useMemo(() => {
    const { start, end } = getDateRangeForPeriod(timePeriod);

    const filteredOrders = orders.filter((order) => {
      const date = toOrderDate(order);
      return date ? inRange(date, start, end) : false;
    });

    const grossSales = filteredOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
    const refunds = filteredOrders.reduce((sum, order) => sum + getRefundAmount(order), 0);
    const netSales = Math.max(0, grossSales - refunds);

    const totalOrders = filteredOrders.length;
    const totalUnits = filteredOrders.reduce((sum, order) => sum + getOrderQuantity(order), 0);
    const avgOrderValue = totalOrders > 0 ? netSales / totalOrders : 0;

    const pendingCount = filteredOrders.filter((o) => ORDER_PENDING.has(normalizeStatus(o.orderStatus || o.status))).length;
    const processingCount = filteredOrders.filter((o) => ORDER_PROCESSING.has(normalizeStatus(o.orderStatus || o.status))).length;
    const shippedCount = filteredOrders.filter((o) => ORDER_SHIPPED.has(normalizeStatus(o.orderStatus || o.status))).length;
    const deliveredCount = filteredOrders.filter((o) => ORDER_DELIVERED.has(normalizeStatus(o.orderStatus || o.status))).length;
    const cancelledCount = filteredOrders.filter((o) => ORDER_CANCELLED.has(normalizeStatus(o.orderStatus || o.status))).length;

    const completionRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

    const metrics: MetricCard[] = [
      {
        label: 'Net Revenue',
        value: currencyFormatter.format(netSales),
        helper: 'Gross sales minus refunds',
        tone: 'from-teal-800 to-cyan-600',
      },
      {
        label: 'Gross Revenue',
        value: currencyFormatter.format(grossSales),
        helper: 'Before any refunds',
        tone: 'from-cyan-800 to-sky-600',
      },
      {
        label: 'Refunds',
        value: currencyFormatter.format(refunds),
        helper: 'Returned/cancelled value',
        tone: 'from-rose-800 to-red-500',
      },
      {
        label: 'Orders',
        value: numberFormatter.format(totalOrders),
        helper: 'Orders in selected range',
        tone: 'from-slate-800 to-slate-600',
      },
      {
        label: 'Units Sold',
        value: numberFormatter.format(totalUnits),
        helper: 'Total quantity sold',
        tone: 'from-indigo-800 to-blue-600',
      },
      {
        label: 'Average Order Value',
        value: currencyFormatter.format(avgOrderValue),
        helper: 'Net revenue / total orders',
        tone: 'from-emerald-800 to-green-600',
      },
      {
        label: 'Completion Rate',
        value: `${completionRate.toFixed(1)}%`,
        helper: 'Delivered orders ratio',
        tone: 'from-lime-700 to-green-500',
      },
      {
        label: 'Cancellation Rate',
        value: `${cancellationRate.toFixed(1)}%`,
        helper: 'Cancelled orders ratio',
        tone: 'from-orange-700 to-red-500',
      },
    ];

    const revenueByDayMap = new Map<number, { label: string; gross: number; refunds: number; net: number }>();

    filteredOrders.forEach((order) => {
      const date = toOrderDate(order);
      if (!date) return;
      const day = new Date(date);
      day.setHours(0, 0, 0, 0);
      const key = day.getTime();
      const label = formatDayLabel(day);

      const gross = getOrderAmount(order);
      const refund = getRefundAmount(order);
      const net = Math.max(0, gross - refund);
      const current = revenueByDayMap.get(key) || { label, gross: 0, refunds: 0, net: 0 };

      revenueByDayMap.set(key, {
        label,
        gross: current.gross + gross,
        refunds: current.refunds + refund,
        net: current.net + net,
      });
    });

    const revenueSeries: RevenuePoint[] = Array.from(revenueByDayMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => ({
        label: value.label,
        gross: Math.round(value.gross),
        refunds: Math.round(value.refunds),
        net: Math.round(value.net),
      }));

    const statusSeries: KeyValueDatum[] = [
      { label: 'Pending', value: pendingCount },
      { label: 'Processing', value: processingCount },
      { label: 'Shipped', value: shippedCount },
      { label: 'Delivered', value: deliveredCount },
      { label: 'Cancelled', value: cancelledCount },
    ];

    const weekdayRevenue = new Map<string, number>(WEEKDAY_ORDER.map((day) => [day, 0]));
    filteredOrders.forEach((order) => {
      const date = toOrderDate(order);
      if (!date) return;
      const day = WEEKDAY_ORDER[date.getDay()];
      const amount = Math.max(0, getOrderAmount(order) - getRefundAmount(order));
      weekdayRevenue.set(day, (weekdayRevenue.get(day) || 0) + amount);
    });

    const weekdaySeries: KeyValueDatum[] = WEEKDAY_ORDER.map((day) => ({
      label: day,
      value: Math.round(weekdayRevenue.get(day) || 0),
    }));

    const monthRevenueMap = new Map<string, number>([
      ['Jan', 0],
      ['Feb', 0],
      ['Mar', 0],
      ['Apr', 0],
      ['May', 0],
      ['Jun', 0],
      ['Jul', 0],
      ['Aug', 0],
      ['Sep', 0],
      ['Oct', 0],
      ['Nov', 0],
      ['Dec', 0],
    ]);

    filteredOrders.forEach((order) => {
      const date = toOrderDate(order);
      if (!date) return;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      const net = Math.max(0, getOrderAmount(order) - getRefundAmount(order));
      monthRevenueMap.set(monthLabel, (monthRevenueMap.get(monthLabel) || 0) + net);
    });

    const monthSeries: MonthRevenuePoint[] = Array.from(monthRevenueMap.entries()).map(([month, value]) => ({
      month,
      net: Math.round(value),
    }));

    const productPerformanceMap = new Map<string, { units: number; revenue: number }>();
    filteredOrders.forEach((order) => {
      const productName = String(order.productName || order.product || 'Unknown Product');
      const units = getOrderQuantity(order);
      const revenue = Math.max(0, getOrderAmount(order) - getRefundAmount(order));
      const current = productPerformanceMap.get(productName) || { units: 0, revenue: 0 };

      productPerformanceMap.set(productName, {
        units: current.units + units,
        revenue: current.revenue + revenue,
      });
    });

    const topProducts: TopProductDatum[] = Array.from(productPerformanceMap.entries())
      .map(([product, value]) => ({ product, units: value.units, revenue: Math.round(value.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 7);

    const categoryMap = new Map<string, number>();
    products.forEach((product) => {
      const category = String(product.category || 'Uncategorized');
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    const categorySeries: KeyValueDatum[] = Array.from(categoryMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const customerCount = users.filter((user) => normalizeStatus(user.role) === 'customer').length;
    const staffCount = users.filter((user) => STAFF_ROLES.has(normalizeStatus(user.role))).length;
    const otherUsers = Math.max(0, users.length - customerCount - staffCount);

    const userRoleSeries: KeyValueDatum[] = [
      { label: 'Customers', value: customerCount },
      { label: 'Staff/Admin', value: staffCount },
      { label: 'Other Roles', value: otherUsers },
    ];

    let criticalStock = 0;
    let lowStock = 0;
    let healthyStock = 0;

    products.forEach((product) => {
      const variants = Array.isArray(product.variantStock) ? product.variantStock : [];

      if (variants.length > 0) {
        variants.forEach((variant) => {
          const stock = toPositiveNumber(variant.stock);
          if (stock <= 2) criticalStock += 1;
          else if (stock <= 5) lowStock += 1;
          else healthyStock += 1;
        });
        return;
      }

      const stock = toPositiveNumber(product.stock);
      if (stock <= 2) criticalStock += 1;
      else if (stock <= 5) lowStock += 1;
      else healthyStock += 1;
    });

    const inventoryHealthSeries: KeyValueDatum[] = [
      { label: 'Critical (0-2)', value: criticalStock },
      { label: 'Low (3-5)', value: lowStock },
      { label: 'Healthy (6+)', value: healthyStock },
    ];

    const topInsights = [
      `Top period status: ${[...statusSeries].sort((a, b) => b.value - a.value)[0]?.label || 'N/A'}`,
      `Best weekday revenue: ${[...weekdaySeries].sort((a, b) => b.value - a.value)[0]?.label || 'N/A'}`,
      `Highest earning product: ${topProducts[0]?.product || 'N/A'}`,
      `Critical stock variants: ${numberFormatter.format(criticalStock)}`,
    ];

    return {
      metrics,
      revenueSeries,
      statusSeries,
      weekdaySeries,
      monthSeries,
      topProducts,
      categorySeries,
      userRoleSeries,
      inventoryHealthSeries,
      topInsights,
      totals: {
        orders: totalOrders,
        delivered: deliveredCount,
        cancelled: cancelledCount,
      },
    };
  }, [orders, products, users, timePeriod]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading analytics dashboard...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Complete Analytics</h1>
            <p className="mt-1 text-sm text-slate-500">
              Revenue, order quality, inventory health, product performance, and user distribution in one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-4 w-4 text-slate-500" />
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
            >
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="currentMonth">Current Month</option>
              <option value="currentYear">Current Year</option>
              <option value="lastYear">Last Year</option>
            </select>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {analytics.metrics.map((card) => (
            <div key={card.label} className={`rounded-xl bg-gradient-to-br ${card.tone} p-4 text-white shadow-sm`}>
              <p className="text-xs uppercase tracking-wide text-white/80">{card.label}</p>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-white/80">{card.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Revenue Trend (Gross vs Net vs Refunds)</h2>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grossGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={valueFormatter} contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }} />
                <Legend />
                <Area type="monotone" dataKey="gross" stroke="#0284c7" fill="url(#grossGradient)" strokeWidth={2} />
                <Area type="monotone" dataKey="net" stroke="#0f766e" fill="url(#netGradient)" strokeWidth={2.4} />
                <Line type="monotone" dataKey="refunds" stroke="#ef4444" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Order Status Breakdown</h2>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.statusSeries}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="48%"
                  outerRadius={98}
                  innerRadius={55}
                  label
                >
                  {analytics.statusSeries.map((entry) => (
                    <Cell key={entry.label} fill={STATUS_COLORS[entry.label] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => numberFormatter.format(Number(value) || 0)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Revenue by Weekday</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.weekdaySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={valueFormatter} />
                <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Monthly Net Revenue</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={valueFormatter} />
                <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2.5} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Top-Selling Products (By Net Revenue)</h2>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.topProducts} layout="vertical" margin={{ top: 8, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="product" tick={{ fill: '#475569', fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                <Tooltip formatter={valueFormatter} />
                <Bar dataKey="revenue" fill="#0891b2" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Catalog by Category</h2>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.categorySeries} dataKey="value" nameKey="label" cx="50%" cy="48%" outerRadius={102} label>
                  {analytics.categorySeries.map((entry, index) => (
                    <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => numberFormatter.format(Number(value) || 0)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">User Segments</h2>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.userRoleSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => numberFormatter.format(Number(value) || 0)} />
                <Bar dataKey="value" fill="#334155" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Inventory Health</h2>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.inventoryHealthSeries} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={96} label>
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#22c55e" />
                </Pie>
                <Tooltip formatter={(value) => numberFormatter.format(Number(value) || 0)} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Actionable Insights</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-700">
                <DollarSign className="h-4 w-4" />
                <p className="text-sm font-semibold">Revenue Snapshot</p>
              </div>
              <p className="text-xs text-slate-600">{analytics.topInsights[1]}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-700">
                <ShoppingCart className="h-4 w-4" />
                <p className="text-sm font-semibold">Order Health</p>
              </div>
              <p className="text-xs text-slate-600">{analytics.topInsights[0]}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-700">
                <PackageSearch className="h-4 w-4" />
                <p className="text-sm font-semibold">Product Performance</p>
              </div>
              <p className="text-xs text-slate-600">{analytics.topInsights[2]}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 flex items-center gap-2 text-slate-700">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-semibold">Inventory Risk</p>
              </div>
              <p className="text-xs text-slate-600">{analytics.topInsights[3]}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-slate-800">Period Summary</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-600">Orders</span>
              <span className="font-semibold text-slate-800">{numberFormatter.format(analytics.totals.orders)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-600">Delivered</span>
              <span className="font-semibold text-emerald-700">{numberFormatter.format(analytics.totals.delivered)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-600">Cancelled</span>
              <span className="font-semibold text-rose-700">{numberFormatter.format(analytics.totals.cancelled)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-600">Catalog Size</span>
              <span className="font-semibold text-slate-800">{numberFormatter.format(products.length)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-sm text-slate-600">User Base</span>
              <span className="font-semibold text-slate-800">{numberFormatter.format(users.length)}</span>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <div className="mb-1 flex items-center gap-2 font-semibold text-slate-700">
              <Users className="h-4 w-4" />
              Total platform visibility
            </div>
            All analytics are generated from live admin endpoints for orders, products, and users.
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Box className="h-3.5 w-3.5" />
          <span className="font-semibold">Inventory thresholds:</span>
          <span>Critical: 0-2 units, Low: 3-5 units, Healthy: 6+ units.</span>
        </div>
      </section>
    </div>
  );
}

export default AnalyticsPage;
