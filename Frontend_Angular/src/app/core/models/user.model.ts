export type UserRole='SUPER_ADMIN'|'OWNER'|'MANAGER'|'RECEPTIONIST'|'STYLIST'|'THERAPIST'|'CASHIER'|'MARKETING_EXECUTIVE';
export interface User{ id:string; fullName:string; email:string; role:UserRole; }
