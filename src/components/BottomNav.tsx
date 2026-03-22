import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Home, BookOpen, Calendar, Flame, ClipboardList, MessageSquare, Sun,
  Sparkles, ChefHat, MoreHorizontal, X, LayoutTemplate, Settings,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const plannerPrimaryNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/planner', label: 'Planner', icon: Calendar },
  { to: '/calendar-planner', label: 'Calendar', icon: Calendar },
  { to: '/shortlist', label: 'Discover', icon: ChefHat },
  { to: '/generate', label: 'AI Chef', icon: Sparkles },
];

const plannerMoreNav = [
  { to: '/recipes', label: 'Recipes', icon: BookOpen },
  { to: '/cook-now', label: 'Cook Now', icon: Flame },
  { to: '/prep', label: 'Prep', icon: ClipboardList },
  { to: '/requests', label: 'Requests', icon: MessageSquare },
  { to: '/templates', label: 'Templates', icon: LayoutTemplate },
  { to: '/rituals', label: 'Rituals', icon: Sun },
  { to: '/household', label: 'Settings', icon: Settings },
];

const familyMemberPrimaryNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/requests', label: 'Request', icon: MessageSquare },
  { to: '/recipes', label: 'Recipes', icon: BookOpen },
  { to: '/household', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { role } = useAuth();
  const [showMore, setShowMore] = useState(false);

  const isPlanner = role === 'planner';
  const primaryNav = isPlanner ? plannerPrimaryNav : familyMemberPrimaryNav;
  const moreNav = isPlanner ? plannerMoreNav : [];
  const hasMore = moreNav.length > 0;
  const isMoreActive = moreNav.some(item => pathname === item.to);

  return (
    <>
      <AnimatePresence>
        {showMore && hasMore && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setShowMore(false)} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="fixed bottom-[56px] left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-lg md:hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-muted-foreground">More</span>
                  <button onClick={() => setShowMore(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-4 w-4 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {moreNav.map(item => {
                    const active = pathname === item.to;
                    return (
                      <Link key={item.to} to={item.to} onClick={() => setShowMore(false)} className={`flex flex-col items-center gap-1 p-3 rounded-xl text-xs transition-colors ${active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted'}`}>
                        <item.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around py-2">
          {primaryNav.map(item => {
            const active = pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                <item.icon className={`h-5 w-5 ${active ? 'text-primary' : ''}`} />
                {item.label}
              </Link>
            );
          })}
          {hasMore && (
            <button onClick={() => setShowMore(!showMore)} className={`flex flex-col items-center gap-0.5 px-2 py-1 text-xs transition-colors ${isMoreActive || showMore ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
              <MoreHorizontal className={`h-5 w-5 ${isMoreActive || showMore ? 'text-primary' : ''}`} />
              More
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
