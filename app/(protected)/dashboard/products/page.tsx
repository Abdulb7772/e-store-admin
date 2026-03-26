'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, ImageIcon, Eye, Pencil, Trash2, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import AddProductModal from '@/components/AddProductModal';
import { useToast } from '@/components/ToastProvider';
import { type Product, COLOR_OPTIONS } from '@/types/product';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';

type ProductPayload = Omit<Product, 'id'>;

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
  stock: number;
  colors: string[];
  sizes: string[];
  variantStock: Product['variantStock'];
  colorImageMap?: Product['colorImageMap'];
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
    sku: p.sku,
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
    colorImageMap: p.colorImageMap ?? [],
    imageUrls: normalizedImageUrls,
    coverImageUrl: coverImage,
    imageUrl: coverImage,
  };
};

export default function ProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [activeViewImageIndex, setActiveViewImageIndex] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [itemsPerPageInput, setItemsPerPageInput] = useState('10');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [query, setQuery] = useState('');

  const getProductImages = (product: Product | null): string[] => {
    if (!product) return [];

    const combined = [
      ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
      product.coverImageUrl || '',
      product.imageUrl || '',
    ];

    return Array.from(new Set(combined.filter((url) => typeof url === 'string' && url.trim().length > 0)));
  };

  const viewingImages = getProductImages(viewingProduct);
  const activeViewImage = viewingImages[activeViewImageIndex] || viewingImages[0] || '';

  const cycleViewImage = (direction: 1 | -1) => {
    if (viewingImages.length < 2) return;

    setActiveViewImageIndex((prev) => {
      const next = prev + direction;

      if (next < 0) return viewingImages.length - 1;
      if (next >= viewingImages.length) return 0;
      return next;
    });
  };

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
        setProducts(Array.isArray(data) ? data.map(normalizeProduct) : []);
      } catch {
        if (!mounted) return;
        setProducts([]);
      }
    };

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setViewingProduct(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!viewingProduct) {
      setActiveViewImageIndex(0);
      return;
    }

    const images = getProductImages(viewingProduct);
    if (!images.length) {
      setActiveViewImageIndex(0);
      return;
    }

    const preferredImage = viewingProduct.coverImageUrl || viewingProduct.imageUrl || '';
    const preferredIndex = preferredImage ? images.findIndex((url) => url === preferredImage) : -1;
    setActiveViewImageIndex(preferredIndex >= 0 ? preferredIndex : 0);
  }, [viewingProduct]);

  const handleSaveProduct = async (data: ProductPayload) => {
    setIsSaving(true);
    try {
      const created = await apiPost<ApiProduct, ProductPayload>('/admin/products', data);
      setProducts((prev) => [normalizeProduct(created), ...prev]);
      setIsModalOpen(false);
      toast.success('Product added successfully.');
    } catch {
      toast.error('Failed to save product to backend.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProduct = async (data: ProductPayload) => {
    if (!editingProduct) return;

    setIsSaving(true);
    try {
      const updated = await apiPut<ApiProduct, ProductPayload>(`/admin/products/${editingProduct.id}`, data);
      setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? normalizeProduct(updated) : p)));
      setEditingProduct(null);
      toast.success('Product updated successfully.');
    } catch {
      toast.error('Failed to update product in backend.');
    } finally {
      setIsSaving(false);
    }
  };

  const requestDeleteProduct = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);

    try {
      await apiDelete(`/admin/products/${productToDelete.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      toast.success('Product deleted successfully');
      setProductToDelete(null);
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('Failed to delete product from backend. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

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

      const matchesName = product.name.toLowerCase().includes(normalizedQuery);
      const matchesBrand = product.brand.toLowerCase().includes(normalizedQuery);
      const matchesCategory = product.category.toLowerCase().includes(normalizedQuery);
      const matchesSubCategory = product.subCategory.toLowerCase().includes(normalizedQuery);
      const matchesColor = product.colors.some((color) => color.toLowerCase().includes(normalizedQuery));

      return matchesName || matchesBrand || matchesCategory || matchesSubCategory || matchesColor;
    });
  }, [products, selectedCategory, selectedSubCategory, selectedBrand, query]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubCategory, selectedBrand, query]);

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

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by product name, brand, category, sub-category or color..."
            className="w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-700"
          />
        </div>

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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-black/90 text-slate-300">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Image</th>
              <th className="text-left font-semibold px-4 py-3">Name</th>
              <th className="text-left font-semibold px-4 py-3">SKU</th>
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
            {paginatedProducts.map((p) => (
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
                <td className="px-4 py-3 text-slate-600">{p.sku || '-'}</td>
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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Showing {pageStart}-{pageEnd} of {totalItems}
        </p>

        <div className="flex items-center gap-2">
          <label htmlFor="products-per-page" className="text-xs font-medium text-slate-600">
            Per page
          </label>
          <input
            id="products-per-page"
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
            void handleUpdateProduct(data);
          }}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-900/65 overflow-y-auto">
          <div className="my-2 sm:my-0 w-full max-w-3xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] rounded-xl bg-[#E5E7EB] shadow-2xl border border-slate-500/30 overflow-y-auto">
            <div className="relative flex items-center justify-center px-5 py-3 border-b border-slate-700 bg-[#111315]">
              <h2 className="text-md font-semibold text-slate-300 leading-none">Product Details</h2>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="absolute right-5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                aria-label="Close product details"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4 px-5 py-5">
              <div>
                <div
                  className="relative rounded-lg overflow-hidden border border-slate-300 bg-slate-100 h-[380px] md:h-[420px]"
                >
                  {activeViewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeViewImage} alt={viewingProduct.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={28} className="text-slate-400" />
                    </div>
                  )}

                  {viewingImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => cycleViewImage(-1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-slate-200 hover:bg-black"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => cycleViewImage(1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-slate-200 hover:bg-black"
                        aria-label="Next image"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </div>

                {viewingImages.length > 1 && (
                  <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
                    {viewingImages.map((image, index) => (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setActiveViewImageIndex(index)}
                        className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-md border ${
                          index === activeViewImageIndex ? 'border-slate-800 ring-1 ring-slate-700' : 'border-slate-300'
                        }`}
                        aria-label={`Preview image ${index + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt={`${viewingProduct.name} ${index + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {viewingImages.length > 1 && (
                  <p className="mt-1 text-[11px] text-slate-500">Use arrows or thumbnails to view one image at a time.</p>
                )}
              </div>

              <div className="pt-1 pr-1">
                <h3 className="text-md font-semibold text-[#111827] leading-[1.1] tracking-[-0.02em]">{viewingProduct.name}</h3>
                <p className="mt-2 text-sm text-[#64748B] leading-none">{viewingProduct.brand}</p>

                <p className="mt-5 text-md font-bold text-[#111827] leading-none">${viewingProduct.price.toFixed(2)}</p>

                <div className="mt-6 text-md leading-tight text-[#475569]">
                  <p>
                    <span className="font-semibold text-[#334155]">Category:</span> {viewingProduct.category}
                  </p>
                  <p className="mt-1">
                    <span className="font-semibold text-[#334155]">Sub-Category:</span> {viewingProduct.subCategory || 'N/A'}
                  </p>
                </div>
                
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#334155]">Colors</p>
                  <div className="mt-3 flex flex-wrap gap-2.5">
                    {viewingProduct.colors.map((color) => {
                      const match = COLOR_OPTIONS.find((option) => option.label === color);
                      return (
                        <span
                          key={color}
                          title={color}
                          className="h-6 w-6 rounded-full border border-slate-400"
                          style={{ backgroundColor: match?.hex ?? '#E2E8F0' }}
                        />
                      );
                    })}
                  </div>
                </div>
                
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#334155]">Sizes</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {viewingProduct.sizes.map((size) => (
                      <span
                        key={size}
                        className="inline-flex h-[24px] min-w-[28px] items-center justify-center rounded-lg border border-[#CBD5E1] bg-[#E2E8F0] px-2.5 text-xs font-medium text-[#475569]"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-[#334155]">Description</p>
                  {viewingProduct.description?.trim() ? (
                    <div
                      className="mt-2 text-sm leading-6 text-slate-700 [&_h1]:mt-3 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_p]:mt-2 [&_strong]:font-bold [&_em]:italic [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1"
                      dangerouslySetInnerHTML={{ __html: viewingProduct.description }}
                    />
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No description available.</p>
                  )}
                </div>
                <div className="mt-6">
                  <span className="inline-flex rounded-full bg-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                    {viewingProduct.stock > 0 ? `Well Stocked (${viewingProduct.stock})` : 'Out of Stock'}
                  </span>
                </div>

                

                
              </div>
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
                onClick={() => {
                  void confirmDeleteProduct();
                }}
                disabled={isDeleting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
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