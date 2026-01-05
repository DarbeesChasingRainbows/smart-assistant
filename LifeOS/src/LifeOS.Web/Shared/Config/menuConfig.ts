import { MenuItem } from '../types/menu';

export const menuConfig: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'FiHome',
    path: '/dashboard',
    order: 1
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'FiDollarSign',
    children: [
      {
        id: 'accounts',
        label: 'Accounts',
        icon: 'FiCreditCard',
        path: '/finance/accounts',
        order: 1
      },
      {
        id: 'transactions',
        label: 'Transactions',
        icon: 'FiFileText',
        path: '/finance/transactions',
        badge: 'New',
        order: 2
      },
      {
        id: 'budgets',
        label: 'Budgets',
        icon: 'FiPieChart',
        path: '/finance/budgets',
        order: 3
      },
      {
        id: 'merchants',
        label: 'Merchants',
        icon: 'FiStore',
        path: '/finance/merchants',
        order: 4
      },
      {
        id: 'categories',
        label: 'Categories',
        icon: 'FiTag',
        path: '/finance/categories',
        order: 5
      },
      {
        id: 'reconciliations',
        label: 'Reconciliations',
        icon: 'FiCheckSquare',
        path: '/finance/reconciliations',
        order: 6
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: 'FiTrendingUp',
        path: '/finance/reports',
        order: 7
      }
    ],
    order: 2
  },
  {
    id: 'garage',
    label: 'Garage',
    icon: 'FiTool',
    children: [
      {
        id: 'vehicles',
        label: 'Vehicles',
        icon: 'FiTruck',
        path: '/garage/vehicles',
        order: 1
      },
      {
        id: 'maintenance',
        label: 'Maintenance',
        icon: 'FiSettings',
        path: '/garage/maintenance',
        order: 2
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'FiPackage',
        path: '/garage/inventory',
        order: 3
      }
    ],
    order: 3
  },
  {
    id: 'garden',
    label: 'Garden',
    icon: 'FiSun',
    children: [
      {
        id: 'garden-beds',
        label: 'Garden Beds',
        icon: 'FiGrid',
        path: '/garden/beds',
        order: 1
      },
      {
        id: 'species',
        label: 'Species',
        icon: 'FiLeaf',
        path: '/garden/species',
        order: 2
      },
      {
        id: 'crops',
        label: 'Crops',
        icon: 'FiActivity',
        path: '/garden/crops',
        order: 3
      }
    ],
    order: 4
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: 'FiCalendar',
    path: '/calendar',
    order: 5
  },
  {
    id: 'team',
    label: 'Team',
    icon: 'FiUsers',
    path: '/team',
    order: 6
  },
  {
    id: 'admin',
    label: 'Administration',
    icon: 'FiShield',
    children: [
      {
        id: 'users',
        label: 'Users',
        icon: 'FiUser',
        path: '/admin/users',
        order: 1
      },
      {
        id: 'roles',
        label: 'Roles',
        icon: 'FiUserCheck',
        path: '/admin/roles',
        order: 2
      },
      {
        id: 'system',
        label: 'System',
        icon: 'FiServer',
        path: '/admin/system',
        order: 3
      }
    ],
    order: 7,
    requiredRole: 'admin'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'FiSettings',
    children: [
      {
        id: 'profile',
        label: 'Profile',
        icon: 'FiUser',
        path: '/settings/profile',
        order: 1
      },
      {
        id: 'preferences',
        label: 'Preferences',
        icon: 'FiSliders',
        path: '/settings/preferences',
        order: 2
      },
      {
        id: 'api',
        label: 'API Keys',
        icon: 'FiKey',
        path: '/settings/api',
        order: 3
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'FiBell',
        path: '/settings/notifications',
        order: 4
      },
      {
        id: 'security',
        label: 'Security',
        icon: 'FiLock',
        path: '/settings/security',
        order: 5
      }
    ],
    order: 8
  }
];

export const menuSections = {
  main: ['dashboard', 'finance', 'garage', 'garden'],
  secondary: ['calendar', 'team'],
  admin: ['admin'],
  settings: ['settings']
};

export const getMenuItemsByRole = (userRole?: string): MenuItem[] => {
  return menuConfig
    .filter(item => !item.requiredRole || userRole === item.requiredRole)
    .map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => !child.requiredRole || userRole === child.requiredRole)
        };
      }
      return item;
    })
    .sort((a, b) => a.order - b.order);
};

export const findMenuItem = (path: string, items: MenuItem[] = menuConfig): MenuItem | null => {
  for (const item of items) {
    if (item.path === path) return item;
    if (item.children) {
      const found = findMenuItem(path, item.children);
      if (found) return found;
    }
  }
  return null;
};

export const getBreadcrumbs = (path: string, items: MenuItem[] = menuConfig): MenuItem[] => {
  const breadcrumbs: MenuItem[] = [];
  
  const findPath = (currentPath: string, currentItems: MenuItem[], parents: MenuItem[] = []): boolean => {
    for (const item of currentItems) {
      if (item.path === currentPath) {
        breadcrumbs.push(...parents, item);
        return true;
      }
      if (item.children) {
        if (findPath(currentPath, item.children, [...parents, item])) {
          return true;
        }
      }
    }
    return false;
  };
  
  findPath(path, items);
  return breadcrumbs;
};
