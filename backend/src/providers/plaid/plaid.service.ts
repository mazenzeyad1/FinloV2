import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
  AccountBase,
  Transaction,
} from 'plaid';

@Injectable()
export class PlaidService {
  private client: PlaidApi;

  constructor(private config: ConfigService) {
    const env = this.config.get<string>('PLAID_ENV') || 'sandbox';
    const basePath =
      env === 'production'
        ? PlaidEnvironments.production
        : env === 'development'
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

    const configuration = new Configuration({
      basePath,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': this.config.get('PLAID_CLIENT_ID'),
          'PLAID-SECRET': this.config.get('PLAID_SECRET'),
        },
      },
    });

    this.client = new PlaidApi(configuration);
  }

  async createLinkToken(userId: string): Promise<string> {
    const response = await this.client.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Finlo',
      products: [Products.Transactions],
      country_codes: [CountryCode.Ca],
      language: 'en',
    });
    return response.data.link_token;
  }

  async exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
    const response = await this.client.itemPublicTokenExchange({ public_token: publicToken });
    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  }

  async getAccounts(accessToken: string): Promise<AccountBase[]> {
    const response = await this.client.accountsGet({ access_token: accessToken });
    return response.data.accounts;
  }

  async getTransactions(
    accessToken: string,
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    let transactions: Transaction[] = [];
    let hasMore = true;
    let offset = 0;

    while (hasMore) {
      const response = await this.client.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: { count: 500, offset, include_personal_finance_category: true },
      });
      transactions = transactions.concat(response.data.transactions);
      const total = response.data.total_transactions;
      offset += response.data.transactions.length;
      hasMore = offset < total;
    }

    return transactions;
  }

  async getInstitution(institutionId: string): Promise<{ name: string }> {
    const response = await this.client.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Ca],
    });
    return { name: response.data.institution.name };
  }
}
