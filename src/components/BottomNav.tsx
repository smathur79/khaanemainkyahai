import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Calendar, Sparkles, ChefHat } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/recipes', label: 'Recipes', icon: BookOpen },
  { to: '/planner', label: 'Planner', icon: Calendar },
  { to: '/generate', label: 'AI Chef', icon: Sparkles },
  { to: '/shortlist', label: 'Discover', icon: ChefHat },
];

export default function BottomNav() {
  const { pathname } = useLocation();

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
