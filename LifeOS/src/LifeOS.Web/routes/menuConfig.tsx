import { MenuItem } from "./menuTypes.ts";

export const menuConfig: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/',
    icon: 'icon-home',
  },
  {
    id: 'finance',
    label: 'Finance',
    href: '/finance',
    icon: 'icon-dollar-sign',
    children: [
      {
        id: 'accounts',
        label: 'Accounts',
        href: '/finance/accounts',
        icon: 'icon-credit-card',
      },
      {
        id: 'transactions',
        label: 'Transactions',
        href: '/finance/transactions',
        icon: 'icon-file-text',
        badge: 'New',
      },
      {
        id: 'budgets',
        label: 'Budgets',
        href: '/finance/budgets',
        icon: 'icon-pie-chart',
      },
      {
        id: 'merchants',
        label: 'Merchants',
        href: '/finance/merchants',
        icon: 'icon-store',
      },
      {
        id: 'categories',
        label: 'Categories',
        href: '/finance/categories',
        icon: 'icon-tag',
      },
      {
        id: 'reconciliations',
        label: 'Reconciliations',
        href: '/finance/reconciliations',
        icon: 'icon-check-square',
      },
      {
        id: 'reports',
        label: 'Reports',
        href: '/finance/reports',
        icon: 'icon-trending-up',
      },
    ],
  },
  {
    id: 'garage',
    label: 'Garage',
    href: '/garage',
    icon: 'icon-tool',
    children: [
      {
        id: 'vehicles',
        label: 'Vehicles',
        href: '/garage/vehicles',
        icon: 'icon-truck',
      },
      {
        id: 'maintenance',
        label: 'Maintenance',
        href: '/garage/maintenance',
        icon: 'icon-settings',
      },
      {
        id: 'inventory',
        label: 'Inventory',
        href: '/garage/inventory',
        icon: 'icon-package',
      },
    ],
  },
  {
    id: 'garden',
    label: 'Garden',
    href: '/garden',
    icon: 'icon-sun',
    children: [
      {
        id: 'beds',
        label: 'Garden Beds',
        href: '/garden/beds',
        icon: 'icon-grid',
      },
      {
        id: 'species',
        label: 'Species',
        href: '/garden/species',
        icon: 'icon-leaf',
      },
      {
        id: 'crops',
        label: 'Crops',
        href: '/garden/crops',
        icon: 'icon-activity',
      },
    ],
  },
  {
    id: 'calendar',
    label: 'Calendar',
    href: '/calendar',
    icon: 'icon-calendar',
  },
  {
    id: 'external-apps',
    label: 'External Apps',
    href: '#',
    icon: 'icon-globe',
    children: [
      {
        id: 'anki-quiz',
        label: 'AnkiQuiz',
        href: 'http://localhost:8010',
        icon: 'icon-book-open',
      },
      {
        id: 'garage-app',
        label: 'Garage (Vehicle Maintenance)',
        href: 'http://localhost:8020',
        icon: 'icon-tool',
      },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    href: '/team',
    icon: 'icon-users',
  },
  {
    id: 'admin',
    label: 'Administration',
    href: '/admin',
    icon: 'icon-shield',
    requiredRole: 'admin',
    children: [
      {
        id: 'users',
        label: 'Users',
        href: '/admin/users',
        icon: 'icon-user',
      },
      {
        id: 'roles',
        label: 'Roles',
        href: '/admin/roles',
        icon: 'icon-user-check',
      },
      {
        id: 'system',
        label: 'System',
        href: '/admin/system',
        icon: 'icon-server',
      },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: 'icon-settings',
    children: [
      {
        id: 'profile',
        label: 'Profile',
        href: '/settings/profile',
        icon: 'icon-user',
      },
      {
        id: 'preferences',
        label: 'Preferences',
        href: '/settings/preferences',
        icon: 'icon-sliders',
      },
      {
        id: 'api',
        label: 'API Keys',
        href: '/settings/api',
        icon: 'icon-key',
      },
      {
        id: 'notifications',
        label: 'Notifications',
        href: '/settings/notifications',
        icon: 'icon-bell',
      },
      {
        id: 'security',
        label: 'Security',
        href: '/settings/security',
        icon: 'icon-lock',
      },
    ],
  },
];

export const getMenuItemsByRole = (userRole?: string): MenuItem[] => {
  if (!userRole) return menuConfig;
  
  return menuConfig
    .filter(item => !item.requiredRole || item.requiredRole === userRole)
    .map(item => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter(child => !child.requiredRole || child.requiredRole === userRole)
        };
      }
      return item;
    });
};

export const findMenuItem = (path: string, items: MenuItem[] = menuConfig): MenuItem | null => {
  for (const item of items) {
    if (item.href === path) return item;
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
      if (item.href === currentPath) {
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
