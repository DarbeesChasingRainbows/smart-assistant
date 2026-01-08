const db = require("@arangodb").db;
db._useDatabase("lifeos");

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();
const startDate = new Date(currentYear, currentMonth, 1);
const endDate = new Date(currentYear, currentMonth + 1, 0);

// Format dates as ISO strings
const formatDate = (date) => date.toISOString();

// Check if we already have pay periods
if (db.budget_pay_periods.count() > 0) {
  print("Budget data already seeded");
} else {
  // Create a current pay period
  const payPeriod = {
    _key: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
    key: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
    name: `${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    expectedIncome: 5000,
    isClosed: false,
    familyId: "default",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
  
  db.budget_pay_periods.save(payPeriod);
  
  // Create category groups with nested categories
  const categoryGroups = [
    {
      _key: "bills",
      key: "bills",
      name: "Bills",
      familyId: "default",
      sortOrder: 1,
      isSystem: true,
      createdAt: now.toISOString(),
      categories: [
        {
          _key: "housing",
          key: "housing",
          name: "Housing",
          targetAmount: 1500,
          sortOrder: 1,
          isHidden: false,
          createdAt: now.toISOString()
        },
        {
          _key: "food",
          key: "food",
          name: "Food & Dining",
          targetAmount: 600,
          sortOrder: 2,
          isHidden: false,
          createdAt: now.toISOString()
        }
      ]
    },
    {
      _key: "income",
      key: "income",
      name: "Income",
      familyId: "default",
      sortOrder: 2,
      isSystem: true,
      createdAt: now.toISOString(),
      categories: [
        {
          _key: "salary",
          key: "salary",
          name: "Salary",
          targetAmount: 0,
          sortOrder: 1,
          isHidden: false,
          createdAt: now.toISOString()
        }
      ]
    }
  ];
  
  categoryGroups.forEach(group => {
    // Save the category group
    const { categories, ...groupData } = group;
    db.budget_category_groups.save(groupData);
    
    // Save categories separately
    categories.forEach(cat => {
      cat.groupKey = group.key;
      cat.familyId = "default";
      db.budget_categories.save(cat);
    });
  });
  
  print("Budget data seeded successfully");
}
