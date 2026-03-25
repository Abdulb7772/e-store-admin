export type Product = {
  id: number;
  name: string;
  brand: string;
  category: string;
  subCategory: string;
  price: number;
  stock: number;
  colors: string[];
  sizes: string[];
  imageUrl?: string;
};

export const CATEGORY_MAP: Record<string, string[]> = {
  Men: ['Formals', 'GYM', 'Jeans', 'Party', 'Shirts', 'Shoes'],
  Women: ['Dresses', 'Formals', 'GYM', 'Jeans', 'Party', 'Shirts', 'Shoes'],
  Kids: ['Boys', 'Girls', 'Toddlers', 'Shoes', 'Accessories'],
  Accessories: [],
};

export const COLOR_OPTIONS = [
  { label: 'Black',   hex: '#111111' },
  { label: 'White',   hex: '#FFFFFF' },
  { label: 'Red',     hex: '#EF4444' },
  { label: 'Blue',    hex: '#3B82F6' },
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

export const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: 'Classic Cotton Shirt', brand: 'H&M',   category: 'Men',         subCategory: 'Shirts', price: 39.99, stock: 52, colors: ['White', 'Blue'],  sizes: ['S', 'M', 'L', 'XL'] },
  { id: 2, name: 'Women Running Shoes',  brand: 'Nike',  category: 'Women',       subCategory: 'Shoes',  price: 79.00, stock: 18, colors: ['Black', 'Pink'],  sizes: ['37', '38', '39', '40'] },
  { id: 3, name: 'Kids Hoodie',          brand: 'Zara',  category: 'Kids',        subCategory: 'Boys',   price: 29.50, stock: 33, colors: ['Grey', 'Navy'],   sizes: ['S', 'M', 'L'] },
  { id: 4, name: 'Leather Wallet',       brand: 'Gucci', category: 'Accessories', subCategory: '',       price: 25.00, stock: 10, colors: ['Brown', 'Black'], sizes: ['One Size'] },
];

export function toggleItem<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

export const INPUT_CLASS =
  'w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
