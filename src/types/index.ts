export type OrderStatus = 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export interface OptionChoice {
  id: string;
  optionGroupId: string;
  name: string;
  price: number;
}

export interface OptionGroup {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  allowMultiple: boolean;
  minSelect: number;
  maxSelect: number;
  choices: OptionChoice[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  optionGroups?: OptionGroup[];
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  sortOrder: number;
  menuItems?: MenuItem[];
}

export interface RestaurantTable {
  id: string;
  restaurantId: string;
  name: string;
  token: string;
  createdAt: string | Date;
}

export interface SelectedOption {
  groupName: string;
  choiceName: string;
  price: number;
}

export interface CartItem {
  id: string; // unique cart entry id
  menuItemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  subtotal: number;
  imageUrl?: string | null;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string | null;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  selectedOptions?: string | null;
  menuItem?: MenuItem | null;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  orderNumber: number;
  customerName: string;
  customerNote: string | null;
  status: OrderStatus;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  table: RestaurantTable;
  items: OrderItem[];
}

export interface Restaurant {
  id: string;
  userId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  currency: string;
  address: string | null;
  phone: string | null;
  categories?: Category[];
  tables?: RestaurantTable[];
}
