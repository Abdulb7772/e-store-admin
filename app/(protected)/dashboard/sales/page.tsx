'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { apiGet } from '@/lib/api';

type ApiOrderLineItem = {
  productId?: string;
  productName?: string;
  name?: string;
  imageUrl?: string;
  sku?: string;
  quantity?: number;
  items?: number;
  price?: number;
  unitPrice?: number;
  totalAmount?: number;
  amount?: number;
};

type ApiOrder = {
  id?: string;
  productId?: string;
  product?: string;
  productName?: string;
  imageUrl?: string;
  sku?: string;
  quantity?: number;
  items?: number;
  price?: number;
  unitPrice?: number;
  totalAmount?: number;
  amount?: number;
  status?: string;
  orderStatus?: string;
  lineItems?: ApiOrderLineItem[];
  products?: ApiOrderLineItem[];
};

type ApiProduct = {
  _id?: string;
  id?: string | number;
  name: string;
  sku?: string;
  category?: string;
  price?: number;
  coverImageUrl?: string;
  imageUrl?: string;
};

type ProductSales = {
  productKey: string;
  productName: string;
  imageUrl: string;
  price: number;
  unitsSold: number;
  totalAmount: number;
};

type CategorySalesGroup = {
  category: string;
  rows: ProductSales[];
  categoryUnits: number;
  categoryTotal: number;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const toPositiveNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
};

const sanitizeName = (value: string) => value.toLowerCase().replace(/\s*x\s*\d+$/i, '').trim();

const parseQuantityFromProductText = (text: string): number => {
  const match = text.match(/x\s*(\d+)$/i);
  if (!match) return 1;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const isCancelledOrder = (order: ApiOrder) => {
  const status = String(order.orderStatus || order.status || '').trim().toLowerCase();
  return status === 'cancelled' || status === 'refunded';
};

export default function SalesPage() {
  const [rows, setRows] = useState<CategorySalesGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSales = async () => {
      try {
        setLoading(true);
        setError('');

        const [orderData, productData] = await Promise.all([
          apiGet<ApiOrder[]>('/admin/orders'),
          apiGet<ApiProduct[]>('/admin/products'),
        ]);

        const products = Array.isArray(productData) ? productData : [];
        const orders = Array.isArray(orderData) ? orderData : [];

        const productsById = new Map<string, ApiProduct>();
        const productsBySku = new Map<string, ApiProduct>();
        const productsByName = new Map<string, ApiProduct>();

        products.forEach((product) => {
          const productId = String(product._id || product.id || '').trim();
          const sku = String(product.sku || '').trim().toLowerCase();
          const keyName = sanitizeName(String(product.name || ''));

          if (productId) productsById.set(productId, product);
          if (sku) productsBySku.set(sku, product);
          if (keyName) productsByName.set(keyName, product);
        });

        const productSalesMap = new Map<string, ProductSales & { category: string }>();

        const appendRow = (input: {
          productId?: string;
          sku?: string;
          name?: string;
          imageUrl?: string;
          quantity?: number;
          price?: number;
          unitPrice?: number;
          amount?: number;
          totalAmount?: number;
        }) => {
          const rawName = String(input.name || '').trim();
          const cleanName = rawName.replace(/\s*x\s*\d+$/i, '').trim();
          const quantityFromName = parseQuantityFromProductText(rawName);

          const product =
            productsById.get(String(input.productId || '').trim()) ||
            productsBySku.get(String(input.sku || '').trim().toLowerCase()) ||
            productsByName.get(sanitizeName(cleanName));

          const productKey = String(product?._id || product?.id || '').trim() || sanitizeName(cleanName || 'unknown-product');
          const productName = cleanName || product?.name || 'Unknown Product';
          const imageUrl = String(input.imageUrl || product?.coverImageUrl || product?.imageUrl || '').trim();
          const category = String(product?.category || 'Uncategorized').trim() || 'Uncategorized';

          const directQuantity = toPositiveNumber(input.quantity);
          const fallbackQuantity =
            toPositiveNumber(input.unitPrice) > 0 && toPositiveNumber(input.amount) > 0
              ? Math.round(toPositiveNumber(input.amount) / toPositiveNumber(input.unitPrice))
              : 0;
          const quantity = Math.max(1, directQuantity || fallbackQuantity || quantityFromName);

          const explicitTotal = toPositiveNumber(input.totalAmount ?? input.amount);
          const unitPrice =
            toPositiveNumber(input.price ?? input.unitPrice) ||
            toPositiveNumber(product?.price) ||
            (explicitTotal > 0 ? explicitTotal / quantity : 0);
          const lineTotal = explicitTotal > 0 ? explicitTotal : unitPrice * quantity;

          const existing = productSalesMap.get(productKey);
          if (existing) {
            const nextUnits = existing.unitsSold + quantity;
            const nextTotal = existing.totalAmount + lineTotal;
            const weightedPrice = nextUnits > 0 ? nextTotal / nextUnits : 0;

            existing.unitsSold = nextUnits;
            existing.totalAmount = nextTotal;
            existing.price = weightedPrice;
            if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
            return;
          }

          productSalesMap.set(productKey, {
            productKey,
            productName,
            imageUrl,
            price: unitPrice,
            unitsSold: quantity,
            totalAmount: lineTotal,
            category,
          });
        };

        orders.forEach((order) => {
          if (isCancelledOrder(order)) return;

          const lineItems = Array.isArray(order.lineItems)
            ? order.lineItems
            : Array.isArray(order.products)
              ? order.products
              : [];

          if (lineItems.length > 0) {
            lineItems.forEach((item) => {
              appendRow({
                productId: item.productId,
                sku: item.sku,
                name: item.productName || item.name,
                imageUrl: item.imageUrl,
                quantity: item.quantity ?? item.items,
                price: item.price,
                unitPrice: item.unitPrice,
                amount: item.amount,
                totalAmount: item.totalAmount,
              });
            });

            return;
          }

          appendRow({
            productId: order.productId,
            sku: order.sku,
            name: order.productName || order.product,
            imageUrl: order.imageUrl,
            quantity: order.quantity ?? order.items,
            price: order.price,
            unitPrice: order.unitPrice,
            amount: order.amount,
            totalAmount: order.totalAmount,
          });
        });

        const grouped = new Map<string, ProductSales[]>();
        Array.from(productSalesMap.values()).forEach((item) => {
          if (!grouped.has(item.category)) {
            grouped.set(item.category, []);
          }

          grouped.get(item.category)?.push({
            productKey: item.productKey,
            productName: item.productName,
            imageUrl: item.imageUrl,
            price: item.price,
            unitsSold: item.unitsSold,
            totalAmount: item.totalAmount,
          });
        });

        const result: CategorySalesGroup[] = Array.from(grouped.entries())
          .map(([category, categoryRows]) => {
            const sortedRows = categoryRows.sort((a, b) => b.totalAmount - a.totalAmount);
            const categoryUnits = sortedRows.reduce((sum, row) => sum + row.unitsSold, 0);
            const categoryTotal = sortedRows.reduce((sum, row) => sum + row.totalAmount, 0);

            return {
              category,
              rows: sortedRows,
              categoryUnits,
              categoryTotal,
            };
          })
          .sort((a, b) => b.categoryTotal - a.categoryTotal);

        setRows(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sales data');
      } finally {
        setLoading(false);
      }
    };

    void loadSales();
  }, []);

  const overall = useMemo(() => {
    const categories = rows.length;
    const products = rows.reduce((sum, category) => sum + category.rows.length, 0);
    const units = rows.reduce((sum, category) => sum + category.categoryUnits, 0);
    const total = rows.reduce((sum, category) => sum + category.categoryTotal, 0);

    return { categories, products, units, total };
  }, [rows]);

  if (loading) {
    return <div className="text-sm text-slate-500">Loading sales...</div>;
  }

  if (error) {
    return <div className="text-sm text-rose-600">{error}</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales by Category</h1>
          <p className="text-sm text-slate-500 mt-1">
            Category-wise product sales with units sold and total revenue per product.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Categories: {overall.categories}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Products: {overall.products}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold">Units Sold: {overall.units}</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
            Revenue: {currencyFormatter.format(overall.total)}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          No sales data found yet.
        </div>
      ) : (
        <div className="space-y-6">
          {rows.map((group) => (
            <section key={group.category} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-100">{group.category}</h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-700 px-2.5 py-1 text-slate-200">Units: {group.categoryUnits}</span>
                  <span className="rounded-full bg-emerald-600/20 px-2.5 py-1 text-emerald-200">
                    Total: {currencyFormatter.format(group.categoryTotal)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="text-left font-semibold px-4 py-3">Product Image</th>
                      <th className="text-left font-semibold px-4 py-3">Product Name</th>
                      <th className="text-left font-semibold px-4 py-3">Price</th>
                      <th className="text-left font-semibold px-4 py-3">Units Sold</th>
                      <th className="text-left font-semibold px-4 py-3">Total Amount Sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.rows.map((row) => (
                      <tr key={row.productKey} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          {row.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={row.imageUrl}
                              alt={row.productName}
                              className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                              <ImageIcon size={16} className="text-slate-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{row.productName}</td>
                        <td className="px-4 py-3 text-slate-700">{currencyFormatter.format(row.price)}</td>
                        <td className="px-4 py-3 text-slate-700 font-semibold">{row.unitsSold}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">{currencyFormatter.format(row.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
