'use client';

import { useEffect, useState } from 'react';
import { Plus, ImageIcon, Eye, Pencil, Trash2 } from 'lucide-react';
import AddProductModal from '@/components/AddProductModal';
import { type Product, COLOR_OPTIONS } from '@/types/product';
import { apiGet, apiPost } from '@/lib/api';

type ProductPayload = Omit<Product, 'id'>;

type ApiProduct = {
  _id?: string;
  id?: number | string;
  name: string;
  description?: string;
  brand: string;
  dressType?: string;
  category: string;
  subCategory: string;
  price: number;
  stock: number;
  colors: string[];
  sizes: string[];
  variantStock: Product['variantStock'];
  imageUrls?: string[];
  coverImageUrl?: string;
  imageUrl?: string;
};

const normalizeProduct = (p: ApiProduct): Product => {
  const normalizedImageUrls = Array.isArray(p.imageUrls)
    ? p.imageUrls.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];
  const coverImage = p.coverImageUrl || p.imageUrl || normalizedImageUrls[0] || '';

  return {
    id: p._id ?? p.id ?? String(Date.now()),
    name: p.name,
    description: p.description,
    brand: p.brand,
    dressType: p.dressType,
    category: p.category,
    subCategory: p.subCategory,
    price: Number(p.price || 0),
    stock: Number(p.stock || 0),
    colors: p.colors ?? [],
    sizes: p.sizes ?? [],
    variantStock: p.variantStock ?? [],
    imageUrls: normalizedImageUrls,
    coverImageUrl: coverImage,
    imageUrl: coverImage,
  };
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const toPayload = (product: Product): ProductPayload => {
    const { id, ...payload } = product;
    return payload;
  };

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      try {
        const data = await apiGet<ApiProduct[]>('/admin/products');
        if (!mounted) return;
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data.map(normalizeProduct));
        }
      } catch {
        // Fallback to local sample products when backend is unavailable.
      }
    };

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveProduct = async (data: ProductPayload) => {
    setIsSaving(true);
    try {
      const created = await apiPost<ApiProduct, ProductPayload>('/admin/products', data);
      setProducts((prev) => [normalizeProduct(created), ...prev]);
      setIsModalOpen(false);
    } catch {
      const fallbackId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setProducts((prev) => [{ id: fallbackId, ...data }, ...prev]);
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProduct = (data: ProductPayload) => {
    if (!editingProduct) return;
    const updatedProduct: Product = { id: editingProduct.id, ...data };
    setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updatedProduct : p)));
    setEditingProduct(null);
  };

  const requestDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = () => {
    if (!productToDelete) return;
    setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
    setProductToDelete(null);
  };

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
              <th className="text-left font-semibold px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  {(p.coverImageUrl || p.imageUrl) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.coverImageUrl || p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
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
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingProduct(p)}
                      aria-label="View product"
                      title="View"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 w-8 h-8 text-slate-600 hover:bg-slate-50"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(p)}
                      aria-label="Edit product"
                      title="Edit"
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 w-8 h-8 text-slate-600 hover:bg-slate-50"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDeleteProduct(p)}
                      aria-label="Delete product"
                      title="Delete"
                      className="inline-flex items-center justify-center rounded-lg border border-rose-200 w-8 h-8 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <AddProductModal
          title="Add New Product"
          submitLabel="Save Product"
          onSave={(data) => {
            void handleSaveProduct(data);
          }}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {editingProduct && (
        <AddProductModal
          title="Edit Product"
          submitLabel="Update Product"
          initialData={toPayload(editingProduct)}
          onSave={(data) => {
            handleUpdateProduct(data);
          }}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Product Details</h2>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="px-6 py-4 space-y-2 text-sm">
              <p><span className="font-semibold text-slate-700">Name:</span> {viewingProduct.name}</p>
              <p><span className="font-semibold text-slate-700">Brand:</span> {viewingProduct.brand}</p>
              <p><span className="font-semibold text-slate-700">Category:</span> {viewingProduct.category}</p>
              <p><span className="font-semibold text-slate-700">Sub-Category:</span> {viewingProduct.subCategory || 'n/a'}</p>
              <p><span className="font-semibold text-slate-700">Dress Type:</span> {viewingProduct.dressType || 'n/a'}</p>
              <p><span className="font-semibold text-slate-700">Price:</span> ${viewingProduct.price.toFixed(2)}</p>
              <p><span className="font-semibold text-slate-700">Stock:</span> {viewingProduct.stock}</p>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm"
          onClick={() => setProductToDelete(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-rose-100">
              <p className="text-lg font-semibold text-slate-800">Delete product?</p>
              <p className="mt-2 text-sm text-slate-500">
                {productToDelete.name} will be removed from the table.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <p className="text-xs text-slate-500 mt-3">Saving product to backend...</p>
      )}

    </div>
  );
}