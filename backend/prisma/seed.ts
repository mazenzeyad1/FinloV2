import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { group: 'Housing',       names: ['Rent', 'Mortgage', 'Utilities', 'Internet', 'Insurance'] },
  { group: 'Food',          names: ['Groceries', 'Dining Out', 'Coffee', 'Takeout'] },
  { group: 'Transport',     names: ['Transit', 'Gas', 'Rideshare', 'Parking', 'Car Payment'] },
  { group: 'Entertainment', names: ['Streaming', 'Movies', 'Games', 'Books', 'Music'] },
  { group: 'Shopping',      names: ['Clothing', 'Electronics', 'Household', 'Personal Care'] },
  { group: 'Health',        names: ['Pharmacy', 'Gym', 'Doctor', 'Dental'] },
  { group: 'Income',        names: ['Salary', 'Freelance', 'Investment Income', 'Transfer Received'] },
  { group: 'Finance',       names: ['Credit Card', 'Loan Payment', 'Savings Transfer'] },
  { group: 'Other',         names: ['Miscellaneous'] },
];

async function main() {
  console.log('Seeding categories...');
  for (const { group, names } of CATEGORIES) {
    for (const name of names) {
      // Built-in categories have userId = null. Names are only unique per-user
      // now, so match explicitly on the global (null-user) row.
      const existing = await prisma.category.findFirst({ where: { name, userId: null } });
      if (!existing) {
        await prisma.category.create({ data: { name, groupName: group } });
      } else if (existing.groupName !== group) {
        await prisma.category.update({ where: { id: existing.id }, data: { groupName: group } });
      }
    }
  }
  const count = await prisma.category.count();
  console.log(`Done — ${count} categories in database.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
