'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';

type DeclinedOrder = {
  id?: string;
  orderNumber?: string;
  customer?: string;
  address?: string;
  email?: string;
  contactNumber?: string;
  productName?: string;
  imageUrl?: string;
  sku?: string;
  size?: string;
  color?: string;
  quantity?: number;
  declineReason?: string;
  declinedAt?: string;
};

type DeclinedOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string;
  email: string;
  contactNumber: string;
  productName: string;
  imageUrl: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  declineReason: string;
  declinedAt: string;
};

export default function RejectedOrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<DeclinedOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadDeclinedOrders = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await apiGet<DeclinedOrder[]>('/admin/orders/declined');

        const normalized = (Array.isArray(data) ? data : []).map((order) => {
          return {
            id: String(order.id || ''),
            orderNumber: String(order.orderNumber || '-'),
            customerName: String(order.customer || 'Unknown Customer'),
            address: String(order.address || '-'),
            email: String(order.email || '-'),
            contactNumber: String(order.contactNumber || '-'),
            productName: String(order.productName || 'Unknown Product'),
            imageUrl: String(order.imageUrl || ''),
            sku: String(order.sku || '-'),
            size: String(order.size || '-'),
            color: String(order.color || '-'),
            quantity: Number.isFinite(Number(order.quantity)) ? Math.max(1, Number(order.quantity)) : 1,
            declineReason: String(order.declineReason || '-'),
            declinedAt: order.declinedAt || '',
          };
        });

        setOrders(normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load declined orders');
        toast.error(e instanceof Error ? e.message : 'Failed to load declined orders');
      } finally {
        setLoading(false);
      }
    };

    void loadDeclinedOrders();
  }, [toast]);

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

  if (loading) {
    return <div className="text-sm text-slate-500">Loading rejected orders...</div>;
  }

  if (error) {
    return <div className="text-sm text-rose-600">{error}</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Rejected Orders</h1>
        <p className="text-sm text-slate-500 mt-1">View all orders that have been declined.</p>
      </div>

      <div className="mb-4">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-xs text-slate-600">
          Total Rejected: {orders.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-black text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Order Number</th>
              <th className="px-4 py-3 text-left font-semibold">Customer Name</th>
              <th className="px-4 py-3 text-left font-semibold">Address</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Contact</th>
              <th className="px-4 py-3 text-left font-semibold">Product</th>
              <th className="px-4 py-3 text-left font-semibold">Image</th>
              <th className="px-4 py-3 text-left font-semibold">Size</th>
              <th className="px-4 py-3 text-left font-semibold">Color</th>
              <th className="px-4 py-3 text-left font-semibold">Quantity</th>
              <th className="px-4 py-3 text-left font-semibold">Decline Reason</th>
              <th className="px-4 py-3 text-left font-semibold">Declined At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-500">
                  No rejected orders found.
                </td>
              </tr>
            ) : (
              paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-700 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{order.customerName}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{order.address}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{order.email}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{order.contactNumber}</td>
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
                  <td className="px-4 py-3 text-slate-600">{order.size}</td>
                  <td className="px-4 py-3 text-slate-600">{order.color}</td>
                  <td className="px-4 py-3 text-slate-700 font-semibold">{order.quantity}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-xs">{order.declineReason}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {new Date(order.declinedAt).toLocaleDateString()}
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
    </div>
  );
}
