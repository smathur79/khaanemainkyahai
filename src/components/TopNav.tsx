import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, Calendar, Flame, ClipboardList, ChefHat, UtensilsCrossed, Settings } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/planner', label: 'Planner', icon: Calendar },
  { to: '/recipes', label: 'Recipes', icon: BookOpen },
  { to: '/cook-now', label: 'Cook Now', icon: Flame },
  { to: '/prep', label: 'Prep', icon: ClipboardList },
  { to: '/shortlist', label: 'Discover', icon: ChefHat },
  { to: '/household', label: 'Settings', icon: Settings },
];

export default function TopNav() {
  const { pathname } = useLocation();

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <UtensilsCrossed className="h-6 w-6" />
          Family Meal Planner
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map(item => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
