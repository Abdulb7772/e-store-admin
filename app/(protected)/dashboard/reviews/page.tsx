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

const ITEMS_PER_PAGE = 10;

export default function ReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [deletedReviews, setDeletedReviews] = useState<ReviewRecord[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [websitePage, setWebsitePage] = useState(1);
  const [deletedPage, setDeletedPage] = useState(1);
  const [productMeta, setProductMeta] = useState({ total: 0, totalPages: 0 });
  const [websiteMeta, setWebsiteMeta] = useState({ total: 0, totalPages: 0 });
  const [deletedMeta, setDeletedMeta] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    let isMounted = true;

    const loadReviews = async () => {
      try {
        // Load product reviews
        const productData = await apiGet<PaginationData<ReviewRecord>>('/reviews?type=product&limit=' + ITEMS_PER_PAGE + '&page=' + productPage);
        if (isMounted) {
          const filtered = productData.data.filter(r => !r.deletedAt);
          setReviews(filtered);
          setProductMeta({
            total: productData.pagination.total,
            totalPages: productData.pagination.totalPages,
          });
        }
      } catch {
        if (isMounted) {
          setReviews([]);
          toast.error('Failed to load product reviews.');
        }
      }
    };

    void loadReviews();

    return () => {
      isMounted = false;
    };
  }, [productPage]);

  useEffect(() => {
    let isMounted = true;

    const loadWebsiteReviews = async () => {
      try {
        const websiteData = await apiGet<PaginationData<ReviewRecord>>('/reviews?type=website&limit=' + ITEMS_PER_PAGE + '&page=' + websitePage);
        if (isMounted) {
          const filtered = websiteData.data.filter(r => !r.deletedAt);
          setDeletedReviews(filtered);
          setWebsiteMeta({
            total: websiteData.pagination.total,
            totalPages: websiteData.pagination.totalPages,
          });
        }
      } catch {
        if (isMounted) {
          setDeletedReviews([]);
          toast.error('Failed to load website reviews.');
        }
      }
    };

    void loadWebsiteReviews();

    return () => {
      isMounted = false;
    };
  }, [websitePage]);

  useEffect(() => {
    let isMounted = true;

    const loadDeletedReviews = async () => {
      try {
        const deletedData = await apiGet<PaginationData<ReviewRecord>>('/reviews/deleted?limit=' + ITEMS_PER_PAGE + '&page=' + deletedPage);
        if (isMounted) {
          setDeletedReviews(deletedData.data);
          setDeletedMeta({
            total: deletedData.pagination.total,
            totalPages: deletedData.pagination.totalPages,
          });
        }
      } catch {
        if (isMounted) {
          setDeletedReviews([]);
          toast.error('Failed to load deleted reviews.');
        }
      }
    };

    void loadDeletedReviews();

    return () => {
      isMounted = false;
    };
  }, [deletedPage]);

  const allReviews = useMemo(() => [...reviews, ...deletedReviews], [reviews, deletedReviews]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, item) => sum + item.rating, 0);
    return Math.round((total / reviews.length) * 10) / 10;
  }, [reviews]);

  const productReviews = useMemo(
    () => reviews.filter((review) => String(review.productName || '').trim().length > 0),
    [reviews],
  );

  const websiteReviews = useMemo(
    () => reviews.filter((review) => String(review.productName || '').trim().length === 0),
    [reviews],
  );

  const handleDelete = async (id: string) => {
    try {
      await apiDelete<{ id: string }>(`/reviews/${id}`);
      setReviews((prev) => prev.filter((item) => item.id !== id));
      toast.success('Review deleted.');
    } catch {
      toast.error('Failed to delete review.');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await apiPatch<ReviewRecord, {}>(`/reviews/${id}/restore`, {});
      setDeletedReviews((prev) => prev.filter((item) => item.id !== id));
      toast.success('Review restored.');
    } catch {
      toast.error('Failed to restore review.');
    }
  };

  const PaginationControls = ({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) => (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-600">Page {page} of {totalPages}</p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
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
          <p className="mt-2 text-2xl font-bold text-slate-800">{productMeta.total + websiteMeta.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Rating</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{averageRating}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Deleted Reviews</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{deletedMeta.total}</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Product Reviews</h2>
          </div>
          {productReviews.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No product reviews available.</p>
          ) : (
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
                      <td className="px-4 py-3 text-slate-600">{new Date(review.createdAt).toLocaleDateString()}</td>
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
          )}
          {productMeta.totalPages > 0 && <PaginationControls page={productPage} totalPages={productMeta.totalPages} onPageChange={setProductPage} />}
        </section>

        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Website Reviews</h2>
          </div>
          {websiteReviews.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No website reviews available.</p>
          ) : (
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
                      <td className="px-4 py-3 text-slate-600">{new Date(review.createdAt).toLocaleDateString()}</td>
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
          )}
          {websiteMeta.totalPages > 0 && <PaginationControls page={websitePage} totalPages={websiteMeta.totalPages} onPageChange={setWebsitePage} />}
        </section>

        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">Deleted Reviews</h2>
          </div>
          {deletedReviews.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No deleted reviews available.</p>
          ) : (
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
                      <td className="px-4 py-3 text-slate-600">{review.deletedAt ? new Date(review.deletedAt).toLocaleDateString() : '-'}</td>
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
          )}
          {deletedMeta.totalPages > 0 && <PaginationControls page={deletedPage} totalPages={deletedMeta.totalPages} onPageChange={setDeletedPage} />}
        </section>
      </div>
    </div>
  );
}
