export interface InventoryProduct {
  id: string;
  branchId: string;
  branchName?: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  minStockLevel: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  transactions?: InventoryTransaction[];
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  notes: string | null;
  createdAt: string;
}

export interface StockLedgerEntry {
  date: string;
  type: string;
  in: number;
  out: number;
  balance: number;
  reference: string;
  notes: string;
}

export interface Warehouse {
  id: string;
  name: string;
  branchId: string;
  location: string;
  capacity: number;
  status: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  gst: string;
  pan: string;
  address: string;
  rating: number;
  status: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate: string;
  status: string;
  totalAmount: number;
  items: any[];
}

export interface BatchInfo {
  id: string;
  batchNumber: string;
  productId: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  status: string;
}

export interface StockCount {
  id: string;
  productId: string;
  expectedQty: number;
  actualQty: number;
  variance: number;
  status: string;
  date: string;
}
