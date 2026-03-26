'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon, Tag } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { apiGet, apiPut } from '@/lib/api';
import { type Product } from '@/types/product';

type ApiProduct = {
  _id?: string;
  id?: number | string;
  sku?: string;
  name: string;
  description?: string;
  brand: string;
  dressType?: string;
  category: string;
  subCategory: string;
  price: number;
  originalPrice?: number;
  salePercentage?: number;
  isOnSale?: boolean;
  promotionTag?: '' | 'new-arrivals' | 'top-sales';
  stock: number;
  colors: string[];
  sizes: string[];
  variantStock: Product['variantStock'];
  colorImageMap?: Product['colorImageMap'];
  imageUrls?: string[];
  coverImageUrl?: string;
  imageUrl?: string;
};

const normalizeProduct = (product: ApiProduct): Product => {
  const normalizedImageUrls = Array.isArray(product.imageUrls)
    ? product.imageUrls.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];
  const coverImage = product.coverImageUrl || product.imageUrl || normalizedImageUrls[0] || '';
  const price = Number(product.price || 0);
  const rawOriginalPrice = Number(product.originalPrice || 0);
  const originalPrice = rawOriginalPrice > 0 ? rawOriginalPrice : price;

  return {
    id: product._id ?? product.id ?? String(Date.now()),
    sku: product.sku,
    name: product.name,
    description: product.description,
    brand: product.brand,
    dressType: product.dressType,
    category: product.category,
    subCategory: product.subCategory,
    price,
    originalPrice,
    salePercentage: Number(product.salePercentage || 0),
    isOnSale: Boolean(product.isOnSale),
    promotionTag: product.promotionTag || '',
    stock: Number(product.stock || 0),
    colors: product.colors ?? [],
    sizes: product.sizes ?? [],
    variantStock: product.variantStock ?? [],
    colorImageMap: product.colorImageMap ?? [],
    imageUrls: normalizedImageUrls,
    coverImageUrl: coverImage,
    imageUrl: coverImage,
  };
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function PromotionsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTagProductId, setActiveTagProductId] = useState<string>('');
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [productDiscountInput, setProductDiscountInput] = useState('');
  const [category, setCategory] = useState('');
  const [categoryDiscountInput, setCategoryDiscountInput] = useState('');
  const [isApplyingProductSale, setIsApplyingProductSale] = useState(false);
  const [endingProductId, setEndingProductId] = useState('');
  const [isApplyingCategorySale, setIsApplyingCategorySale] = useState(false);
  const [isEndingCategorySale, setIsEndingCategorySale] = useState(false);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await apiGet<ApiProduct[]>('/admin/products');
      setProducts(Array.isArray(data) ? data.map(normalizeProduct) : []);
    } catch {
      setProducts([]);
      toast.error('Failed to load products for promotions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort();
  }, [products]);

  const handlePromotionTagChange = async (productId: string, promotionTag: '' | 'new-arrivals' | 'top-sales') => {
    setActiveTagProductId(productId);

    try {
      const updated = await apiPut<ApiProduct, { promotionTag: string }>(`/admin/products/${productId}/promotion-tag`, {
        promotionTag,
      });

      const normalizedUpdated = normalizeProduct(updated);
      setProducts((current) => current.map((item) => (String(item.id) === productId ? normalizedUpdated : item)));
      toast.success('Promotion tag updated.');
    } catch {
      toast.error('Failed to update promotion tag.');
    } finally {
      setActiveTagProductId('');
    }
  };

  const submitProductSale = async () => {
    if (!saleProduct) return;

    const discountPercentage = Number(productDiscountInput);
    if (!Number.isFinite(discountPercentage) || discountPercentage <= 0 || discountPercentage >= 100) {
      toast.error('Enter a valid percentage between 1 and 99.');
      return;
    }

    setIsApplyingProductSale(true);

    try {
      const updated = await apiPut<ApiProduct, { discountPercentage: number }>(
        `/admin/products/${String(saleProduct.id)}/sale`,
        { discountPercentage },
      );

      const normalizedUpdated = normalizeProduct(updated);
      setProducts((current) =>
        current.map((item) => (String(item.id) === String(saleProduct.id) ? normalizedUpdated : item)),
      );

      toast.success('Product added to sale successfully.');
      setSaleProduct(null);
      setProductDiscountInput('');
    } catch {
      toast.error('Failed to add product to sale.');
    } finally {
      setIsApplyingProductSale(false);
    }
  };

  const submitCategorySale = async () => {
    const discountPercentage = Number(categoryDiscountInput);

    if (!category) {
      toast.error('Please select a category first.');
      return;
    }

    if (!Number.isFinite(discountPercentage) || discountPercentage <= 0 || discountPercentage >= 100) {
      toast.error('Enter a valid percentage between 1 and 99.');
      return;
    }

    setIsApplyingCategorySale(true);

    try {
      const result = await apiPut<{ updatedCount: number }, { category: string; discountPercentage: number }>(
        '/admin/products/sale/category',
        {
          category,
          discountPercentage,
        },
      );

      toast.success(`Applied ${discountPercentage}% off to ${result.updatedCount} product(s).`);
      setCategoryDiscountInput('');
      await loadProducts();
    } catch {
      toast.error('Failed to apply category sale.');
    } finally {
      setIsApplyingCategorySale(false);
    }
  };

  const endProductSale = async (productId: string) => {
    setEndingProductId(productId);

    try {
      const updated = await apiPut<ApiProduct, Record<string, never>>(`/admin/products/${productId}/sale/end`, {});
      const normalizedUpdated = normalizeProduct(updated);
      setProducts((current) => current.map((item) => (String(item.id) === productId ? normalizedUpdated : item)));
      toast.success('Product sale ended successfully.');
    } catch {
      toast.error('Failed to end product sale.');
    } finally {
      setEndingProductId('');
    }
  };

  const endCategorySale = async () => {
    if (!category) {
      toast.error('Please select a category first.');
      return;
    }

    setIsEndingCategorySale(true);

    try {
      const result = await apiPut<{ updatedCount: number }, { category: string }>('/admin/products/sale/category/end', {
        category,
      });
      toast.success(`Ended sale for ${result.updatedCount} product(s) in ${category}.`);
      await loadProducts();
    } catch {
      toast.error('Failed to end category sale.');
    } finally {
      setIsEndingCategorySale(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold text-slate-800">Promotions</h1>
          <p className="text-sm text-slate-500">Manage promotion labels and discounted sale prices.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-slate-700">
            <Tag size={16} />
            <h2 className="text-sm font-semibold">Add Whole Category On Sale</h2>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
            >
              <option value="">Select category</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={1}
              max={99}
              value={categoryDiscountInput}
              onChange={(e) => setCategoryDiscountInput(e.target.value)}
              placeholder="Discount % (e.g. 20)"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submitCategorySale}
                disabled={isApplyingCategorySale || isEndingCategorySale}
                className="w-full inline-flex items-center justify-center rounded-xl bg-black px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplyingCategorySale ? 'Applying...' : 'Apply Category Sale'}
              </button>
              <button
                type="button"
                onClick={endCategorySale}
                disabled={isEndingCategorySale || isApplyingCategorySale}
                className="w-full inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEndingCategorySale ? 'Ending...' : 'End Category Sale'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-black/90 text-slate-300">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Image</th>
                <th className="text-left font-semibold px-4 py-3">Product</th>
                <th className="text-left font-semibold px-4 py-3">Category</th>
                <th className="text-left font-semibold px-4 py-3">Price</th>
                <th className="text-left font-semibold px-4 py-3">Promotion Tag</th>
                <th className="text-left font-semibold px-4 py-3">Sale Status</th>
                <th className="text-left font-semibold px-4 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading products...
                  </td>
                </tr>
              )}

              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No products found.
                  </td>
                </tr>
              )}

              {!loading &&
                products.map((product) => {
                  const productId = String(product.id);
                  const isOnSale = Boolean(product.isOnSale) && Number(product.salePercentage || 0) > 0;
                  const currentPrice = Number(product.price || 0);
                  const originalPrice = Number(product.originalPrice || currentPrice);

                  return (
                    <tr key={productId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        {product.coverImageUrl || product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.coverImageUrl || product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                            <ImageIcon size={18} className="text-slate-400" />
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">{product.name}</td>
                      <td className="px-4 py-3 text-slate-600">{product.category}</td>

                      <td className="px-4 py-3">
                        {isOnSale ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 line-through">{currencyFormatter.format(originalPrice)}</span>
                            <span className="font-semibold text-rose-600">{currencyFormatter.format(currentPrice)}</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-slate-800">{currencyFormatter.format(currentPrice)}</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={product.promotionTag || ''}
                          onChange={(e) =>
                            void handlePromotionTagChange(
                              productId,
                              e.target.value as '' | 'new-arrivals' | 'top-sales',
                            )
                          }
                          disabled={activeTagProductId === productId}
                          className="w-full min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700 disabled:opacity-60"
                        >
                          <option value="">None</option>
                          <option value="new-arrivals">New Arrivals</option>
                          <option value="top-sales">Top Sales</option>
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        {isOnSale ? (
                          <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                            {Number(product.salePercentage || 0)}% OFF
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                            Not on sale
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSaleProduct(product);
                              setProductDiscountInput('');
                            }}
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            Add To Sale
                          </button>
                          <button
                            type="button"
                            onClick={() => void endProductSale(productId)}
                            disabled={!isOnSale || endingProductId === productId}
                            className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {endingProductId === productId ? 'Ending...' : 'End Sale'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {saleProduct && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Add Product To Sale</h3>
            <p className="mt-1 text-sm text-slate-500">{saleProduct.name}</p>

            <div className="mt-4 space-y-2">
              <label htmlFor="product-discount" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Discount Percentage
              </label>
              <input
                id="product-discount"
                type="number"
                min={1}
                max={99}
                value={productDiscountInput}
                onChange={(e) => setProductDiscountInput(e.target.value)}
                placeholder="Enter percentage (e.g. 30)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSaleProduct(null);
                  setProductDiscountInput('');
                }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitProductSale()}
                disabled={isApplyingProductSale}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApplyingProductSale ? 'Applying...' : 'Apply Sale'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
