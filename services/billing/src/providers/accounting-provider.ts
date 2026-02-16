/**
 * Accounting provider interface — abstracts QuickBooks, Xero, or future providers.
 */

export interface AccountingCustomer {
  id: string;
  displayName: string;
  email: string;
  balance: number;
  syncedAt: string;
}

export interface AccountingInvoice {
  id: string;
  customerId: string;
  invoiceNumber: string;
  totalAmount: number;
  balance: number;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'voided';
  lineItems: AccountingLineItem[];
  syncedAt: string;
}

export interface AccountingLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
}

export interface CreateAccountingInvoiceParams {
  customerId: string;
  invoiceNumber: string;
  dueDate: string;
  lineItems: AccountingLineItem[];
  memo?: string;
}

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface AccountingProvider {
  readonly name: string;

  // Customer sync
  syncCustomer(tenantId: string, name: string, email: string): Promise<AccountingCustomer>;
  getCustomer(accountingCustomerId: string): Promise<AccountingCustomer | null>;

  // Invoice operations
  createInvoice(params: CreateAccountingInvoiceParams): Promise<AccountingInvoice>;
  getInvoice(invoiceId: string): Promise<AccountingInvoice | null>;
  voidInvoice(invoiceId: string): Promise<AccountingInvoice>;
  markInvoicePaid(invoiceId: string, paymentDate: string, amount: number): Promise<AccountingInvoice>;

  // Batch sync
  syncAllInvoices(tenantId: string): Promise<SyncResult>;

  // Health check
  isConnected(): Promise<boolean>;
}
