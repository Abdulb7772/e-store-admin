'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
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
  const [decliningOrderId, setDecliningOrderId] = useState<string | null>(null);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [confirmDeclineOrderId, setConfirmDeclineOrderId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const totalItems = orders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return orders.slice(start, start + itemsPerPage);
  }, [orders, currentPage, itemsPerPage]);

  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const pageEnd = Math.min(currentPage * itemsPerPage, totalItems);

  const handleOrderStatusChange = (orderId: string, nextStatus: string) => {
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, orderStatus: nextStatus } : order)));
    toast.success(`Order ${orderId} status changed to ${nextStatus}.`);
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      setApprovingOrderId(orderId);
      const response = await apiPost<{ orderId: string; status: string }, Record<string, never>>(
        `/admin/orders/${orderId}/approve`,
        {},
      );

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                orderStatus: toOrderStatus(String(response.status || 'Processing')),
              }
            : order,
        ),
      );

      toast.success(`Order ${orderId} approved.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve order.');
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleDeclineOrder = async (orderId: string) => {
    try {
      setDecliningOrderId(orderId);
      await apiPost<{ orderId: string; declinedOrderId: string }, { reason?: string }>(
        `/admin/orders/${orderId}/decline`,
        {
          reason: declineReason.trim(),
        },
      );

      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setConfirmDeclineOrderId(null);
      setDeclineReason('');
      toast.success(`Order ${orderId} declined.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to decline order.');
    } finally {
      setDecliningOrderId(null);
    }
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
              <th className="px-4 py-3 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => (
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
                  {(() => {
                    const isStatusLocked = ['Pending', 'Delivered', 'Cancelled'].includes(order.orderStatus);

                    return (
                  <select
                    value={order.orderStatus}
                    onChange={(e) => handleOrderStatusChange(order.id, e.target.value)}
                    disabled={isStatusLocked}
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void handleApproveOrder(order.id);
                      }}
                      disabled={
                        approvingOrderId === order.id
                        || decliningOrderId === order.id
                        || order.orderStatus !== 'Pending'
                      }
                      className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {approvingOrderId === order.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeclineReason('');
                        setConfirmDeclineOrderId(order.id);
                      }}
                      disabled={
                        decliningOrderId === order.id
                        || approvingOrderId === order.id
                        || order.orderStatus !== 'Pending'
                      }
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {decliningOrderId === order.id ? 'Declining...' : 'Decline'}
                    </button>
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Showing {pageStart}-{pageEnd} of {totalItems}
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor="orders-per-page" className="text-xs font-medium text-slate-600">
            Per page
          </label>
          <select
            id="orders-per-page"
            value={itemsPerPage}
            onChange={(e) => {
              const value = Number(e.target.value);
              setItemsPerPage(Number.isFinite(value) && value > 0 ? value : 10);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
          >
            {[5, 10, 20, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>

          <div className="ml-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-2 text-xs text-slate-600">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {confirmDeclineOrderId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <p className="text-sm font-semibold text-slate-900">Decline this order?</p>
            <p className="mt-2 text-sm text-slate-600">This order will be removed from active orders and moved to declined orders.</p>
            <div className="mt-3">
              <label htmlFor="decline-reason" className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for decline
              </label>
              <textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="Write reason to show user..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeclineOrderId(null)}
                disabled={decliningOrderId === confirmDeclineOrderId}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDeclineOrder(confirmDeclineOrderId);
                }}
                disabled={decliningOrderId === confirmDeclineOrderId || !declineReason.trim()}
                className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {decliningOrderId === confirmDeclineOrderId ? 'Declining...' : 'Yes, Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
