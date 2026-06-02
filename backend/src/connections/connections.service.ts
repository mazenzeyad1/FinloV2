import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlaidService } from '../providers/plaid/plaid.service';
import { AiCategorizerService } from '../common/ai/ai-categorizer.service';
import { format, subDays } from 'date-fns';
import { Transaction } from 'plaid';

// Plaid personal_finance_category.detailed → our category name
const PLAID_DETAILED_MAP: Record<string, string> = {
  FOOD_AND_DRINK_COFFEE:                                    'Coffee',
  FOOD_AND_DRINK_FAST_FOOD:                                 'Takeout',
  FOOD_AND_DRINK_RESTAURANTS:                               'Dining Out',
  FOOD_AND_DRINK_RESTAURANT:                                'Dining Out',
  FOOD_AND_DRINK_GROCERY:                                   'Groceries',
  FOOD_AND_DRINK_GROCERIES:                                 'Groceries',
  FOOD_AND_DRINK_VENDING_MACHINES:                          'Takeout',
  FOOD_AND_DRINK_OTHER_FOOD_AND_DRINK:                      'Dining Out',
  TRANSPORTATION_TAXIS_AND_RIDE_SHARES:                     'Rideshare',
  TRANSPORTATION_GAS_AND_CONVENIENCE:                       'Gas',
  TRANSPORTATION_PUBLIC_TRANSIT:                            'Transit',
  TRANSPORTATION_PARKING:                                   'Parking',
  TRANSPORTATION_AIRLINES_AND_AVIATION_SERVICES:            'Miscellaneous',
  TRANSPORTATION_CAR_DEALERS_AND_LEASING:                   'Car Payment',
  TRANSPORTATION_OTHER_TRANSPORTATION:                      'Transit',
  RENT_AND_UTILITIES_RENT:                                  'Rent',
  RENT_AND_UTILITIES_MORTGAGES:                             'Mortgage',
  RENT_AND_UTILITIES_GAS:                                   'Utilities',
  RENT_AND_UTILITIES_ELECTRICITY:                           'Utilities',
  RENT_AND_UTILITIES_WATER:                                 'Utilities',
  RENT_AND_UTILITIES_INTERNET_AND_CABLE:                    'Internet',
  RENT_AND_UTILITIES_TELEPHONE:                             'Internet',
  RENT_AND_UTILITIES_SEWAGE_AND_WASTE_MANAGEMENT:           'Utilities',
  RENT_AND_UTILITIES_OTHER_UTILITIES:                       'Utilities',
  ENTERTAINMENT_TV_AND_MOVIES:                              'Streaming',
  ENTERTAINMENT_MUSIC_AND_AUDIO:                            'Music',
  ENTERTAINMENT_VIDEO_GAMES:                                'Games',
  ENTERTAINMENT_SPORTING_EVENTS_AMUSEMENT_PARKS_AND_MUSEUMS:'Movies',
  ENTERTAINMENT_OTHER_ENTERTAINMENT:                        'Movies',
  GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES:             'Clothing',
  GENERAL_MERCHANDISE_ELECTRONICS:                          'Electronics',
  GENERAL_MERCHANDISE_GROCERIES:                            'Groceries',
  GENERAL_MERCHANDISE_BOOKSTORES_AND_NEWSSTANDS:            'Books',
  GENERAL_MERCHANDISE_ONLINE_MARKETPLACES:                  'Miscellaneous',
  GENERAL_MERCHANDISE_DISCOUNT_STORES:                      'Miscellaneous',
  GENERAL_MERCHANDISE_DEPARTMENT_STORES:                    'Clothing',
  GENERAL_MERCHANDISE_HOME_AND_GARDEN:                      'Household',
  GENERAL_MERCHANDISE_PET_SUPPLIES:                         'Miscellaneous',
  GENERAL_MERCHANDISE_SPORTING_GOODS:                       'Gym',
  GENERAL_MERCHANDISE_OTHER_GENERAL_MERCHANDISE:            'Miscellaneous',
  MEDICAL_PHARMACIES_AND_SUPPLEMENTS:                       'Pharmacy',
  MEDICAL_DENTIST:                                          'Dental',
  MEDICAL_DOCTOR:                                           'Doctor',
  MEDICAL_GYMS_AND_FITNESS_CENTERS:                         'Gym',
  MEDICAL_HOSPITALS:                                        'Doctor',
  MEDICAL_VETERINARY_SERVICES:                              'Miscellaneous',
  MEDICAL_OTHER_MEDICAL:                                    'Doctor',
  PERSONAL_CARE_HAIR_AND_BEAUTY:                            'Personal Care',
  PERSONAL_CARE_OTHER_PERSONAL_CARE:                        'Personal Care',
  INCOME_WAGES:                                             'Salary',
  INCOME_OTHER_INCOME:                                      'Freelance',
  INCOME_DIVIDENDS:                                         'Investment Income',
  INCOME_INTEREST_EARNED:                                   'Investment Income',
  INCOME_RETIREMENT_PENSION:                                'Salary',
  TRANSFER_IN_SAVINGS:                                      'Transfer Received',
  TRANSFER_IN_ACCOUNT_TRANSFER:                             'Transfer Received',
  TRANSFER_OUT_SAVINGS:                                     'Savings Transfer',
  TRANSFER_OUT_ACCOUNT_TRANSFER:                            'Savings Transfer',
  LOAN_PAYMENTS_CREDIT_CARD_PAYMENT:                        'Credit Card',
  LOAN_PAYMENTS_MORTGAGE_PAYMENT:                           'Loan Payment',
  LOAN_PAYMENTS_STUDENT_LOAN_PAYMENT:                       'Loan Payment',
  LOAN_PAYMENTS_CAR_PAYMENT:                                'Car Payment',
  LOAN_PAYMENTS_OTHER_PAYMENT:                              'Loan Payment',
  GENERAL_SERVICES_INSURANCE:                               'Insurance',
  GENERAL_SERVICES_FINANCIAL_PLANNING_AND_FINANCIAL_ADVISORS:'Miscellaneous',
  GENERAL_SERVICES_ACCOUNTING_AND_FINANCIAL_PLANNING:       'Miscellaneous',
  GOVERNMENT_AND_NON_PROFIT_TAXES:                          'Miscellaneous',
};

// Plaid legacy category[1] (detailed) → our category name
const PLAID_LEGACY_MAP: Record<string, string> = {
  'Coffee Shop':                    'Coffee',
  'Restaurants':                    'Dining Out',
  'Fast Food':                      'Takeout',
  'Groceries':                      'Groceries',
  'Rideshare':                      'Rideshare',
  'Taxi':                           'Rideshare',
  'Gas Stations':                   'Gas',
  'Parking':                        'Parking',
  'Public Transportation Services': 'Transit',
  'Internet Services':              'Internet',
  'Telecommunication Services':     'Internet',
  'Clothing and Accessories':       'Clothing',
  'Electronics':                    'Electronics',
  'Gyms and Fitness Centers':       'Gym',
  'Video Games':                    'Games',
  'Pharmacies':                     'Pharmacy',
  'Dentists':                       'Dental',
  'Physicians':                     'Doctor',
  'Payroll':                        'Salary',
  'Credit Card':                    'Credit Card',
  'Utilities':                      'Utilities',
  'Movies and DVDs':                'Movies',
  'Music':                          'Music',
  'Books':                          'Books',
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Rent:           ['rent'],
  Mortgage:       ['mortgage'],
  Utilities:      ['hydro', 'enbridge', 'utility', 'water bill', 'electric'],
  Internet:       ['bell ', 'rogers', 'telus', 'internet', 'shaw', 'fido'],
  Groceries:      ['loblaws', 'metro', 'sobeys', 'food basics', 'no frills', 'walmart', 'costco', 'grocery', 'supermarket'],
  'Dining Out':   ['restaurant', 'bar ', 'pub ', 'dine', 'bistro', 'brasserie'],
  Coffee:         ['tim hortons', 'starbucks', 'second cup', 'coffee', 'cafe', 'espresso'],
  Takeout:        ['uber eats', 'doordash', 'skip', 'pizza', 'burgers', 'mcdonald', 'subway', 'kfc'],
  Transit:        ['ttc', 'presto', 'oc transpo', 'stm ', 'transit', 'go train', 'via rail'],
  Gas:            ['esso', 'petro', 'shell', 'sunoco', 'gas station', 'fuel'],
  Rideshare:      ['uber', 'lyft'],
  Parking:        ['parking', 'impark', 'greenp'],
  Streaming:      ['netflix', 'spotify', 'disney', 'apple music', 'crave', 'amazon prime', 'youtube premium'],
  Movies:         ['cineplex', 'landmark cinema', 'odeon', 'movies'],
  Salary:         ['payroll', 'direct deposit', 'salary', 'paycheque'],
  Pharmacy:       ['shoppers', 'rexall', 'pharma', 'drugstore'],
  Gym:            ['goodlife', 'ymca', 'gym ', 'fitness', 'equinox'],
  Clothing:       ['h&m', 'zara', 'gap', 'old navy', 'uniqlo', 'forever 21'],
  Electronics:    ['apple store', 'best buy', 'staples', 'microsoft store'],
  'Personal Care':['sephora', 'lush', 'bath & body', 'salon', 'barber'],
};

@Injectable()
export class ConnectionsService {
  constructor(
    private prisma: PrismaService,
    private plaid: PlaidService,
    private aiCategorizer: AiCategorizerService,
  ) {}

  async createLinkToken(userId: string) {
    const linkToken = await this.plaid.createLinkToken(userId);
    return { linkToken };
  }

  async exchangeToken(userId: string, publicToken: string) {
    const { accessToken, itemId } = await this.plaid.exchangePublicToken(publicToken);
    const plaidAccounts = await this.plaid.getAccounts(accessToken);

    let institutionName: string | undefined;
    const item = await this.getItemInstitution(accessToken);
    if (item) institutionName = item.name;

    const connection = await this.prisma.connection.upsert({
      where: { plaidItemId: itemId },
      create: { userId, plaidAccessToken: accessToken, plaidItemId: itemId, institutionName, status: 'ACTIVE' },
      update: { plaidAccessToken: accessToken, institutionName, status: 'ACTIVE' },
    });

    for (const pa of plaidAccounts) {
      await this.prisma.account.upsert({
        where: { externalId: pa.account_id },
        create: {
          userId,
          connectionId: connection.id,
          externalId: pa.account_id,
          name: pa.name,
          officialName: pa.official_name ?? null,
          type: pa.type,
          subtype: pa.subtype ?? null,
          balance: pa.balances.current ?? 0,
          currency: pa.balances.iso_currency_code ?? 'CAD',
          mask: pa.mask ?? null,
        },
        update: {
          balance: pa.balances.current ?? 0,
          name: pa.name,
        },
      });
    }

    await this.syncConnectionTransactions(userId, connection.id, accessToken, 30);
    await this.recategorizeTransactions(userId);
    return connection;
  }

  async syncTransactions(userId: string, connectionId?: string) {
    const where = connectionId
      ? { id: connectionId, userId }
      : { userId, status: 'ACTIVE' as const };
    const connections = await this.prisma.connection.findMany({ where });
    for (const conn of connections) {
      await this.syncConnectionTransactions(userId, conn.id, conn.plaidAccessToken, 90);
    }
    await this.recategorizeTransactions(userId);
    return { synced: connections.length };
  }

  async getConnections(userId: string) {
    return this.prisma.connection.findMany({
      where: { userId },
      include: { _count: { select: { accounts: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async recategorizeTransactions(userId: string) {
    const categories = await this.prisma.category.findMany();
    const catMap = new Map(categories.map((c) => [c.name, c.id]));

    const txns = await this.prisma.transaction.findMany({
      where: { userId, categoryId: null },
    });

    let updated = 0;

    // Pass 1: rule-based matching
    const stillUncategorized: typeof txns = [];
    for (const tx of txns) {
      const plaidShape = { name: tx.description, merchant_name: tx.merchantName } as any;
      const categoryId = this.autoCategory(plaidShape, catMap);
      if (categoryId) {
        await this.prisma.transaction.update({ where: { id: tx.id }, data: { categoryId } });
        updated++;
      } else {
        stillUncategorized.push(tx);
      }
    }

    // Pass 2: AI fallback for anything the rules couldn't match
    if (stillUncategorized.length > 0) {
      console.log(`[Categorizer] Rule-based matched ${updated}. Sending ${stillUncategorized.length} to Gemini AI...`);
      const categoryNames = categories.map((c) => c.name);
      const aiInput = stillUncategorized.map((tx) => ({
        id: tx.id,
        description: tx.description,
        merchantName: tx.merchantName,
        amount: tx.amount,
      }));

      const aiResults = await this.aiCategorizer.categorize(aiInput, categoryNames);
      console.log(`[Categorizer] Gemini categorized ${aiResults.size} transactions.`);

      for (const [txId, catName] of aiResults) {
        const categoryId = catMap.get(catName);
        if (categoryId) {
          await this.prisma.transaction.update({ where: { id: txId }, data: { categoryId } });
          updated++;
        }
      }
    }

    return { updated };
  }

  async deleteConnection(userId: string, connectionId: string) {
    const conn = await this.prisma.connection.findUnique({ where: { id: connectionId } });
    if (!conn) throw new NotFoundException('Connection not found');
    if (conn.userId !== userId) throw new ForbiddenException();
    await this.prisma.connection.delete({ where: { id: connectionId } });
    return { message: 'Connection removed' };
  }

  private async syncConnectionTransactions(
    userId: string,
    connectionId: string,
    accessToken: string,
    days: number,
  ) {
    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    const plaidTxns = await this.plaid.getTransactions(accessToken, startDate, endDate);

    const accounts = await this.prisma.account.findMany({
      where: { connectionId, userId },
    });
    const accountMap = new Map(accounts.map((a) => [a.externalId, a.id]));

    const categories = await this.prisma.category.findMany();
    const catMap = new Map(categories.map((c) => [c.name, c.id]));

    const externalIds = plaidTxns.map((t) => t.transaction_id);
    const existingTxns = await this.prisma.transaction.findMany({
      where: { externalId: { in: externalIds } },
      select: { externalId: true, categoryId: true },
    });
    const existingCatMap = new Map(existingTxns.map((t) => [t.externalId, t.categoryId]));

    for (const t of plaidTxns) {
      const accountId = accountMap.get(t.account_id);
      if (!accountId) continue;

      const categoryId = this.autoCategory(t, catMap);
      const existingCategoryId = existingCatMap.get(t.transaction_id);
      // Only set category on update if transaction has no category yet (preserves manual assignments)
      const categoryUpdate = existingCategoryId == null ? { categoryId } : {};

      await this.prisma.transaction.upsert({
        where: { externalId: t.transaction_id },
        create: {
          userId,
          accountId,
          externalId: t.transaction_id,
          amount: t.amount,
          currency: t.iso_currency_code ?? 'CAD',
          date: new Date(t.date),
          description: t.name,
          merchantName: t.merchant_name ?? null,
          categoryId,
          pending: t.pending,
        },
        update: {
          amount: t.amount,
          pending: t.pending,
          merchantName: t.merchant_name ?? null,
          ...categoryUpdate,
        },
      });
    }
  }

  private autoCategory(t: Transaction, catMap: Map<string, string>): string | null {
    // 1. Plaid personal_finance_category.detailed (most accurate, requires include_personal_finance_category: true)
    const detailed = (t as any).personal_finance_category?.detailed as string | undefined;
    if (detailed && PLAID_DETAILED_MAP[detailed]) {
      return catMap.get(PLAID_DETAILED_MAP[detailed]) ?? null;
    }

    // 2. Plaid legacy category array (e.g. ["Food and Drink", "Coffee Shop"])
    const legacy = (t as any).category as string[] | undefined;
    if (legacy) {
      for (const label of [...legacy].reverse()) {
        if (PLAID_LEGACY_MAP[label]) return catMap.get(PLAID_LEGACY_MAP[label]) ?? null;
      }
    }

    // 3. Keyword match on description + merchant name
    const lower = t.name.toLowerCase();
    const merchantLower = (t.merchant_name ?? '').toLowerCase();
    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((kw) => lower.includes(kw) || merchantLower.includes(kw))) {
        return catMap.get(catName) ?? null;
      }
    }

    return null;
  }

  private async getItemInstitution(accessToken: string): Promise<{ name: string } | null> {
    try {
      const item = await this.plaid['client'].itemGet({ access_token: accessToken });
      const instId = item.data.item.institution_id;
      if (!instId) return null;
      return this.plaid.getInstitution(instId);
    } catch {
      return null;
    }
  }
}
