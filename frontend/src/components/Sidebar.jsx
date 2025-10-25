import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertCircle,
  Camera,
  MessageSquare,
  Users,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const { userRole } = useAuth();

  const navItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
      roles: ['flight_attendant', 'inventory_manager', 'admin'],
    },
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
      roles: ['flight_attendant', 'inventory_manager', 'admin'],
    },
    {
      title: 'CRM Alerts',
      icon: AlertCircle,
      path: '/alerts',
      roles: ['inventory_manager', 'admin'],
    },
    {
      title: 'Photo Management',
      icon: Camera,
      path: '/photos',
      roles: ['flight_attendant', 'inventory_manager', 'admin'],
    },
    {
      title: 'Chatbot',
      icon: MessageSquare,
      path: '/chatbot',
      roles: ['flight_attendant', 'inventory_manager', 'admin'],
    },
    {
      title: 'User Admin',
      icon: Users,
      path: '/admin',
      roles: ['admin'],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="fixed bottom-0 top-0 border-r z-40 border-border bg-card overflow-hidden transition-[width] duration-200 ease-linear group w-16 hover:w-64">
      <div className="flex flex-col h-full py-6">
        <nav className="flex-1 px-2 space-y-4">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-all',
                  'justify-center group-hover:justify-start',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* single icon always visible */}
                  <item.icon className="h-5 w-5 flex-shrink-0" />

                  {/* title hidden when collapsed; fades in when rail (aside) is hovered */}
                  <span className="truncate opacity-0 group-hover:opacity-100 transition-all duration-200 max-w-0 group-hover:max-w-[12rem] overflow-hidden whitespace-nowrap">
                    {item.title}
                  </span>

                  {/* active indicator */}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">Airline Catering CRM</p>
            <p className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">Waste Management System</p>
            <p className="text-[10px] mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
