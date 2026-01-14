export interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  contact_person: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  default_price: number;
  unit: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorePrice {
  id: string;
  store_id: string;
  product_id: string;
  custom_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  store_id: string;
  sales_user_id: string | null;
  total_amount: number;
  notes: string | null;
  whatsapp_sent: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  store?: Store;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  notes: string | null;
  created_at: string;
  product?: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}
