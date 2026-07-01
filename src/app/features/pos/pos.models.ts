export interface PosSale {
  id: string;
  branchId: string;
  clientId: string | null;
  staffId: string | null;
  items: PosSaleItem[];
  totalAmount: number;
  paymentMethod: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; fullName: string } | null;
}

export interface PosSaleItem {
  id: string;
  saleId: string;
  serviceId: string | null;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}
