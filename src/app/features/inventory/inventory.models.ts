export interface InventoryProduct {
  id: string;
  branchId: string;
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
