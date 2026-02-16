/**
 * Mock accounting provider — in-memory implementation for development.
 */
import { v4 as uuid } from 'uuid';
import type {
  AccountingProvider,
  AccountingCustomer,
  AccountingInvoice,
  AccountingLineItem,
  CreateAccountingInvoiceParams,
  SyncResult,
} from './accounting-provider';

export class MockAccountingProvider implements AccountingProvider {
  readonly name = 'mock-accounting';

  private customers = new Map<string, AccountingCustomer>();
  private invoices = new Map<string, AccountingInvoice>();

  async syncCustomer(tenantId: string, name: string, email: string): Promise<AccountingCustomer> {
    // Check if customer already exists by email
    for (const c of this.customers.values()) {
      if (c.email === email) return c;
    }

    const customer: AccountingCustomer = {
      id: `qb_cust_${uuid().slice(0, 8)}`,
      displayName: name,
      email,
      balance: 0,
      syncedAt: new Date().toISOString(),
    };
    this.customers.set(customer.id, customer);
    return customer;
  }

  async getCustomer(accountingCustomerId: string): Promise<AccountingCustomer | null> {
    return this.customers.get(accountingCustomerId) ?? null;
  }

  async createInvoice(params: CreateAccountingInvoiceParams): Promise<AccountingInvoice> {
    const totalAmount = params.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const invoice: AccountingInvoice = {
      id: `qb_inv_${uuid().slice(0, 8)}`,
      customerId: params.customerId,
      invoiceNumber: params.invoiceNumber,
      totalAmount,
      balance: totalAmount,
      dueDate: params.dueDate,
      status: 'sent',
      lineItems: params.lineItems,
      syncedAt: new Date().toISOString(),
    };
    this.invoices.set(invoice.id, invoice);
    return invoice;
  }

  async getInvoice(invoiceId: string): Promise<AccountingInvoice | null> {
    return this.invoices.get(invoiceId) ?? null;
  }

  async voidInvoice(invoiceId: string): Promise<AccountingInvoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
    const updated = { ...invoice, status: 'voided' as const, balance: 0, syncedAt: new Date().toISOString() };
    this.invoices.set(invoiceId, updated);
    return updated;
  }

  async markInvoicePaid(invoiceId: string, _paymentDate: string, amount: number): Promise<AccountingInvoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);
    const updated = {
      ...invoice,
      status: 'paid' as const,
      balance: Math.max(0, invoice.balance - amount),
      syncedAt: new Date().toISOString(),
    };
    this.invoices.set(invoiceId, updated);
    return updated;
  }

  async syncAllInvoices(_tenantId: string): Promise<SyncResult> {
    return { synced: this.invoices.size, failed: 0, errors: [] };
  }

  async isConnected(): Promise<boolean> {
    return true;
  }
}
