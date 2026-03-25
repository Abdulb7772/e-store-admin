'use client';

import { useMemo, useState } from 'react';
import { Plus, ImageIcon } from 'lucide-react';
import AddProductModal from '@/components/AddProductModal';
import { type Product, COLOR_OPTIONS, INITIAL_PRODUCTS } from '@/types/product';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const nextId = useMemo(
    () => (products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1),
    [products],
  );

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-sm text-slate-500 mt-1">Manage products and inventory.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-black hover:bg-slate-800 text-slate-400 text-sm font-semibold px-4 py-2.5 transition-colors"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Image</th>
              <th className="text-left font-semibold px-4 py-3">Name</th>
              <th className="text-left font-semibold px-4 py-3">Brand</th>
              <th className="text-left font-semibold px-4 py-3">Category</th>
              <th className="text-left font-semibold px-4 py-3">Sub-Category</th>
              <th className="text-left font-semibold px-4 py-3">Colors</th>
              <th className="text-left font-semibold px-4 py-3">Sizes</th>
              <th className="text-left font-semibold px-4 py-3">Price</th>
              <th className="text-left font-semibold px-4 py-3">Stock</th>
              <th className="text-left font-semibold px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                      <ImageIcon size={18} className="text-slate-400" />
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3 text-slate-600">{p.brand}</td>
                <td className="px-4 py-3 text-slate-600">{p.category}</td>
                <td className="px-4 py-3 text-slate-600">{p.subCategory || 'n/a'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {p.colors.map((c) => {
                      const col = COLOR_OPTIONS.find((o) => o.label === c);
                      return (
                        <span
                          key={c}
                          title={c}
                          className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"
                          style={{ backgroundColor: col?.hex ?? '#E2E8F0' }}
                        />
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.sizes.join(', ')}</td>
                <td className="px-4 py-3 text-slate-700">{p.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-slate-700">{p.stock}</td>
                <td className="px-4 py-3">
                  <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold " + (p.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}>
                    {p.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AddProductModal
          onSave={(data) => {
            setProducts((prev) => [{ id: nextId, ...data }, ...prev]);
            setIsModalOpen(false);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}

    </div>
  );
}