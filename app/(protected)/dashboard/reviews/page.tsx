'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';
import { apiDelete, apiGet } from '@/lib/api';

type ReviewRecord = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  productId?: string;
  productName?: string;
  createdAt: string;
  updatedAt?: string;
  externalId?: string;
};

export default function ReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadReviews = async () => {
      try {
        const data = await apiGet<ReviewRecord[]>('/reviews');
        if (isMounted) {
          setReviews(data);
        }
      } catch {
        if (isMounted) {
          setReviews([]);
          toast.error('Failed to load reviews.');
        }
      }
    };

    void loadReviews();

    return () => {
      isMounted = false;
    };
  }, []);

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

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reviews</h1>
          <p className="mt-1 text-sm text-slate-500">View customer reviews for products and website experience.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Reviews</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{reviews.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Rating</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{averageRating}</p>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              size={14}
                              className={index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{review.comment}</td>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Star
                              key={index}
                              size={14}
                              className={index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{review.comment}</td>
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
        </section>
      </div>
    </div>
  );
}
