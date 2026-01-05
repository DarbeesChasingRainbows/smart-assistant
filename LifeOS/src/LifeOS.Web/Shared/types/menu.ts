export interface MenuItem {
  id: string;
  label: string;
  icon: string; // Icon name string to be mapped to actual icon component
  path?: string;
  children?: MenuItem[];
  badge?: string | number;
  order: number;
  requiredRole?: string;
  disabled?: boolean;
  external?: boolean;
  target?: '_blank' | '_self';
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export interface NavigationState {
  isCollapsed: boolean;
  isMobileMenuOpen: boolean;
  activePath?: string;
  breadcrumbs: MenuItem[];
}

export interface MenuContextType extends NavigationState {
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  openMobileMenu: () => void;
  setCollapsed: (collapsed: boolean) => void;
  setActivePath: (path: string) => void;
}
