import type { MenuItem } from "./menuTypes.ts";

export const menuConfig: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/",
    icon: "icon-home",
  },
  {
    id: "finance",
    label: "Finance",
    href: "/finance",
    icon: "icon-dollar-sign",
    children: [
      {
        id: "transactions",
        label: "Transactions",
        href: "/finance/transactions",
        icon: "icon-file-text",
        badge: "New",
      },
      {
        id: "budgets",
        label: "Budgets",
        href: "/finance/budgets",
        icon: "icon-pie-chart",
      },
      {
        id: "categories",
        label: "Categories",
        href: "/finance/categories",
        icon: "icon-tag",
      },
      {
        id: "merchants",
        label: "Merchants",
        href: "/finance/merchants",
        icon: "icon-store",
      },
      {
        id: "receipts",
        label: "Receipts",
        href: "/finance/receipts",
        icon: "icon-receipt",
      },
      {
        id: "reports",
        label: "Reports",
        href: "/finance/reports",
        icon: "icon-trending-up",
      },
    ],
  },
  {
    id: "garage",
    label: "Garage",
    href: "/garage/vehicles",
    icon: "icon-tool",
    children: [
      {
        id: "vehicles",
        label: "Vehicles",
        href: "/garage/vehicles",
        icon: "icon-truck",
      },
      {
        id: "add-vehicle",
        label: "Add Vehicle",
        href: "/garage/vehicles/new",
        icon: "icon-plus",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        href: "/garage/maintenance",
        icon: "icon-settings",
      },
      {
        id: "inventory",
        label: "Inventory",
        href: "/garage/inventory",
        icon: "icon-package",
      },
      {
        id: "components",
        label: "Components",
        href: "/garage/components",
        icon: "icon-wrench",
      },
      {
        id: "pro",
        label: "Pro Tools",
        href: "/garage/pro",
        icon: "icon-tool",
      },
    ],
  },
  {
    id: "garden",
    label: "Garden",
    href: "/garden",
    icon: "icon-sun",
    children: [
      {
        id: "beds",
        label: "Garden Beds",
        href: "/garden/beds",
        icon: "icon-grid",
      },
      {
        id: "add-bed",
        label: "Add Bed",
        href: "/garden/beds/add",
        icon: "icon-plus",
      },
      {
        id: "species",
        label: "Species",
        href: "/garden/species",
        icon: "icon-leaf",
      },
      {
        id: "add-species",
        label: "Add Species",
        href: "/garden/species/add",
        icon: "icon-plus",
      },
      {
        id: "crops",
        label: "Crops",
        href: "/garden/crops",
        icon: "icon-package",
      },
      {
        id: "add-batch",
        label: "Add Batch",
        href: "/garden/crops/add",
        icon: "icon-plus",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/inventory",
    icon: "icon-package",
    children: [
      {
        id: "inventory-ops",
        label: "Ops",
        href: "/inventory/ops",
        icon: "icon-activity",
      },
      {
        id: "inventory-locations",
        label: "Locations",
        href: "/inventory/locations",
        icon: "icon-map-pin",
      },
      {
        id: "inventory-bins",
        label: "Bins",
        href: "/inventory/bins",
        icon: "icon-inbox",
      },
    ],
  },
  {
    id: "calendar",
    label: "Calendar",
    href: "/calendar",
    icon: "icon-calendar",
  },
  {
    id: "people",
    label: "People",
    href: "/people",
    icon: "icon-user",
  },
  {
    id: "glossary",
    label: "Glossary",
    href: "/glossary",
    icon: "icon-book-open",
  },
  {
    id: "team",
    label: "Team",
    href: "/team",
    icon: "icon-users",
  },
  {
    id: "admin",
    label: "Administration",
    href: "/admin",
    icon: "icon-shield",
    requiredRole: "admin",
    children: [
      {
        id: "users",
        label: "Users",
        href: "/admin/users",
        icon: "icon-user",
      },
      {
        id: "roles",
        label: "Roles",
        href: "/admin/roles",
        icon: "icon-user-check",
      },
      {
        id: "system",
        label: "System",
        href: "/admin/system",
        icon: "icon-server",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: "icon-settings",
    children: [
      {
        id: "profile",
        label: "Profile",
        href: "/settings/profile",
        icon: "icon-user",
      },
      {
        id: "preferences",
        label: "Preferences",
        href: "/settings/preferences",
        icon: "icon-sliders",
      },
      {
        id: "api",
        label: "API Keys",
        href: "/settings/api",
        icon: "icon-key",
      },
      {
        id: "notifications",
        label: "Notifications",
        href: "/settings/notifications",
        icon: "icon-bell",
      },
      {
        id: "security",
        label: "Security",
        href: "/settings/security",
        icon: "icon-lock",
      },
    ],
  },
];

export function getMenuItemsByRole(userRole?: string): MenuItem[] {
  if (!userRole) return menuConfig;

  return menuConfig
    .filter((item) => !item.requiredRole || item.requiredRole === userRole)
    .map((item) => {
      if (!item.children) return item;
      return {
        ...item,
        children: item.children.filter((child) =>
          !child.requiredRole || child.requiredRole === userRole
        ),
      };
    });
}
