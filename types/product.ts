export type VariantStock = {
  color: string;
  size: string;
  stock: number;
};

export type Product = {
  id: number | string;
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
  variantStock: VariantStock[];
  imageUrls?: string[];
  coverImageUrl?: string;
  imageUrl?: string;
};

export const CATEGORY_MAP: Record<string, string[]> = {
  Men: ['Formals', 'GYM', 'Jeans', 'Party', 'Shirts', 'Shoes'],
  Women: ['Dresses', 'Formals', 'GYM', 'Jeans', 'Party', 'Shirts', 'Shoes'],
  Kids: ['Boys', 'Girls', 'Toddlers', 'Shoes', 'Accessories'],
  Accessories: [],
  'Dress Style': [],
};

export const COLOR_OPTIONS = [
  { label: 'Black',   hex: '#111111' },
  { label: 'White',   hex: '#FFFFFF' },
  { label: 'Red',     hex: '#EF4444' },
  { label: 'Charcoal', hex: '#111111' },
  { label: 'Navy',    hex: '#1E3A5F' },
  { label: 'Green',   hex: '#22C55E' },
  { label: 'Yellow',  hex: '#EAB308' },
  { label: 'Orange',  hex: '#F97316' },
  { label: 'Pink',    hex: '#EC4899' },
  { label: 'Purple',  hex: '#A855F7' },
  { label: 'Grey',    hex: '#9CA3AF' },
  { label: 'Brown',   hex: '#92400E' },
  { label: 'Beige',   hex: '#D4B483' },
  { label: 'Unknown', hex: '#E2E8F0' },
] as const;

export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'One Size'];
export const SHOE_SIZES   = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];

export const BRAND_OPTIONS = ['Nike', 'Adidas', 'Puma', 'Zara', 'H&M', 'Gucci', 'Levis', 'Uniqlo'];
export const DRESS_TYPE_OPTIONS = ['Casual', 'Formal', 'Gym', 'Party', 'Maxi', 'Midi', 'Mini', 'Bodycon', 'A-Line'];

export function toggleItem<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700 bg-white';
