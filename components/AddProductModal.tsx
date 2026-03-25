'use client';

import { ChangeEvent, useRef, useState } from 'react';
import { X, ImageIcon, Loader2 } from 'lucide-react';
import {
  type Product,
  CATEGORY_MAP,
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  SHOE_SIZES,
  INPUT_CLASS,
  toggleItem,
} from '@/types/product';

// ─── Cloudinary ───────────────────────────────────────────────────────────────

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    ?? '';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary env vars not set. Add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to .env.local',
    );
  }
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body },
  );
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = Omit<Product, 'id'>;
type FormErrors = Partial<Record<keyof FormData, string>>;

const emptyForm = (): FormData => ({
  name: '', brand: '', category: '', subCategory: '',
  price: 0, stock: 0, colors: [], sizes: [], imageUrl: '',
});

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  onSave: (data: FormData) => void;
  onClose: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddProductModal({ onSave, onClose }: Props) {
  const [form, setForm]               = useState<FormData>(emptyForm());
  const [errors, setErrors]           = useState<FormErrors>({});
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  const subCategories = CATEGORY_MAP[form.category] ?? [];
  const sizePool      = form.subCategory === 'Shoes' ? SHOE_SIZES : SIZE_OPTIONS;

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleCategoryChange = (cat: string) =>
    setForm((prev) => ({ ...prev, category: cat, subCategory: '', sizes: [] }));

  // ── Image helpers ───────────────────────────────────────────────────────────

  const handlePickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setUploadState('idle');
    setErrors((prev) => ({ ...prev, imageUrl: undefined }));
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setUploadState('idle');
    set('imageUrl', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim())  e.name  = 'Required';
    if (!form.brand.trim()) e.brand = 'Required';
    if (!form.category)     e.category = 'Required';
    if (subCategories.length && !form.subCategory) e.subCategory = 'Required';
    if (!form.price || form.price <= 0) e.price = 'Must be > 0';
    if (form.stock < 0)                 e.stock = 'Cannot be negative';
    if (!form.colors.length)            e.colors = 'Select at least one';
    if (!form.sizes.length)             e.sizes  = 'Select at least one';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;

    let finalImageUrl = form.imageUrl ?? '';

    if (imageFile) {
      try {
        setUploadState('uploading');
        finalImageUrl = await uploadToCloudinary(imageFile);
        setUploadState('idle');
      } catch {
        setUploadState('error');
        setErrors((prev) => ({
          ...prev,
          imageUrl: 'Image upload failed. Check Cloudinary config.',
        }));
        return;
      }
    }

    onSave({ ...form, imageUrl: finalImageUrl });
  };

  const handleClose = () => {
    handleRemoveImage();
    onClose();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 my-8">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Add New Product</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Product Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickFile}
            />
            {imagePreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white border border-slate-200 text-slate-600"
                >
                  <X size={14} />
                </button>
                <p className="absolute bottom-2 left-2 text-xs text-slate-500 bg-white/80 px-2 py-0.5 rounded-full">
                  {imageFile?.name}
                </p>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-36 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-700 hover:bg-slate-100 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <ImageIcon size={28} className="text-slate-400" />
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-black">Click to upload</span> or drag &amp; drop
                </p>
                <p className="text-xs text-slate-400">PNG, JPG, WEBP up to 10 MB</p>
              </button>
            )}
            {errors.imageUrl && <p className="text-xs text-rose-500 mt-1">{errors.imageUrl}</p>}
          </div>

          {/* Name + Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
              <input type="text" placeholder="e.g. Slim Fit Shirt" value={form.name}
                onChange={(e) => set('name', e.target.value)} className={INPUT_CLASS} />
              {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Brand *</label>
              <input type="text" placeholder="e.g. Nike" value={form.brand}
                onChange={(e) => set('brand', e.target.value)} className={INPUT_CLASS} />
              {errors.brand && <p className="text-xs text-rose-500 mt-1">{errors.brand}</p>}
            </div>
          </div>

          {/* Category + Sub-Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} className={INPUT_CLASS}>
                <option value="">Select category</option>
                {Object.keys(CATEGORY_MAP).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sub-Category{subCategories.length > 0 ? ' *' : ''}
              </label>
              <select
                value={form.subCategory}
                onChange={(e) => { set('subCategory', e.target.value); set('sizes', []); }}
                disabled={subCategories.length === 0}
                className={INPUT_CLASS + (subCategories.length === 0 ? ' opacity-50 cursor-not-allowed' : '')}
              >
                <option value="">
                  {subCategories.length === 0 ? 'N/A for this category' : 'Select sub-category'}
                </option>
                {subCategories.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.subCategory && <p className="text-xs text-rose-500 mt-1">{errors.subCategory}</p>}
            </div>
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Price ($) *</label>
              <input type="number" step="0.01" min="0" placeholder="0.00"
                value={form.price || ''} onChange={(e) => set('price', Number(e.target.value))} className={INPUT_CLASS} />
              {errors.price && <p className="text-xs text-rose-500 mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Stock *</label>
              <input type="number" min="0" placeholder="0"
                value={form.stock || ''} onChange={(e) => set('stock', Number(e.target.value))} className={INPUT_CLASS} />
              {errors.stock && <p className="text-xs text-rose-500 mt-1">{errors.stock}</p>}
            </div>
          </div>

          {/* Colors */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Colors *</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(({ label, hex }) => {
                const selected = form.colors.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => set('colors', toggleItem(form.colors, label))}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      selected
                        ? 'border-black bg-slate-100 text-black ring-1 ring-slate-500'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.colors && <p className="text-xs text-rose-500 mt-1">{errors.colors}</p>}
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Sizes *{!form.category && (
                <span className="font-normal text-slate-400"> (select a category first)</span>
              )}
            </label>
            {form.category ? (
              <div className="flex flex-wrap gap-2">
                {sizePool.map((size) => {
                  const selected = form.sizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => set('sizes', toggleItem(form.sizes, size))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        selected
                          ? 'border-black bg-black text-slate-400'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Select a category to see size options.</p>
            )}
            {errors.sizes && <p className="text-xs text-rose-500 mt-1">{errors.sizes}</p>}
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleSave(); }}
            disabled={uploadState === 'uploading'}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {uploadState === 'uploading' && <Loader2 size={14} className="animate-spin" />}
            {uploadState === 'uploading' ? 'Uploading…' : 'Save Product'}
          </button>
        </div>

      </div>
    </div>
  );
}
