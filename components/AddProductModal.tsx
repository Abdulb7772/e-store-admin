'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { X, ImageIcon, Loader2 } from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  type Product,
  type VariantStock,
  CATEGORY_MAP,
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  SHOE_SIZES,
  BRAND_OPTIONS,
  DRESS_TYPE_OPTIONS,
  INPUT_CLASS,
  toggleItem,
} from '@/types/product';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
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
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body,
  });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

type FormData = Omit<Product, 'id'>;
type FormErrors = Partial<Record<keyof FormData, string>>;
type SelectedImage = {
  id: string;
  previewUrl: string;
  sourceUrl?: string;
  file?: File;
};

const getVariantKey = (color: string, size: string) => `${color}__${size}`;

function buildVariantStock(colors: string[], sizes: string[], current: VariantStock[]): VariantStock[] {
  const currentMap = new Map(
    current.map((item) => [getVariantKey(item.color, item.size), item.stock]),
  );
  const next: VariantStock[] = [];

  colors.forEach((color) => {
    sizes.forEach((size) => {
      const key = getVariantKey(color, size);
      next.push({ color, size, stock: currentMap.get(key) ?? 0 });
    });
  });

  return next;
}

const totalStock = (variantStock: VariantStock[]): number =>
  variantStock.reduce((sum, item) => sum + item.stock, 0);

const emptyForm = (): FormData => ({
  name: '',
  description: '',
  brand: '',
  dressType: '',
  category: '',
  subCategory: '',
  price: 0,
  stock: 0,
  colors: [],
  sizes: [],
  variantStock: [],
  imageUrls: [],
  coverImageUrl: '',
  imageUrl: '',
});

type Props = {
  onSave: (data: FormData) => void;
  onClose: () => void;
  initialData?: FormData;
  title?: string;
  submitLabel?: string;
};

export default function AddProductModal({
  onSave,
  onClose,
  initialData,
  title = 'Add New Product',
  submitLabel = 'Save Product',
}: Props) {
  const [form, setForm] = useState<FormData>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [coverImageId, setCoverImageId] = useState('');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const subCategories = CATEGORY_MAP[form.category] ?? [];
  const sizePool = form.subCategory === 'Shoes' ? SHOE_SIZES : SIZE_OPTIONS;
  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const descriptionEditor = useEditor({
    extensions: [StarterKit],
    content: form.description || '<p></p>',
    editorProps: {
      attributes: {
        class:
          'min-h-[170px] px-4 py-3 text-sm text-slate-700 focus:outline-none [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-[15px] [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:leading-6 [&_ul]:list-disc [&_ul]:pl-5',
      },
    },
    onUpdate: ({ editor }) => {
      set('description', editor.getHTML());
    },
  });

  const revokeNewPreviews = (images: SelectedImage[]) => {
    images.forEach((image) => {
      if (image.file) URL.revokeObjectURL(image.previewUrl);
    });
  };

  const buildExistingImages = (data: FormData): SelectedImage[] => {
    const urls = Array.isArray(data.imageUrls) && data.imageUrls.length > 0
      ? data.imageUrls
      : data.imageUrl
        ? [data.imageUrl]
        : [];

    return urls
      .filter((url) => typeof url === 'string' && url.trim().length > 0)
      .map((url, index) => ({
        id: `existing-${index}-${url}`,
        previewUrl: url,
        sourceUrl: url,
      }));
  };

  useEffect(() => {
    if (initialData) {
      const existingImages = buildExistingImages(initialData);
      const explicitCover = initialData.coverImageUrl || initialData.imageUrl || '';
      const initialCoverId =
        existingImages.find((image) => image.previewUrl === explicitCover)?.id || existingImages[0]?.id || '';

      setForm({
        ...initialData,
        description: initialData.description ?? '',
        dressType: initialData.dressType ?? '',
        imageUrls: existingImages.map((image) => image.previewUrl),
        coverImageUrl: explicitCover,
        imageUrl: explicitCover,
      });
      setSelectedImages((prev) => {
        revokeNewPreviews(prev);
        return existingImages;
      });
      setCoverImageId(initialCoverId);
      setErrors({});
      setUploadState('idle');
      return;
    }

    setForm(emptyForm());
    setSelectedImages((prev) => {
      revokeNewPreviews(prev);
      return [];
    });
    setCoverImageId('');
    setErrors({});
    setUploadState('idle');
  }, [initialData]);

  useEffect(() => {
    if (!descriptionEditor) return;

    const nextDescription = form.description?.trim() ? form.description : '<p></p>';
    if (descriptionEditor.getHTML() !== nextDescription) {
      descriptionEditor.commands.setContent(nextDescription, false);
    }
  }, [descriptionEditor, form.description]);

  const handleCategoryChange = (cat: string) => {
    setForm((prev) => {
      const nextSizes: string[] = [];
      const nextVariantStock = buildVariantStock(prev.colors, nextSizes, prev.variantStock);
      return {
        ...prev,
        category: cat,
        subCategory: '',
        dressType: prev.dressType,
        sizes: nextSizes,
        variantStock: nextVariantStock,
        stock: totalStock(nextVariantStock),
      };
    });
  };

  const handleSubCategoryChange = (subCategory: string) => {
    setForm((prev) => {
      const nextSizes: string[] = [];
      const nextVariantStock = buildVariantStock(prev.colors, nextSizes, prev.variantStock);
      return {
        ...prev,
        subCategory,
        dressType: prev.dressType,
        sizes: nextSizes,
        variantStock: nextVariantStock,
        stock: totalStock(nextVariantStock),
      };
    });
  };

  const toggleColor = (color: string) => {
    setForm((prev) => {
      const nextColors = toggleItem(prev.colors, color);
      const nextVariantStock = buildVariantStock(nextColors, prev.sizes, prev.variantStock);
      return {
        ...prev,
        colors: nextColors,
        variantStock: nextVariantStock,
        stock: totalStock(nextVariantStock),
      };
    });
  };

  const toggleSize = (size: string) => {
    setForm((prev) => {
      const nextSizes = toggleItem(prev.sizes, size);
      const nextVariantStock = buildVariantStock(prev.colors, nextSizes, prev.variantStock);
      return {
        ...prev,
        sizes: nextSizes,
        variantStock: nextVariantStock,
        stock: totalStock(nextVariantStock),
      };
    });
  };

  const setVariantStock = (color: string, size: string, stockValue: number) => {
    const safeStock = Number.isFinite(stockValue) ? Math.max(0, stockValue) : 0;
    setForm((prev) => {
      const nextVariantStock = prev.variantStock.map((item) =>
        item.color === color && item.size === size ? { ...item, stock: safeStock } : item,
      );
      return {
        ...prev,
        variantStock: nextVariantStock,
        stock: totalStock(nextVariantStock),
      };
    });
  };

  const handlePickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const newImages: SelectedImage[] = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}-${file.name}-${file.lastModified}`,
      previewUrl: URL.createObjectURL(file),
      file,
    }));

    setSelectedImages((prev) => {
      const merged = [...prev, ...newImages];
      if (!coverImageId && merged.length > 0) {
        setCoverImageId(merged[0].id);
      }
      return merged;
    });
    setUploadState('idle');
    setErrors((prev) => ({ ...prev, imageUrls: undefined, imageUrl: undefined, coverImageUrl: undefined }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (imageId: string) => {
    setSelectedImages((prev) => {
      const toRemove = prev.find((image) => image.id === imageId);
      if (toRemove?.file) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }

      const next = prev.filter((image) => image.id !== imageId);
      if (coverImageId === imageId) {
        setCoverImageId(next[0]?.id ?? '');
      }
      return next;
    });
    setUploadState('idle');
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.brand.trim()) e.brand = 'Required';
    if (!form.category) e.category = 'Required';
    if (subCategories.length && !form.subCategory) e.subCategory = 'Required';
    if (!form.price || form.price <= 0) e.price = 'Must be > 0';
    if (!form.colors.length) e.colors = 'Select at least one';
    if (!form.sizes.length) e.sizes = 'Select at least one';
    if (!form.variantStock.length) e.variantStock = 'Set stock for each color and size';
    if (form.variantStock.some((item) => item.stock < 0 || !Number.isFinite(item.stock))) {
      e.variantStock = 'Stock values must be valid non-negative numbers';
    }
    if (selectedImages.length > 0 && !coverImageId) {
      e.coverImageUrl = 'Select a cover image';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    let finalImageUrls: string[] = [];
    let finalCoverImageUrl = '';

    if (selectedImages.length > 0) {
      try {
        setUploadState('uploading');

        const uploadedEntries = await Promise.all(
          selectedImages.map(async (image) => {
            if (image.sourceUrl) return { id: image.id, url: image.sourceUrl };
            if (!image.file) return null;
            const uploadedUrl = await uploadToCloudinary(image.file);
            return { id: image.id, url: uploadedUrl };
          }),
        );

        const validEntries = uploadedEntries.filter((entry): entry is { id: string; url: string } => {
          return Boolean(entry?.url);
        });

        finalImageUrls = validEntries.map((entry) => entry.url);
        finalCoverImageUrl =
          validEntries.find((entry) => entry.id === coverImageId)?.url || finalImageUrls[0] || '';
        setUploadState('idle');
      } catch {
        setUploadState('error');
        setErrors((prev) => ({
          ...prev,
          imageUrls: 'Image upload failed. Check Cloudinary config.',
        }));
        return;
      }
    }

    const finalVariantStock = form.variantStock.map((item) => ({
      ...item,
      stock: Math.max(0, Math.floor(item.stock || 0)),
    }));

    onSave({
      ...form,
      variantStock: finalVariantStock,
      stock: totalStock(finalVariantStock),
      imageUrls: finalImageUrls,
      coverImageUrl: finalCoverImageUrl,
      imageUrl: finalCoverImageUrl,
    });
  };

  const handleClose = () => {
    revokeNewPreviews(selectedImages);
    onClose();
  };

  const toggleHeadingLevel = (level: 1 | 2) => {
    if (!descriptionEditor) return;
    const chain = descriptionEditor.chain().focus();

    if (descriptionEditor.isActive('heading', { level })) {
      chain.setParagraph().run();
      return;
    }

    chain.setHeading({ level }).run();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl overflow-hidden bg-white shadow-2xl my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-black rounded-t-2xl">
          <h2 className="text-lg font-bold text-slate-400">{title}</h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Product Images</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePickFiles}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors"
            >
              <ImageIcon size={22} className="text-slate-400" />
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-black">Click to upload</span> one or more images
              </p>
            </button>

            {selectedImages.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedImages.map((image) => {
                  const isCover = coverImageId === image.id;

                  return (
                    <div
                      key={image.id}
                      className={`relative rounded-xl overflow-hidden border bg-slate-50 ${
                        isCover ? 'border-black ring-1 ring-slate-700' : 'border-slate-200'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.previewUrl} alt="preview" className="w-full h-28 object-cover" />

                      <div className="p-2 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setCoverImageId(image.id)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                            isCover
                              ? 'bg-black text-slate-300 border-black'
                              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                          }`}
                        >
                          {isCover ? 'Cover Image' : 'Set as Cover'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(image.id)}
                          className="p-1 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
                          aria-label="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-2">Add one or more product images. You can mark one as cover.</p>
            )}
            {(errors.imageUrls || errors.coverImageUrl || errors.imageUrl) && (
              <p className="text-xs text-rose-500 mt-1">{errors.imageUrls || errors.coverImageUrl || errors.imageUrl}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Product Name *</label>
              <input
                type="text"
                placeholder="e.g. Slim Fit Shirt"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={INPUT_CLASS}
              />
              {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Brand *</label>
              <select
                value={form.brand}
                onChange={(e) => set('brand', e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select brand</option>
                {BRAND_OPTIONS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              {errors.brand && <p className="text-xs text-rose-500 mt-1">{errors.brand}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <div className="overflow-hidden rounded-xl border border-slate-300 bg-white">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
                <button
                  type="button"
                  onClick={() => descriptionEditor?.chain().focus().toggleBold().run()}
                  className={`rounded-md border px-3.5 py-1.5 text-base font-bold leading-none transition-colors ${
                    descriptionEditor?.isActive('bold')
                      ? 'border-slate-500 bg-slate-200 text-slate-900'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => descriptionEditor?.chain().focus().toggleItalic().run()}
                  className={`rounded-md border px-3.5 py-1.5 text-base italic leading-none transition-colors ${
                    descriptionEditor?.isActive('italic')
                      ? 'border-slate-500 bg-slate-200 text-slate-900'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => descriptionEditor?.chain().focus().toggleBulletList().run()}
                  className={`rounded-md border px-3.5 py-1.5 text-sm font-semibold leading-none transition-colors ${
                    descriptionEditor?.isActive('bulletList')
                      ? 'border-slate-500 bg-slate-200 text-slate-900'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label="Bullet list"
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => descriptionEditor?.chain().focus().toggleOrderedList().run()}
                  className={`rounded-md border px-3.5 py-1.5 text-sm font-semibold leading-none transition-colors ${
                    descriptionEditor?.isActive('orderedList')
                      ? 'border-slate-500 bg-slate-200 text-slate-900'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label="Numbered list"
                >
                  1. List
                </button>
                <button
                  type="button"
                  onClick={() => toggleHeadingLevel(1)}
                  className={`rounded-md border px-3.5 py-1.5 text-sm font-semibold leading-none transition-colors ${
                    descriptionEditor?.isActive('heading', { level: 1 })
                      ? 'border-slate-500 bg-slate-200 text-slate-900'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label="Heading 1"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => toggleHeadingLevel(2)}
                  className={`rounded-md border px-3.5 py-1.5 text-sm font-semibold leading-none transition-colors ${
                    descriptionEditor?.isActive('heading', { level: 2 })
                      ? 'border-slate-500 bg-slate-200 text-slate-900'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  aria-label="Heading 2"
                >
                  H2
                </button>
              </div>
              <EditorContent editor={descriptionEditor} />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Use rich text formatting for product details.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
              <select
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select category</option>
                {Object.keys(CATEGORY_MAP).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {errors.category && <p className="text-xs text-rose-500 mt-1">{errors.category}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sub-Category{subCategories.length > 0 ? ' *' : ''}
              </label>
              <select
                value={form.subCategory}
                onChange={(e) => handleSubCategoryChange(e.target.value)}
                disabled={subCategories.length === 0}
                className={INPUT_CLASS + (subCategories.length === 0 ? ' opacity-50 cursor-not-allowed' : '')}
              >
                <option value="">
                  {subCategories.length === 0 ? 'N/A for this category' : 'Select sub-category'}
                </option>
                {subCategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.subCategory && <p className="text-xs text-rose-500 mt-1">{errors.subCategory}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dress Type (Optional)</label>
            <select
              value={form.dressType ?? ''}
              onChange={(e) => set('dressType', e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select dress type (optional)</option>
              {DRESS_TYPE_OPTIONS.map((dressType) => (
                <option key={dressType} value={dressType}>
                  {dressType}
                </option>
              ))}
            </select>
            {errors.dressType && <p className="text-xs text-rose-500 mt-1">{errors.dressType}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Price ($) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={form.price || ''}
                onChange={(e) => set('price', Number(e.target.value))}
                className={INPUT_CLASS}
              />
              {errors.price && <p className="text-xs text-rose-500 mt-1">{errors.price}</p>}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="block text-xs font-semibold text-slate-600">Total Stock</label>
              <p className="text-lg font-bold text-slate-800 leading-7">{form.stock}</p>
              <p className="text-[11px] text-slate-500">Auto-calculated from variant stock below</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Colors *</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(({ label, hex }) => {
                const selected = form.colors.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleColor(label)}
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Sizes *
              {!form.category && (
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
                      onClick={() => toggleSize(size)}
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Stock Per Color and Size *</label>
            {form.colors.length > 0 && form.sizes.length > 0 ? (
              <div className="space-y-3">
                {form.colors.map((color) => (
                  <div key={color} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-700 mb-2">{color}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {form.sizes.map((size) => {
                        const existing = form.variantStock.find(
                          (item) => item.color === color && item.size === size,
                        );
                        const value = existing?.stock ?? 0;
                        return (
                          <label key={`${color}-${size}`} className="text-xs text-slate-600">
                            <span className="mb-1 block">{size}</span>
                            <input
                              type="number"
                              min="0"
                              className={INPUT_CLASS}
                              value={value}
                              onChange={(e) => setVariantStock(color, size, Number(e.target.value))}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Select at least one color and one size to assign stock.
              </p>
            )}
            {errors.variantStock && <p className="text-xs text-rose-500 mt-1">{errors.variantStock}</p>}
          </div>
        </div>

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
            onClick={() => {
              void handleSave();
            }}
            disabled={uploadState === 'uploading'}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {uploadState === 'uploading' && <Loader2 size={14} className="animate-spin" />}
            {uploadState === 'uploading' ? 'Uploading…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
