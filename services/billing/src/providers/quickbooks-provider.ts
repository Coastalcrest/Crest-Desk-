/**
 * QuickBooks accounting provider — production implementation.
 * Requires QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET, QUICKBOOKS_REALM_ID.
 */
import { logger } from '../lib/logger';
import type {
  AccountingProvider,
  AccountingCustomer,
  AccountingInvoice,
  CreateAccountingInvoiceParams,
  SyncResult,
} from './accounting-provider';

export class QuickBooksProvider implements AccountingProvider {
  readonly name = 'quickbooks';

  private clientId: string;
  private clientSecret: string;
  private realmId: string;
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.clientId = process.env.QUICKBOOKS_CLIENT_ID ?? '';
    this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET ?? '';
    this.realmId = process.env.QUICKBOOKS_REALM_ID ?? '';
    this.baseUrl = process.env.QUICKBOOKS_SANDBOX === 'true'
      ? 'https://sandbox-quickbooks.api.intuit.com'
      : 'https://quickbooks.api.intuit.com';

    if (!this.clientId || !this.clientSecret || !this.realmId) {
      logger.warn('QuickBooks credentials not fully configured');
    }
  }

  private async apiRequest(method: string, endpoint: string, body?: unknown): Promise<any> {
    if (!this.accessToken) {
      throw new Error('QuickBooks not authenticated — call authenticate() first');
    }

    const url = `${this.baseUrl}/v3/company/${this.realmId}/${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, error: errorText }, 'QuickBooks API error');
      throw new Error(`QuickBooks API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async syncCustomer(tenantId: string, name: string, email: string): Promise<AccountingCustomer> {
    const result = await this.apiRequest('POST', 'customer', {
      DisplayName: name,
      PrimaryEmailAddr: { Address: email },
      Notes: `CrestDesk tenant: ${tenantId}`,
    });

    const customer = result.Customer;
    return {
      id: String(customer.Id),
      displayName: customer.DisplayName,
      email: customer.PrimaryEmailAddr?.Address ?? email,
      balance: customer.Balance ?? 0,
      syncedAt: new Date().toISOString(),
    };
  }

  async getCustomer(accountingCustomerId: string): Promise<AccountingCustomer | null> {
    try {
      const result = await this.apiRequest('GET', `customer/${accountingCustomerId}`);
      const customer = result.Customer;
      return {
        id: String(customer.Id),
        displayName: customer.DisplayName,
        email: customer.PrimaryEmailAddr?.Address ?? '',
        balance: customer.Balance ?? 0,
        syncedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async createInvoice(params: CreateAccountingInvoiceParams): Promise<AccountingInvoice> {
    const lineItems = params.lineItems.map((item, idx) => ({
      Id: String(idx + 1),
      LineNum: idx + 1,
      Amount: item.amount,
      DetailType: 'SalesItemLineDetail',
      Description: item.description,
      SalesItemLineDetail: {
        Qty: item.quantity,
        UnitPrice: item.unitAmount,
      },
    }));

    const result = await this.apiRequest('POST', 'invoice', {
      CustomerRef: { value: params.customerId },
      DocNumber: params.invoiceNumber,
      DueDate: params.dueDate,
      Line: lineItems,
      CustomerMemo: params.memo ? { value: params.memo } : undefined,
    });

    const invoice = result.Invoice;
    return {
      id: String(invoice.Id),
      customerId: String(invoice.CustomerRef.value),
      invoiceNumber: invoice.DocNumber,
      totalAmount: invoice.TotalAmt,
      balance: invoice.Balance,
      dueDate: invoice.DueDate,
      status: invoice.Balance === 0 ? 'paid' : 'sent',
      lineItems: params.lineItems,
      syncedAt: new Date().toISOString(),
    };
  }

  async getInvoice(invoiceId: string): Promise<AccountingInvoice | null> {
    try {
      const result = await this.apiRequest('GET', `invoice/${invoiceId}`);
      const invoice = result.Invoice;
      return {
        id: String(invoice.Id),
        customerId: String(invoice.CustomerRef.value),
        invoiceNumber: invoice.DocNumber,
        totalAmount: invoice.TotalAmt,
        balance: invoice.Balance,
        dueDate: invoice.DueDate,
        status: invoice.Balance === 0 ? 'paid' : 'sent',
        lineItems: (invoice.Line ?? [])
          .filter((l: any) => l.DetailType === 'SalesItemLineDetail')
          .map((l: any) => ({
            description: l.Description ?? '',
            quantity: l.SalesItemLineDetail?.Qty ?? 1,
            unitAmount: l.SalesItemLineDetail?.UnitPrice ?? 0,
            amount: l.Amount ?? 0,
          })),
        syncedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  async voidInvoice(invoiceId: string): Promise<AccountingInvoice> {
    const current = await this.getInvoice(invoiceId);
    if (!current) throw new Error(`Invoice ${invoiceId} not found`);

    await this.apiRequest('POST', `invoice/${invoiceId}?operation=void`, {
      Id: invoiceId,
      SyncToken: '0',
    });

    return { ...current, status: 'voided', balance: 0, syncedAt: new Date().toISOString() };
  }

  async markInvoicePaid(invoiceId: string, paymentDate: string, amount: number): Promise<AccountingInvoice> {
    const invoice = await this.getInvoice(invoiceId);
    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

    await this.apiRequest('POST', 'payment', {
      TotalAmt: amount,
      TxnDate: paymentDate,
      Line: [{
        Amount: amount,
        LinkedTxn: [{ TxnId: invoiceId, TxnType: 'Invoice' }],
      }],
    });

    return {
      ...invoice,
      status: 'paid',
      balance: Math.max(0, invoice.balance - amount),
      syncedAt: new Date().toISOString(),
    };
  }

  async syncAllInvoices(_tenantId: string): Promise<SyncResult> {
    // In a real implementation, query all CrestDesk invoices and sync to QuickBooks
    logger.info('QuickBooks full sync not yet implemented');
    return { synced: 0, failed: 0, errors: ['Full sync not yet implemented'] };
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.apiRequest('GET', 'companyinfo/' + this.realmId);
      return true;
    } catch {
      return false;
    }
  }
}
