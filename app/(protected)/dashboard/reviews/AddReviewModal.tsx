'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export type ReviewDraft = {
  customerName: string;
  productName: string;
  comment: string;
  rating: number;
};

type Props = {
  onClose: () => void;
  onSave: (draft: ReviewDraft) => void;
};

const emptyDraft: ReviewDraft = {
  customerName: '',
  productName: '',
  comment: '',
  rating: 0,
};

export default function AddReviewModal({ onClose, onSave }: Props) {
  const [draft, setDraft] = useState<ReviewDraft>(emptyDraft);
  const [error, setError] = useState('');

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [onClose]);

  const handleSubmit = () => {
    if (!draft.customerName.trim()) {
      setError('Customer name is required.');
      return;
    }

    if (!draft.comment.trim()) {
      setError('Review comment is required.');
      return;
    }

    if (draft.rating < 1 || draft.rating > 5) {
      setError('Please select a star rating.');
      return;
    }

    setError('');
    onSave({
      customerName: draft.customerName.trim(),
      productName: draft.productName.trim(),
      comment: draft.comment.trim(),
      rating: draft.rating,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Add Review</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close add review modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Customer Name</label>
            <input
              value={draft.customerName}
              onChange={(event) => setDraft((prev) => ({ ...prev, customerName: event.target.value }))}
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Product Name (optional)</label>
            <input
              value={draft.productName}
              onChange={(event) => setDraft((prev) => ({ ...prev, productName: event.target.value }))}
              placeholder="e.g. Formal Shirt"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>

          <div>
            <p className="mb-1.5 block text-sm font-medium text-slate-700">Star Rating</p>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, index) => {
                const starValue = index + 1;
                const active = starValue <= draft.rating;

                return (
                  <button
                    key={starValue}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, rating: starValue }))}
                    className="rounded-md p-1"
                    aria-label={`Set rating to ${starValue}`}
                  >
                    <svg
                      className={`h-6 w-6 ${active ? 'text-amber-400' : 'text-slate-300'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.447a1 1 0 00-.364 1.118l1.287 3.958c.3.921-.755 1.688-1.539 1.118L10 15.347l-3.366 2.447c-.784.57-1.838-.197-1.539-1.118l1.287-3.958a1 1 0 00-.364-1.118L2.65 9.385c-.783-.57-.38-1.81.588-1.81H7.4a1 1 0 00.95-.69l1.286-3.958z" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Review</label>
            <textarea
              value={draft.comment}
              onChange={(event) => setDraft((prev) => ({ ...prev, comment: event.target.value }))}
              rows={4}
              placeholder="Write customer feedback"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              Save Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
