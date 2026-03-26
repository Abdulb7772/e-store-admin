'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

type ApiOrder = {
  id?: string;
  customer?: string;
  name?: string;
  address?: string;
  contactNumber?: string;
  phone?: string;
  email?: string;
  product?: string;
  productName?: string;
  imageUrl?: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity?: number;
  items?: number;
  paid?: boolean;
  paymentStatus?: string;
  status?: string;
  orderStatus?: string;
};

type ApiProduct = {
  _id?: string;
  id?: string | number;
  name: string;
  sku?: string;
  coverImageUrl?: string;
  imageUrl?: string;
};

type OrderRow = {
  id: string;
  customerName: string;
  address: string;
  contactNumber: string;
  email: string;
  productName: string;
  imageUrl: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  paymentStatus: 'Paid' | 'Unpaid';
  orderStatus: string;
};

const ORDER_STATUS_OPTIONS = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const sanitizeName = (value: string) => value.toLowerCase().replace(/\s*x\s*\d+$/i, '').trim();

const parseQuantityFromProductText = (text: string) => {
  const match = text.match(/x\s*(\d+)$/i);
  if (!match) return 1;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const toOrderStatus = (value: string) => {
  const normalized = value.trim();
  const match = ORDER_STATUS_OPTIONS.find((option) => option.toLowerCase() === normalized.toLowerCase());
  return match || 'Pending';
};

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError('');

        const [orderData, productData] = await Promise.all([
          apiGet<ApiOrder[]>('/admin/orders'),
          apiGet<ApiProduct[]>('/admin/products'),
        ]);

        const productMap = new Map<string, { sku: string; imageUrl: string }>();
        productData.forEach((product) => {
          const key = sanitizeName(product.name || '');
          productMap.set(key, {
            sku: product.sku || '-',
            imageUrl: product.coverImageUrl || product.imageUrl || '',
          });
        });

        const normalized = (Array.isArray(orderData) ? orderData : []).map((order, index) => {
          const rawProductName = String(order.productName || order.product || '').trim();
          const quantityFromText = parseQuantityFromProductText(rawProductName);
          const productName = rawProductName.replace(/\s*x\s*\d+$/i, '').trim() || 'Unknown Product';
          const productMatch = productMap.get(sanitizeName(productName));

          const quantity = Number.isFinite(Number(order.quantity))
            ? Math.max(1, Number(order.quantity))
            : Number.isFinite(Number(order.items))
              ? Math.max(1, Number(order.items))
              : quantityFromText;

          const paymentStatus: 'Paid' | 'Unpaid' = typeof order.paid === 'boolean'
            ? order.paid ? 'Paid' : 'Unpaid'
            : String(order.paymentStatus || '').toLowerCase() === 'unpaid'
              ? 'Unpaid'
              : 'Paid';

          const statusValue = order.orderStatus || order.status || 'Pending';

          return {
            id: String(order.id || `ORD-${index + 1}`),
            customerName: String(order.customer || order.name || 'Unknown Customer'),
            address: String(order.address || '-'),
            contactNumber: String(order.contactNumber || order.phone || '-'),
            email: String(order.email || '-'),
            productName,
            imageUrl: order.imageUrl || productMatch?.imageUrl || '',
            sku: order.sku || productMatch?.sku || '-',
            size: String(order.size || '-'),
            color: String(order.color || '-'),
            quantity,
            paymentStatus,
            orderStatus: toOrderStatus(String(statusValue)),
          };
        });

        setOrders(normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
  }, []);

  const totals = useMemo(() => {
    const paid = orders.filter((order) => order.paymentStatus === 'Paid').length;
    const unpaid = orders.length - paid;
    return { paid, unpaid };
  }, [orders]);

  const handleOrderStatusChange = (orderId: string, nextStatus: string) => {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, orderStatus: nextStatus } : order)));
    toast.success(`Order ${orderId} status changed to ${nextStatus}.`);
  };

  if (loading) {
    return <div className="text-sm text-slate-500">Loading orders...</div>;
  }

  if (error) {
    return <div className="text-sm text-rose-600">{error}</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Orders</h1>
        <p className="text-sm text-slate-500 mt-1">Track customer orders and update their status.</p>
      </div>

      <div className="mb-4 flex items-center gap-3 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Total: {orders.length}</span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Paid: {totals.paid}</span>
        <span className="rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700">Unpaid: {totals.unpaid}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1300px] w-full text-sm">
          <thead className="bg-black text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Customer Details</th>
              <th className="px-4 py-3 text-left font-semibold">Product Name</th>
              <th className="px-4 py-3 text-left font-semibold">Image</th>
              <th className="px-4 py-3 text-left font-semibold">SKU</th>
              <th className="px-4 py-3 text-left font-semibold">Size</th>
              <th className="px-4 py-3 text-left font-semibold">Color</th>
              <th className="px-4 py-3 text-left font-semibold">Quantity</th>
              <th className="px-4 py-3 text-left font-semibold">Paid/Unpaid</th>
              <th className="px-4 py-3 text-left font-semibold">Order Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 align-top">
                  <p className="font-semibold text-slate-800">{order.customerName}</p>
                  <p className="text-xs text-slate-600 mt-1">Address: {order.address}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Contact: {order.contactNumber}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Email: {order.email}</p>
                </td>
                <td className="px-4 py-3 text-slate-700 font-medium">{order.productName}</td>
                <td className="px-4 py-3">
                  {order.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={order.imageUrl}
                      alt={order.productName}
                      className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                      <ImageIcon size={16} className="text-slate-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{order.sku}</td>
                <td className="px-4 py-3 text-slate-600">{order.size}</td>
                <td className="px-4 py-3 text-slate-600">{order.color}</td>
                <td className="px-4 py-3 text-slate-700 font-semibold">{order.quantity}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      order.paymentStatus === 'Paid'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={order.orderStatus}
                    onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
