# Unified Menu System for LifeOS

A comprehensive, responsive navigation system built with React, TypeScript, DaisyUI, and Tailwind CSS that provides a consistent menu experience across all pages.

## Features

- **Responsive Design**: Adapts seamlessly between desktop and mobile layouts
- **Role-Based Access**: Menu items can be shown/hidden based on user roles
- **Collapsible Sidebar**: Toggle between expanded and collapsed states on desktop
- **Nested Menu Support**: Multi-level menu items with expand/collapse functionality
- **Active State Tracking**: Automatically highlights active menu items and expands parent menus
- **Badge Support**: Display badges/notifications on menu items
- **Icon Integration**: Consistent icon system using React Icons
- **Breadcrumb Navigation**: Automatic breadcrumb generation based on current route
- **Theme Support**: Works with DaisyUI themes (light/dark mode)
- **Accessibility**: Keyboard navigation and ARIA support

## Components

### Core Components

1. **UnifiedMenuV2** (`/Shared/Layout/UnifiedMenuV2.tsx`)
   - Main navigation component
   - Handles menu rendering, state management, and interactions

2. **MainLayout** (`/Shared/Layout/MainLayout.tsx`)
   - Layout wrapper that includes the sidebar, top bar, and content area
   - Responsive behavior for mobile/desktop

3. **NavigationContext** (`/Shared/Context/NavigationContext.tsx`)
   - Global state management for navigation
   - Handles sidebar collapse/expand and mobile menu state

4. **IconMapper** (`/Shared/Components/IconMapper.tsx`)
   - Maps icon names to React Icon components
   - Centralized icon management

5. **Breadcrumbs** (`/Shared/Components/Breadcrumbs.tsx`)
   - Automatic breadcrumb generation
   - Based on current route and menu configuration

### Configuration

6. **menuConfig** (`/Shared/Config/menuConfig.ts`)
   - Centralized menu configuration
   - Defines menu structure, roles, badges, and ordering

7. **Menu Types** (`/Shared/types/menu.ts`)
   - TypeScript type definitions for menu system

## Usage

### Basic Setup

```tsx
import React from 'react';
import { NavigationProvider } from './Shared/Context/NavigationContext';
import MainLayout from './Shared/Layout/MainLayout';

const App: React.FC = () => {
  return (
    <NavigationProvider>
      <MainLayout />
    </NavigationProvider>
  );
};
```

### Customizing Menu Items

Edit `/Shared/Config/menuConfig.ts`:

```typescript
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
      }
    ],
    order: 2
  }
];
```

### Adding New Icons

1. Import the icon in `IconMapper.tsx`
2. Add it to the `iconMap` object:

```typescript
import { FiYourNewIcon } from 'react-icons/fi';

const iconMap: Record<string, React.ComponentType<any>> = {
  // ... existing icons
  FiYourNewIcon,
};
```

### Role-Based Menu Items

Add the `requiredRole` property to menu items:

```typescript
{
  id: 'admin',
  label: 'Administration',
  icon: 'FiShield',
  requiredRole: 'admin',
  children: [
    // admin-only items
  ]
}
```

### Adding Badges

Add the `badge` property to menu items:

```typescript
{
  id: 'transactions',
  label: 'Transactions',
  icon: 'FiFileText',
  path: '/finance/transactions',
  badge: 'New' // or number: 5
}
```

## Styling

The menu system uses DaisyUI classes and can be customized through:

1. **Theme Colors**: Uses DaisyUI semantic colors (`primary`, `base-100`, etc.)
2. **Tailwind Utilities**: Can override with utility classes
3. **CSS Variables**: For custom properties

### Custom CSS Example

```css
/* Override active menu item background */
.menu-item-active {
  background-color: var(--color-primary) !important;
}

/* Custom badge styles */
.menu-badge {
  animation: pulse 2s infinite;
}
```

## Mobile Behavior

- Sidebar transforms into a slide-out drawer on mobile
- Overlay appears when menu is open
- Touch-friendly tap targets
- Swipe gestures (can be added with react-swipeable)

## Accessibility Features

- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader friendly

## Performance Considerations

- Menu items are lazy-loaded based on role
- Icon components are memoized
- Efficient state management with Context API
- Minimal re-renders

## Integration with Existing Routes

The menu system works with React Router. Ensure your route structure matches the menu configuration:

```typescript
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'finance/accounts', element: <AccountsList /> },
      // ... other routes
    ]
  }
]);
```

## Troubleshooting

### Menu Not Showing
- Check if `NavigationProvider` wraps your app
- Verify menu configuration is properly imported
- Check console for any icon mapping errors

### Active State Not Working
- Ensure route paths match menu item paths exactly
- Check if `useLocation` is being used correctly
- Verify breadcrumb configuration

### Mobile Menu Issues
- Check responsive breakpoints in Tailwind config
- Verify z-index values for proper layering
- Test on actual mobile devices

## Future Enhancements

- [ ] Search functionality in menu
- [ ] Recent items history
- [ ] Keyboard shortcuts
- [ ] Drag-and-drop menu reordering
- [ ] Menu analytics/tracking
- [ ] Multi-language support
- [ ] Custom menu themes per user
