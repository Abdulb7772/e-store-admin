'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { apiGet, apiPut } from '@/lib/api';
import { COLOR_OPTIONS, type Product } from '@/types/product';

type ApiProduct = {
  _id?: string;
  id?: number | string;
  name: string;
  brand: string;
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

type StockDrafts = Record<string, Record<string, Record<string, number>>>;

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];

const getSizeRank = (size: string) => {
  const known = SIZE_ORDER.indexOf(size);
  if (known >= 0) return known;

  const numeric = Number(size);
  if (Number.isFinite(numeric)) return 100 + numeric;

  return 1000 + size.charCodeAt(0);
};

const getStockToneClasses = (value: number) => {
  if (value === 0) return 'border-red-500 bg-red-400 text-red-900';
  if (value < 5) return 'border-rose-400 bg-rose-300 text-rose-900';
  if (value < 10) return 'border-orange-400 bg-orange-300 text-orange-900';
  if (value < 15) return 'border-yellow-400 bg-yellow-300 text-yellow-900';
  return 'border-emerald-500 bg-emerald-400 text-emerald-900';
};

const normalizeProduct = (p: ApiProduct): Product => {
  const normalizedImageUrls = Array.isArray(p.imageUrls)
    ? p.imageUrls.filter((url) => typeof url === 'string' && url.trim().length > 0)
    : [];
  const coverImage = p.coverImageUrl || p.imageUrl || normalizedImageUrls[0] || '';

  return {
    id: p._id ?? p.id ?? String(Date.now()),
    name: p.name,
    brand: p.brand,
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

const buildInitialDrafts = (products: Product[]): StockDrafts => {
  const drafts: StockDrafts = {};

  products.forEach((product) => {
    const productKey = String(product.id);
    drafts[productKey] = {};

    product.colors.forEach((color) => {
      drafts[productKey][color] = {};

      product.sizes.forEach((size) => {
        const found = product.variantStock.find((entry) => entry.color === color && entry.size === size);
        drafts[productKey][color][size] = found?.stock ?? 0;
      });
    });
  });

  return drafts;
};

const buildDraftForProduct = (product: Product): Record<string, Record<string, number>> => {
  const draft: Record<string, Record<string, number>> = {};

  product.colors.forEach((color) => {
    draft[color] = {};

    product.sizes.forEach((size) => {
      const found = product.variantStock.find((entry) => entry.color === color && entry.size === size);
      draft[color][size] = found?.stock ?? 0;
    });
  });

  return draft;
};

export default function StocksPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<StockDrafts>({});
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [itemsPerPageInput, setItemsPerPageInput] = useState('10');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const data = await apiGet<ApiProduct[]>('/admin/products');
        const normalized = Array.isArray(data) ? data.map(normalizeProduct) : [];
        setProducts(normalized);
        setDrafts(buildInitialDrafts(normalized));
      } catch {
        toast.error('Failed to load stock data.');
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, [toast]);

  const sizeColumns = useMemo(() => {
    const set = new Set<string>();

    products.forEach((product) => {
      product.sizes.forEach((size) => set.add(size));
      product.variantStock.forEach((entry) => set.add(entry.size));
    });

    return Array.from(set).sort((a, b) => getSizeRank(a) - getSizeRank(b));
  }, [products]);

  const categoryOptions = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category).filter((value) => Boolean(value)))).sort();
  }, [products]);

  const subCategoryOptions = useMemo(() => {
    const source = selectedCategory
      ? products.filter((product) => product.category === selectedCategory)
      : products;

    return Array.from(new Set(source.map((product) => product.subCategory).filter((value) => Boolean(value)))).sort();
  }, [products, selectedCategory]);

  const brandOptions = useMemo(() => {
    const source = products.filter((product) => {
      if (selectedCategory && product.category !== selectedCategory) return false;
      if (selectedSubCategory && product.subCategory !== selectedSubCategory) return false;
      return true;
    });

    return Array.from(new Set(source.map((product) => product.brand).filter((value) => Boolean(value)))).sort();
  }, [products, selectedCategory, selectedSubCategory]);

  useEffect(() => {
    if (selectedSubCategory && !subCategoryOptions.includes(selectedSubCategory)) {
      setSelectedSubCategory('');
    }
  }, [selectedSubCategory, subCategoryOptions]);

  useEffect(() => {
    if (selectedBrand && !brandOptions.includes(selectedBrand)) {
      setSelectedBrand('');
    }
  }, [selectedBrand, brandOptions]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      if (selectedCategory && product.category !== selectedCategory) return false;
      if (selectedSubCategory && product.subCategory !== selectedSubCategory) return false;
      if (selectedBrand && product.brand !== selectedBrand) return false;
      if (!normalizedQuery) return true;

      const inName = product.name.toLowerCase().includes(normalizedQuery);
      const inColors = product.colors.some((color) => color.toLowerCase().includes(normalizedQuery));
      return inName || inColors;
    });
  }, [products, query, selectedCategory, selectedSubCategory, selectedBrand]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCategory, selectedSubCategory, selectedBrand]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const pageStart = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const pageEnd = Math.min(currentPage * itemsPerPage, totalItems);

  const handleItemsPerPageInputChange = (value: string) => {
    if (!/^\d*$/.test(value)) return;

    setItemsPerPageInput(value);

    if (value === '') return;

    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      setItemsPerPage(parsed);
      setCurrentPage(1);
    }
  };

  const commitItemsPerPageInput = () => {
    if (itemsPerPageInput === '') {
      setItemsPerPageInput(String(itemsPerPage));
      return;
    }

    const parsed = Number(itemsPerPageInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setItemsPerPageInput(String(itemsPerPage));
      return;
    }

    setItemsPerPage(parsed);
    setItemsPerPageInput(String(parsed));
    setCurrentPage(1);
  };

  const getDraftValue = (productId: string, color: string, size: string) => {
    return drafts[productId]?.[color]?.[size] ?? 0;
  };

  const setDraftValue = (productId: string, color: string, size: string, value: number) => {
    setDrafts((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? {}),
        [color]: {
          ...((prev[productId] ?? {})[color] ?? {}),
          [size]: Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)),
        },
      },
    }));
  };

  const getProductTotal = (product: Product) => {
    const productKey = String(product.id);

    return product.colors.reduce((sum, color) => {
      return (
        sum +
        product.sizes.reduce((sizeSum, size) => {
          return sizeSum + getDraftValue(productKey, color, size);
        }, 0)
      );
    }, 0);
  };

  const saveProductStock = async (product: Product) => {
    const productKey = String(product.id);

    const variantStock = product.colors.flatMap((color) =>
      product.sizes.map((size) => ({
        color,
        size,
        stock: getDraftValue(productKey, color, size),
      })),
    );

    setSavingProductId(productKey);
    try {
      const response = await apiPut<{ productId: string; variantStock: Product['variantStock']; stock: number }, { variantStock: Product['variantStock'] }>(
        `/admin/products/${productKey}/stock`,
        { variantStock },
      );

      setProducts((prev) =>
        prev.map((item) =>
          String(item.id) === productKey
            ? {
                ...item,
                variantStock: response.variantStock,
                stock: response.stock,
              }
            : item,
        ),
      );

      toast.success(`${product.name} stock updated.`);
    } catch {
      toast.error(`Failed to update stock for ${product.name}.`);
    } finally {
      setSavingProductId(null);
    }
  };

  const cancelProductStockChanges = (product: Product) => {
    const productKey = String(product.id);

    setDrafts((prev) => ({
      ...prev,
      [productKey]: buildDraftForProduct(product),
    }));

    toast.info(`${product.name} changes reverted.`);
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
      <div className="mb-6">
        <h1 className="text-4xl font-black tracking-tight text-slate-800">Stock Management</h1>
        <p className="text-sm text-slate-500 mt-1">Manage product stock by size.</p>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by product name or color..."
          className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
        >
          <option value="">All categories</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          value={selectedSubCategory}
          onChange={(e) => setSelectedSubCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
        >
          <option value="">All sub-categories</option>
          {subCategoryOptions.map((subCategory) => (
            <option key={subCategory} value={subCategory}>
              {subCategory}
            </option>
          ))}
        </select>

        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
        >
          <option value="">All brands</option>
          {brandOptions.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-[980px] w-full text-sm">
          <thead className="bg-black/90 text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Image</th>
              <th className="px-4 py-3 text-left font-semibold">Product</th>
              <th className="px-4 py-3 text-left font-semibold">Color</th>
              {sizeColumns.map((size) => (
                <th key={size} className="px-3 py-3 text-center font-semibold">
                  {size}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={4 + sizeColumns.length}>
                  Loading stock data...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={4 + sizeColumns.length}>
                  No products found.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product, productIndex) => {
                const productKey = String(product.id);
                const productColors = product.colors.length > 0 ? product.colors : ['Unknown'];
                const rowSpanCount = productColors.length;
                const productTotal = getProductTotal(product);
                const displayImage = product.coverImageUrl || product.imageUrl || '';

                return (
                  <Fragment key={productKey}>
                    {productColors.map((color, colorIndex) => {
                      const colorHex = COLOR_OPTIONS.find((item) => item.label === color)?.hex ?? '#E2E8F0';

                      return (
                        <tr key={`${productKey}-${color}`} className="bg-white [&>td]:border-b [&>td]:border-slate-200">
                          {colorIndex === 0 && (
                            <td className="px-4 py-4 align-middle" rowSpan={rowSpanCount}>
                              {displayImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={displayImage}
                                  alt={product.name}
                                  className="h-14 w-14 rounded-lg border border-slate-200 object-cover"
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-lg border border-slate-200 bg-slate-100" />
                              )}
                            </td>
                          )}

                          {colorIndex === 0 && (
                            <td className="px-4 py-4 align-middle text-slate-800 font-medium" rowSpan={rowSpanCount}>
                              {product.name}
                            </td>
                          )}

                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: colorHex }} />
                              <span className="text-slate-700">{color}</span>
                            </div>
                          </td>

                          {sizeColumns.map((size) => {
                            const value = product.sizes.includes(size) ? getDraftValue(productKey, color, size) : null;

                            return (
                              <td key={`${productKey}-${color}-${size}`} className="px-3 py-3">
                                {value === null ? (
                                  <div className="h-9 rounded-md bg-slate-50 border border-slate-100" />
                                ) : (
                                  <input
                                    type="number"
                                    min="0"
                                    value={value}
                                    onChange={(e) => setDraftValue(productKey, color, size, Number(e.target.value))}
                                    className={`w-full h-9 rounded-md border text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300 ${getStockToneClasses(value)}`}
                                  />
                                )}
                              </td>
                            );
                          })}

                          {colorIndex === 0 && (
                            <td className="px-4 py-4 align-middle text-center" rowSpan={rowSpanCount}>
                              <div className="mx-auto w-20 rounded-md bg-slate-100 py-2 text-sm font-bold text-slate-700">
                                {productTotal}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  void saveProductStock(product);
                                }}
                                disabled={savingProductId === productKey}
                                className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {savingProductId === productKey ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={() => cancelProductStockChanges(product)}
                                disabled={savingProductId === productKey}
                                className="mt-2 ml-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                Cancel
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {productIndex < paginatedProducts.length - 1 && (
                      <tr>
                        <td className="h-0 border-b border-slate-400 p-0" colSpan={sizeColumns.length + 4} />
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Showing {pageStart}-{pageEnd} of {totalItems}
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor="stocks-per-page" className="text-xs font-medium text-slate-600">
            Per page
          </label>
          <input
            id="stocks-per-page"
            type="text"
            inputMode="numeric"
            value={itemsPerPageInput}
            onChange={(e) => handleItemsPerPageInputChange(e.target.value)}
            onBlur={commitItemsPerPageInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitItemsPerPageInput();
              }
            }}
            className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
          />

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
