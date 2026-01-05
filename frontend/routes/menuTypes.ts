export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  children?: MenuItem[];
  badge?: string | number;
  requiredRole?: string;
}
