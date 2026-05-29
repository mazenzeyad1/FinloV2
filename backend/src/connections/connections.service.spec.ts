import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlaidService } from '../providers/plaid/plaid.service';

describe('ConnectionsService', () => {
  let service: ConnectionsService;

  const prismaMock = {
    connection: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      upsert: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  };

  const plaidMock = {
    createLinkToken: jest.fn(),
    exchangePublicToken: jest.fn(),
    getAccounts: jest.fn(),
    getTransactions: jest.fn(),
    getInstitution: jest.fn(),
    client: {
      itemGet: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    plaidMock.createLinkToken.mockResolvedValue('link-token-123');
    plaidMock.exchangePublicToken.mockResolvedValue({ accessToken: 'access-123', itemId: 'item-123' });
    plaidMock.getAccounts.mockResolvedValue([]);
    plaidMock.getTransactions.mockResolvedValue([]);
    plaidMock.getInstitution.mockResolvedValue({ name: 'Test Bank' });
    plaidMock.client.itemGet.mockResolvedValue({ data: { item: { institution_id: 'inst-1' } } });

    prismaMock.connection.upsert.mockResolvedValue({ id: 'conn-1', plaidAccessToken: 'access-123' });
    prismaMock.connection.findMany.mockResolvedValue([]);
    prismaMock.connection.findUnique.mockResolvedValue(null);
    prismaMock.connection.delete.mockResolvedValue({});
    prismaMock.account.upsert.mockResolvedValue({});
    prismaMock.account.findMany.mockResolvedValue([]);
    prismaMock.transaction.upsert.mockResolvedValue({});
    prismaMock.category.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectionsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PlaidService, useValue: plaidMock },
      ],
    }).compile();

    service = module.get<ConnectionsService>(ConnectionsService);
  });

  // ─── createLinkToken ─────────────────────────────────────────────────────────

  describe('createLinkToken', () => {
    it('calls plaid.createLinkToken with the userId', async () => {
      await service.createLinkToken('user-1');
      expect(plaidMock.createLinkToken).toHaveBeenCalledWith('user-1');
    });

    it('returns { linkToken }', async () => {
      const result = await service.createLinkToken('user-1');
      expect(result).toEqual({ linkToken: 'link-token-123' });
    });
  });

  // ─── exchangeToken ────────────────────────────────────────────────────────────

  describe('exchangeToken', () => {
    it('calls plaid.exchangePublicToken with the given public token', async () => {
      await service.exchangeToken('user-1', 'public-token-abc');
      expect(plaidMock.exchangePublicToken).toHaveBeenCalledWith('public-token-abc');
    });

    it('upserts the connection in the DB using the returned itemId', async () => {
      await service.exchangeToken('user-1', 'public-token-abc');
      expect(prismaMock.connection.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { plaidItemId: 'item-123' },
          create: expect.objectContaining({ userId: 'user-1', plaidItemId: 'item-123' }),
        }),
      );
    });

    it('upserts each Plaid account returned', async () => {
      plaidMock.getAccounts.mockResolvedValue([
        {
          account_id: 'acc-1',
          name: 'Checking',
          official_name: null,
          type: 'depository',
          subtype: 'checking',
          balances: { current: 500, iso_currency_code: 'CAD' },
          mask: '1234',
        },
        {
          account_id: 'acc-2',
          name: 'Savings',
          official_name: null,
          type: 'depository',
          subtype: 'savings',
          balances: { current: 2000, iso_currency_code: 'CAD' },
          mask: '5678',
        },
      ]);

      await service.exchangeToken('user-1', 'public-token-abc');

      expect(prismaMock.account.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.account.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { externalId: 'acc-1' } }),
      );
      expect(prismaMock.account.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { externalId: 'acc-2' } }),
      );
    });

    it('calls plaid.getTransactions to sync after accounts are saved', async () => {
      await service.exchangeToken('user-1', 'public-token-abc');
      expect(plaidMock.getTransactions).toHaveBeenCalled();
    });
  });

  // ─── syncTransactions ─────────────────────────────────────────────────────────

  describe('syncTransactions', () => {
    it('syncs all active connections when no connectionId is given', async () => {
      prismaMock.connection.findMany.mockResolvedValue([
        { id: 'conn-1', plaidAccessToken: 'access-1' },
        { id: 'conn-2', plaidAccessToken: 'access-2' },
      ]);

      const result = await service.syncTransactions('user-1');

      expect(prismaMock.connection.findMany).toHaveBeenCalledWith({ where: { userId: 'user-1', status: 'ACTIVE' } });
      expect(plaidMock.getTransactions).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ synced: 2 });
    });

    it('syncs only the specified connection when connectionId is given', async () => {
      prismaMock.connection.findMany.mockResolvedValue([
        { id: 'conn-1', plaidAccessToken: 'access-1' },
      ]);

      const result = await service.syncTransactions('user-1', 'conn-1');

      expect(prismaMock.connection.findMany).toHaveBeenCalledWith({ where: { id: 'conn-1', userId: 'user-1' } });
      expect(plaidMock.getTransactions).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ synced: 1 });
    });

    it('returns { synced: 0 } when no connections exist', async () => {
      prismaMock.connection.findMany.mockResolvedValue([]);
      const result = await service.syncTransactions('user-1');
      expect(result).toEqual({ synced: 0 });
    });
  });

  // ─── getConnections ───────────────────────────────────────────────────────────

  describe('getConnections', () => {
    it('returns connections for the given user ordered by createdAt desc', async () => {
      const conn = { id: 'conn-1', userId: 'user-1', _count: { accounts: 2 } };
      prismaMock.connection.findMany.mockResolvedValue([conn]);

      const result = await service.getConnections('user-1');

      expect(prismaMock.connection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result).toEqual([conn]);
    });
  });

  // ─── deleteConnection ─────────────────────────────────────────────────────────

  describe('deleteConnection', () => {
    it('throws NotFoundException when connection does not exist', async () => {
      prismaMock.connection.findUnique.mockResolvedValue(null);
      await expect(service.deleteConnection('user-1', 'conn-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(prismaMock.connection.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when connection belongs to a different user', async () => {
      prismaMock.connection.findUnique.mockResolvedValue({ id: 'conn-1', userId: 'other-user' });
      await expect(service.deleteConnection('user-1', 'conn-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(prismaMock.connection.delete).not.toHaveBeenCalled();
    });

    it('deletes the connection and returns { message }', async () => {
      prismaMock.connection.findUnique.mockResolvedValue({ id: 'conn-1', userId: 'user-1' });

      const result = await service.deleteConnection('user-1', 'conn-1');

      expect(prismaMock.connection.delete).toHaveBeenCalledWith({ where: { id: 'conn-1' } });
      expect(result).toEqual({ message: 'Connection removed' });
    });
  });

  // ─── autoCategory (private) ───────────────────────────────────────────────────

  describe('autoCategory', () => {
    const catMap = new Map([
      ['Coffee', 'cat-coffee'],
      ['Dining Out', 'cat-dining'],
      ['Groceries', 'cat-grocery'],
      ['Takeout', 'cat-takeout'],
      ['Rideshare', 'cat-rideshare'],
      ['Salary', 'cat-salary'],
    ]);

    const autoCategory = (t: any) => (service as any).autoCategory(t, catMap);

    it('matches personal_finance_category.detailed before anything else', () => {
      const t = {
        personal_finance_category: { detailed: 'FOOD_AND_DRINK_COFFEE' },
        category: ['Food and Drink', 'Restaurants'],
        name: 'Irrelevant Name',
      };
      expect(autoCategory(t)).toBe('cat-coffee');
    });

    it('falls back to legacy category array when detailed is absent', () => {
      const t = {
        personal_finance_category: null,
        category: ['Food and Drink', 'Coffee Shop'],
        name: 'Irrelevant Name',
      };
      expect(autoCategory(t)).toBe('cat-coffee');
    });

    it('falls back to keyword match on the transaction name', () => {
      const t = {
        personal_finance_category: null,
        category: null,
        name: 'Tim Hortons #1234',
      };
      expect(autoCategory(t)).toBe('cat-coffee');
    });

    it('matches Rideshare via keyword', () => {
      const t = { personal_finance_category: null, category: null, name: 'Uber trip to downtown' };
      expect(autoCategory(t)).toBe('cat-rideshare');
    });

    it('matches Salary via legacy category', () => {
      const t = {
        personal_finance_category: null,
        category: ['Income', 'Payroll'],
        name: 'Payroll deposit',
      };
      expect(autoCategory(t)).toBe('cat-salary');
    });

    it('returns null when no category matches', () => {
      const t = { personal_finance_category: null, category: null, name: 'Unknown Merchant XYZ 999' };
      expect(autoCategory(t)).toBeNull();
    });

    it('returns null when detailed key exists but is not in the map', () => {
      const t = {
        personal_finance_category: { detailed: 'UNKNOWN_UNMAPPED_CODE' },
        category: null,
        name: 'Unknown Merchant XYZ',
      };
      expect(autoCategory(t)).toBeNull();
    });
  });

  // ─── syncConnectionTransactions (private) ─────────────────────────────────────

  describe('syncConnectionTransactions', () => {
    const callPrivate = (userId: string, connectionId: string, accessToken: string, days: number) =>
      (service as any).syncConnectionTransactions(userId, connectionId, accessToken, days);

    const plaidAccounts = [{ id: 'db-acc-1', externalId: 'plaid-acc-1' }];

    const categories = [
      { id: 'cat-coffee', name: 'Coffee' },
      { id: 'cat-grocery', name: 'Groceries' },
    ];

    const baseTxn = (overrides: Record<string, any> = {}) => ({
      transaction_id: 'txn-1',
      account_id: 'plaid-acc-1',
      amount: 4.50,
      iso_currency_code: 'CAD',
      date: '2024-01-15',
      name: 'Test Merchant',
      merchant_name: null,
      pending: false,
      personal_finance_category: null,
      category: null,
      ...overrides,
    });

    beforeEach(() => {
      prismaMock.account.findMany.mockResolvedValue(plaidAccounts);
      prismaMock.category.findMany.mockResolvedValue(categories);
    });

    it('upserts each Plaid transaction into the DB', async () => {
      plaidMock.getTransactions.mockResolvedValue([baseTxn()]);

      await callPrivate('user-1', 'conn-1', 'access-123', 30);

      expect(prismaMock.transaction.upsert).toHaveBeenCalledTimes(1);
      expect(prismaMock.transaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { externalId: 'txn-1' } }),
      );
    });

    it('skips transactions whose account_id is not in the account map', async () => {
      plaidMock.getTransactions.mockResolvedValue([baseTxn({ account_id: 'unknown-account-id' })]);

      await callPrivate('user-1', 'conn-1', 'access-123', 30);

      expect(prismaMock.transaction.upsert).not.toHaveBeenCalled();
    });

    it('assigns categoryId when autoCategory finds a match', async () => {
      plaidMock.getTransactions.mockResolvedValue([
        baseTxn({ personal_finance_category: { detailed: 'FOOD_AND_DRINK_COFFEE' } }),
      ]);

      await callPrivate('user-1', 'conn-1', 'access-123', 30);

      expect(prismaMock.transaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ categoryId: 'cat-coffee' }),
        }),
      );
    });

    it('sets categoryId to null when no category matches', async () => {
      plaidMock.getTransactions.mockResolvedValue([
        baseTxn({ name: 'Completely Uncategorizable Merchant 99999' }),
      ]);

      await callPrivate('user-1', 'conn-1', 'access-123', 30);

      expect(prismaMock.transaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ categoryId: null }),
        }),
      );
    });

    it('upserts multiple transactions from a single sync', async () => {
      plaidMock.getTransactions.mockResolvedValue([
        baseTxn({ transaction_id: 'txn-a' }),
        baseTxn({ transaction_id: 'txn-b', name: 'Starbucks' }),
      ]);

      await callPrivate('user-1', 'conn-1', 'access-123', 30);

      expect(prismaMock.transaction.upsert).toHaveBeenCalledTimes(2);
    });

    it('stores merchant name when present', async () => {
      plaidMock.getTransactions.mockResolvedValue([
        baseTxn({ merchant_name: 'Tim Hortons' }),
      ]);

      await callPrivate('user-1', 'conn-1', 'access-123', 30);

      expect(prismaMock.transaction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ merchantName: 'Tim Hortons' }),
        }),
      );
    });
  });
});
