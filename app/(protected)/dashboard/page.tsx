'use client';

import { useEffect, useState } from 'react';
import { Bell, PackageSearch, ShoppingBag, ChevronDown } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiGet } from '@/lib/api';

type ApiOrder = {
  id?: string;
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
  stock?: number;
  variantStock?: VariantStockItem[];
};

type ApiUser = {
  role?: string;
};

type MetricCard = {
  label: string;
  value: string;
  helper: string;
  gradient: string;
};

type ChartPoint = {
  label: string;
  sales: number;
};

type NewOrderNotification = {
  id: string;
  customerName: string;
  productName: string;
  createdAtLabel: string;
};

type LowStockNotification = {
  id: string;
  productName: string;
  color: string;
  size: string;
  stock: number;
};

type TimePeriod = 'last7days' | 'lastMonth' | 'currentMonth' | 'currentYear' | 'lastYear';

const ORDER_PENDING = new Set(['pending']);
const ORDER_PROCESSING = new Set(['processing']);
const ORDER_SHIPPED = new Set(['shipped']);
const ORDER_DELIVERED = new Set(['delivered']);
const ORDER_CANCELLED = new Set(['cancelled']);
const STAFF_ROLES = new Set(['staff', 'admin', 'manager']);

const numberFormatter = new Intl.NumberFormat('en-US');
const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const normalizeStatus = (value: string | undefined) => String(value || '').trim().toLowerCase();

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

const formatDateLabel = (value: Date) => value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const getDateRangeForPeriod = (period: TimePeriod): { start: Date; end: Date; dayCount: number } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);

  switch (period) {
    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end, dayCount: 7 };
    }
    case 'lastMonth': {
      const start = new Date(today);
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start, end: endOfLastMonth, dayCount: 30 };
    }
    case 'currentMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end, dayCount: 31 };
    }
    case 'currentYear': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start, end, dayCount: 365 };
    }
    case 'lastYear': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const endOfYear = new Date(today.getFullYear() - 1, 11, 31);
      return { start, end: endOfYear, dayCount: 365 };
    }
    default:
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start, end, dayCount: 7 };
  }
};

const buildSalesSeries = (orders: ApiOrder[], period: TimePeriod = 'last7days'): ChartPoint[] => {
  const { start, end, dayCount } = getDateRangeForPeriod(period);

  const dailyMap = new Map<string, number>();
  for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
    const day = new Date(start);
    day.setDate(day.getDate() + offset);
    if (day > end) continue;
    dailyMap.set(formatDateLabel(day), 0);
  }

  orders.forEach((order) => {
    const date = toOrderDate(order);
    if (!date) return;

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    if (day < start || day > end) return;

    const label = formatDateLabel(day);
    if (!dailyMap.has(label)) return;

    const netValue = Math.max(0, getOrderAmount(order) - getRefundAmount(order));
    dailyMap.set(label, (dailyMap.get(label) || 0) + netValue);
  });

  return Array.from(dailyMap.entries()).map(([label, sales]) => ({
    label,
    sales: Math.round(sales),
  }));
};

const getLowStockNotifications = (products: ApiProduct[]): LowStockNotification[] => {
  const alerts: LowStockNotification[] = [];

  products.forEach((product, productIndex) => {
    const productName = String(product.name || `Product ${productIndex + 1}`);
    const variants = Array.isArray(product.variantStock) ? product.variantStock : [];

    variants.forEach((variant, variantIndex) => {
      const stock = toPositiveNumber(variant.stock);
      if (stock >= 5) return;

      alerts.push({
        id: `${product._id || product.id || productIndex}-${variantIndex}`,
        productName,
        color: String(variant.color || 'N/A'),
        size: String(variant.size || 'N/A'),
        stock,
      });
    });
  });

  return alerts.sort((a, b) => a.stock - b.stock);
};

const getNewOrderNotifications = (orders: ApiOrder[]): NewOrderNotification[] => {
  const sorted = [...orders].sort((a, b) => {
    const aDate = toOrderDate(a)?.getTime() || 0;
    const bDate = toOrderDate(b)?.getTime() || 0;
    return bDate - aDate;
  });

  return sorted.slice(0, 8).map((order, index) => {
    const date = toOrderDate(order);

    return {
      id: String(order.id || `NEW-${index + 1}`),
      customerName: String(order.customer || order.name || 'Unknown Customer'),
      productName: String(order.productName || order.product || 'Unknown Product'),
      createdAtLabel: date
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : 'Recently',
    };
  });
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('last7days');
  const [metricCards, setMetricCards] = useState<MetricCard[]>([]);
  const [salesSeries, setSalesSeries] = useState<ChartPoint[]>([]);
  const [newOrderNotifications, setNewOrderNotifications] = useState<NewOrderNotification[]>([]);
  const [lowStockNotifications, setLowStockNotifications] = useState<LowStockNotification[]>([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const [orders, products, users] = await Promise.all([
          apiGet<ApiOrder[]>('/admin/orders'),
          apiGet<ApiProduct[]>('/admin/products'),
          apiGet<ApiUser[]>('/admin/users'),
        ]);

        const safeOrders = Array.isArray(orders) ? orders : [];
        const safeProducts = Array.isArray(products) ? products : [];
        const safeUsers = Array.isArray(users) ? users : [];

        const pendingOrders = safeOrders.filter((order) => ORDER_PENDING.has(normalizeStatus(order.orderStatus || order.status)));
        const processingOrders = safeOrders.filter((order) => ORDER_PROCESSING.has(normalizeStatus(order.orderStatus || order.status)));
        const shippedOrders = safeOrders.filter((order) => ORDER_SHIPPED.has(normalizeStatus(order.orderStatus || order.status)));
        const deliveredOrders = safeOrders.filter((order) => ORDER_DELIVERED.has(normalizeStatus(order.orderStatus || order.status)));
        const cancelledOrders = safeOrders.filter((order) => ORDER_CANCELLED.has(normalizeStatus(order.orderStatus || order.status)));

        const refunds = safeOrders.reduce((sum, order) => sum + getRefundAmount(order), 0);
        const grossSales = safeOrders.reduce((sum, order) => sum + getOrderAmount(order), 0);
        const netSales = Math.max(0, grossSales - refunds);

        const totalCustomers = safeUsers.filter((user) => normalizeStatus(user.role) === 'customer').length;
        const totalStaffUsers = safeUsers.filter((user) => STAFF_ROLES.has(normalizeStatus(user.role))).length;
        const lowStockItems = getLowStockNotifications(safeProducts);

        setMetricCards([
          {
            label: 'Total Orders',
            value: numberFormatter.format(safeOrders.length),
            helper: 'All order records',
            gradient: 'from-teal-900 via-cyan-600 to-teal-900',
          },
          {
            label: 'Total Products',
            value: numberFormatter.format(safeProducts.length),
            helper: 'Catalog products',
            gradient: 'from-teal-900 via-cyan-600 to-teal-900',
          },
          {
            label: 'Total Customers',
            value: numberFormatter.format(totalCustomers),
            helper: 'Registered customers',
            gradient: 'from-teal-900 via-cyan-600 to-teal-900',
          },
          {
            label: 'Total Users (Staff/Admin/Manager)',
            value: numberFormatter.format(totalStaffUsers),
            helper: 'Internal access accounts',
            gradient: 'from-teal-900 via-cyan-600 to-teal-900',
          },
          {
            label: 'Cancelled Orders',
            value: numberFormatter.format(cancelledOrders.length),
            helper: 'Cancelled or refunded',
            gradient: 'from-blue-800 via-cyan-400 to-blue-800',
          },
          {
            label: 'Low Stock Variants',
            value: numberFormatter.format(lowStockItems.length),
            helper: 'Items below 5 units',
            gradient: 'from-blue-800 via-cyan-400 to-blue-800',
          },
          {
            label: 'Refunds',
            value: currencyFormatter.format(refunds),
            helper: 'Returned amount',
            gradient: 'from-blue-800 via-cyan-400 to-blue-800',
          },
          {
            label: 'Total Sales (Net)',
            value: currencyFormatter.format(netSales),
            helper: 'Gross sales other then refunds',
            gradient: 'from-blue-800 via-cyan-400 to-blue-800',
          },
          {
            label: 'Pending Orders',
            value: numberFormatter.format(pendingOrders.length),
            helper: 'Orders waiting to be processed',
            gradient: 'from-cyan-900 via-teal-400 to-cyan-600',
          },
          {
            label: 'Processing Orders',
            value: numberFormatter.format(processingOrders.length),
            helper: 'Orders being prepared',
            gradient: 'from-cyan-900 via-teal-400 to-cyan-600',
          },
          {
            label: 'Shipped Orders',
            value: numberFormatter.format(shippedOrders.length),
            helper: 'Orders in transit',
            gradient: 'from-cyan-900 via-teal-400 to-cyan-600',
          },
          {
            label: 'Delivered Orders',
            value: numberFormatter.format(deliveredOrders.length),
            helper: 'Completed deliveries',
            gradient: 'from-cyan-900 via-teal-400 to-cyan-600',
          },
        ]);

        setSalesSeries(buildSalesSeries(safeOrders, timePeriod));
        setNewOrderNotifications(getNewOrderNotifications(safeOrders));
        setLowStockNotifications(lowStockItems);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [timePeriod]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Track order flow, stock alerts, and sales performance in one view.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl bg-gradient-to-br ${card.gradient} p-4 text-slate-300 shadow-md transition-transform duration-200 hover:-translate-y-0.5`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-300">{card.label}</p>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
              <p className="mt-1 text-xs text-slate-700">{card.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">Sales Analytics</h2>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
          >
            <option value="last7days">Last 7 Days</option>
            <option value="lastMonth">Last Month</option>
            <option value="currentMonth">Current Month</option>
            <option value="currentYear">Current Year</option>
            <option value="lastYear">Last Year</option>
          </select>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={salesSeries} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: any) => {
                  const numValue = Number(value) || 0;
                  return currencyFormatter.format(numValue);
                }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #cbd5e1' }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#0f766e"
                strokeWidth={2.5}
                fill="url(#salesGradient)"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-sky-600" />
            <h3 className="text-base font-semibold text-slate-800">New Orders Notifications</h3>
          </div>

          <div className="relative">
            <div className="max-h-[280px] overflow-y-auto space-y-3 pr-2">
              {newOrderNotifications.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">No new order notifications.</p>
              ) : (
                newOrderNotifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-sm font-semibold text-slate-800">{item.customerName}</p>
                    <p className="text-xs text-slate-600">Product: {item.productName}</p>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">{item.createdAtLabel}</p>
                  </div>
                ))
              )}
            </div>
            {newOrderNotifications.length > 4 && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pt-2 bg-gradient-to-t from-white to-transparent">
                <ChevronDown className="h-5 w-5 text-slate-400 animate-bounce" />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-rose-600" />
            <h3 className="text-base font-semibold text-slate-800">Low Stock Notifications</h3>
          </div>

          <div className="relative">
            <div className="max-h-[280px] overflow-y-auto space-y-3 pr-2">
              {lowStockNotifications.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">No low stock alerts. Inventory levels are healthy.</p>
              ) : (
                lowStockNotifications.map((item) => (
                  <div key={item.id} className="rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-3">
                    <p className="text-sm font-semibold text-slate-800">{item.productName}</p>
                    <p className="text-xs text-slate-600">
                      Variant: {item.color} / {item.size}
                    </p>
                    <p className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                      Only {item.stock} left
                    </p>
                  </div>
                ))
              )}
            </div>
            {lowStockNotifications.length > 4 && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pt-2 bg-gradient-to-t from-white to-transparent">
                <ChevronDown className="h-5 w-5 text-rose-400 animate-bounce" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <ShoppingBag className="h-3.5 w-3.5" />
          <span className="font-semibold">Low stock threshold:</span>
          <span>Any product variant with stock below 5 triggers a notification.</span>
        </div>
      </section>
    </div>
  );
}
