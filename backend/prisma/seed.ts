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
      await prisma.category.upsert({
        where: { name },
        create: { name, groupName: group },
        update: { groupName: group },
      });
    }
  }
  const count = await prisma.category.count();
  console.log(`Done — ${count} categories in database.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
