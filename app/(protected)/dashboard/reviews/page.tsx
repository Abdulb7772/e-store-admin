'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { apiDelete, apiGet, apiPatch } from '@/lib/api';

type ReviewRecord = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  productId?: string;
  productName?: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  externalId?: string;
};

type PaginationData<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export default function ReviewsPage() {
  const toast = useToast();
  
  // Product reviews state
  const [productReviews, setProductReviews] = useState<ReviewRecord[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [productItemsPerPage, setProductItemsPerPage] = useState(10);
  const [productPagination, setProductPagination] = useState({ total: 0, totalPages: 1 });
  const [productLoading, setProductLoading] = useState(false);

  // Website reviews state
  const [websiteReviews, setWebsiteReviews] = useState<ReviewRecord[]>([]);
  const [websitePage, setWebsitePage] = useState(1);
  const [websiteItemsPerPage, setWebsiteItemsPerPage] = useState(10);
  const [websitePagination, setWebsitePagination] = useState({ total: 0, totalPages: 1 });
  const [websiteLoading, setWebsiteLoading] = useState(false);

  // Deleted reviews state
  const [deletedReviews, setDeletedReviews] = useState<ReviewRecord[]>([]);
  const [deletedPage, setDeletedPage] = useState(1);
  const [deletedItemsPerPage, setDeletedItemsPerPage] = useState(10);
  const [deletedPagination, setDeletedPagination] = useState({ total: 0, totalPages: 1 });
  const [deletedLoading, setDeletedLoading] = useState(false);

  // Load product reviews
  useEffect(() => {
    let isMounted = true;

    const loadProductReviews = async () => {
      try {
        setProductLoading(true);
        const params = new URLSearchParams({
          type: 'product',
          limit: String(productItemsPerPage),
          page: String(productPage),
        });
        const response = await apiGet<PaginationData<ReviewRecord>>(`/reviews?${params}`);
        if (isMounted) {
          setProductReviews(response.data);
          setProductPagination({
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load product reviews:', error);
          toast.error('Failed to load product reviews.');
        }
      } finally {
        if (isMounted) {
          setProductLoading(false);
        }
      }
    };

    void loadProductReviews();

    return () => {
      isMounted = false;
    };
  }, [productPage, productItemsPerPage]);

  // Load website reviews
  useEffect(() => {
    let isMounted = true;

    const loadWebsiteReviews = async () => {
      try {
        setWebsiteLoading(true);
        const params = new URLSearchParams({
          type: 'website',
          limit: String(websiteItemsPerPage),
          page: String(websitePage),
        });
        const response = await apiGet<PaginationData<ReviewRecord>>(`/reviews?${params}`);
        if (isMounted) {
          setWebsiteReviews(response.data);
          setWebsitePagination({
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load website reviews:', error);
          toast.error('Failed to load website reviews.');
        }
      } finally {
        if (isMounted) {
          setWebsiteLoading(false);
        }
      }
    };

    void loadWebsiteReviews();

    return () => {
      isMounted = false;
    };
  }, [websitePage, websiteItemsPerPage]);

  // Load deleted reviews
  useEffect(() => {
    let isMounted = true;

    const loadDeletedReviews = async () => {
      try {
        setDeletedLoading(true);
        const params = new URLSearchParams({
          limit: String(deletedItemsPerPage),
          page: String(deletedPage),
        });
        const response = await apiGet<PaginationData<ReviewRecord>>(`/reviews/deleted?${params}`);
        if (isMounted) {
          setDeletedReviews(response.data);
          setDeletedPagination({
            total: response.pagination.total,
            totalPages: response.pagination.totalPages,
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load deleted reviews:', error);
          toast.error('Failed to load deleted reviews.');
        }
      } finally {
        if (isMounted) {
          setDeletedLoading(false);
        }
      }
    };

    void loadDeletedReviews();

    return () => {
      isMounted = false;
    };
  }, [deletedPage, deletedItemsPerPage]);

  const averageRating = useMemo(() => {
    const allActiveReviews = [...productReviews, ...websiteReviews];
    if (allActiveReviews.length === 0) return 0;
    const total = allActiveReviews.reduce((sum, item) => sum + item.rating, 0);
    return Math.round((total / allActiveReviews.length) * 10) / 10;
  }, [productReviews, websiteReviews]);

  const handleDelete = async (id: string) => {
    try {
      await apiDelete<{ id: string }>(`/reviews/${id}`);
      setProductReviews((prev) => prev.filter((item) => item.id !== id));
      setWebsiteReviews((prev) => prev.filter((item) => item.id !== id));
      toast.success('Review deleted.');
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review.');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiPatch<ReviewRecord, {}>(`/reviews/${id}/restore`, {});
      setDeletedReviews((prev) => prev.filter((item) => item.id !== id));
      toast.success('Review restored.');
    } catch (error) {
      console.error('Failed to restore review:', error);
      toast.error('Failed to restore review.');
    }
  };

  const PaginationControls = ({ 
    page, 
    totalPages, 
    onPageChange,
    isLoading 
  }: { 
    page: number; 
    totalPages: number; 
    onPageChange: (p: number) => void;
    isLoading?: boolean;
  }) => (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-600">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1 || isLoading}
          className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || isLoading}
          className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );

  const StarRow = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={14}
          className={index < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
        />
      ))}
    </div>
  );

  const totalActiveReviews = productPagination.total + websitePagination.total;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reviews</h1>
          <p className="mt-1 text-sm text-slate-500">View customer reviews for products and website experience.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Reviews</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{totalActiveReviews}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Rating</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{averageRating}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deleted Reviews</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{deletedPagination.total}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Product Reviews Section */}
        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Product Reviews</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per Page:</label>
              <select
                value={productItemsPerPage}
                onChange={(e) => {
                  setProductItemsPerPage(Number(e.target.value));
                  setProductPage(1);
                }}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          {productLoading ? (
            <p className="px-4 py-6 text-sm text-slate-500">Loading product reviews...</p>
          ) : productReviews.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No product reviews available.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Customer</th>
                      <th scope="col" className="px-4 py-3">Product</th>
                      <th scope="col" className="px-4 py-3">Rating</th>
                      <th scope="col" className="px-4 py-3">Comment</th>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {productReviews.map((review) => (
                      <tr key={review.id}>
                        <td className="px-4 py-3 text-slate-700">{review.customerName}</td>
                        <td className="px-4 py-3 text-slate-700">{review.productName || '-'}</td>
                        <td className="px-4 py-3"><StarRow rating={review.rating} /></td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{review.comment}</td>
                        <td className="px-4 py-3 text-slate-600 text-nowrap">{new Date(review.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDelete(review.id)}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls 
                page={productPage} 
                totalPages={productPagination.totalPages} 
                onPageChange={setProductPage}
                isLoading={productLoading}
              />
            </>
          )}
        </section>

        {/* Website Reviews Section */}
        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Website Reviews</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per Page:</label>
              <select
                value={websiteItemsPerPage}
                onChange={(e) => {
                  setWebsiteItemsPerPage(Number(e.target.value));
                  setWebsitePage(1);
                }}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          {websiteLoading ? (
            <p className="px-4 py-6 text-sm text-slate-500">Loading website reviews...</p>
          ) : websiteReviews.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No website reviews available.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Customer</th>
                      <th scope="col" className="px-4 py-3">Rating</th>
                      <th scope="col" className="px-4 py-3">Comment</th>
                      <th scope="col" className="px-4 py-3">Date</th>
                      <th scope="col" className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {websiteReviews.map((review) => (
                      <tr key={review.id}>
                        <td className="px-4 py-3 text-slate-700">{review.customerName}</td>
                        <td className="px-4 py-3"><StarRow rating={review.rating} /></td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{review.comment}</td>
                        <td className="px-4 py-3 text-slate-600 text-nowrap">{new Date(review.createdAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleDelete(review.id)}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls 
                page={websitePage} 
                totalPages={websitePagination.totalPages} 
                onPageChange={setWebsitePage}
                isLoading={websiteLoading}
              />
            </>
          )}
        </section>

        {/* Deleted Reviews Section */}
        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Deleted Reviews</h2>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per Page:</label>
              <select
                value={deletedItemsPerPage}
                onChange={(e) => {
                  setDeletedItemsPerPage(Number(e.target.value));
                  setDeletedPage(1);
                }}
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          {deletedLoading ? (
            <p className="px-4 py-6 text-sm text-slate-500">Loading deleted reviews...</p>
          ) : deletedReviews.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No deleted reviews available.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Customer</th>
                      <th scope="col" className="px-4 py-3">Product/Type</th>
                      <th scope="col" className="px-4 py-3">Rating</th>
                      <th scope="col" className="px-4 py-3">Comment</th>
                      <th scope="col" className="px-4 py-3">Deleted Date</th>
                      <th scope="col" className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {deletedReviews.map((review) => (
                      <tr key={review.id} className="bg-red-50">
                        <td className="px-4 py-3 text-slate-700">{review.customerName}</td>
                        <td className="px-4 py-3 text-slate-700">{review.productName || 'Website'}</td>
                        <td className="px-4 py-3"><StarRow rating={review.rating} /></td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{review.comment}</td>
                        <td className="px-4 py-3 text-slate-600 text-nowrap">{review.deletedAt ? new Date(review.deletedAt).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleRestore(review.id)}
                            className="rounded-lg border border-green-200 px-3 py-1 text-xs font-semibold text-green-600 hover:bg-green-50"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls 
                page={deletedPage} 
                totalPages={deletedPagination.totalPages} 
                onPageChange={setDeletedPage}
                isLoading={deletedLoading}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
