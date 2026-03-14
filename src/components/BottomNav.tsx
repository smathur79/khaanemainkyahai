import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Home, BookOpen, Calendar, Flame, ClipboardList, MessageSquare, Sun } from 'lucide-react';

const plannerNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/planner', label: 'Planner', icon: Calendar },
  { to: '/requests', label: 'Requests', icon: MessageSquare },
  { to: '/prep', label: 'Prep', icon: ClipboardList },
  { to: '/recipes', label: 'Recipes', icon: BookOpen },
];

const requestorNav = [
  { to: '/planner', label: 'Calendar', icon: Calendar },
  { to: '/requests', label: 'Request', icon: MessageSquare },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const navItems = role === 'planner' ? plannerNav : requestorNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map(item => {
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${
                active ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
