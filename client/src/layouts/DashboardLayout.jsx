import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  LayoutDashboard,
  Megaphone,
  Menu,
  Package,
  Plus,
  Sparkles,
  Store,
  UserRound,
  X,
  LogOut,
} from 'lucide-react';
import Brand from '../components/Brand.jsx';
import ApiStatus from '../components/ApiStatus.jsx';
import useResource from '../hooks/useResource.js';
import { useAuth } from '../auth/AuthContext.js';

const navigation = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/products', label: 'Products', icon: Package },
  { to: '/dashboard/campaigns', label: 'Campaigns', icon: Megaphone, end: true },
  { to: '/dashboard/calendar', label: 'Content calendar', icon: CalendarDays },
];

export default function DashboardLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const auth = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const profile = useResource('/business-profile');
  const products = useResource('/products');
  const campaigns = useResource('/campaigns');
  const schedules = useResource('/schedules');
  const { pathname } = useLocation();
  const currentPage =
    [
      ...navigation,
      { to: '/dashboard/campaigns/new', label: 'New campaign' },
      { to: '/dashboard/profile', label: 'Business profile' },
    ].find((item) => item.to === pathname)?.label ||
    (pathname.startsWith('/dashboard/campaigns/') ? 'Campaign draft' : 'Page not found');

  function closeMenu() {
    setMenuOpen(false);
  }

  async function logout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await auth.logout();
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-white lg:flex">
        <div className="px-6 py-7">
          <Brand />
        </div>
        <div className="mx-4 mb-7 flex items-center gap-3 rounded-xl border border-line bg-canvas/70 p-3">
          <span className="grid size-9 place-items-center rounded-lg border border-line bg-white text-sage">
            <Store size={18} />
          </span>
          <div>
            <p className="max-w-36 truncate text-xs font-semibold">
              {profile.data?.profile?.name || 'Your business'}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">Business workspace</p>
          </div>
        </div>
        <div className="px-6 text-[10px] font-semibold tracking-[.16em] text-muted">WORKSPACE</div>
        <nav aria-label="Main navigation" className="mt-3 space-y-1 px-3">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
            </NavLink>
          ))}
          <NavLink
            to="/dashboard/campaigns/new"
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            <Plus size={18} />
            New campaign
            <span className="ml-auto text-lime">
              <Sparkles size={13} />
            </span>
          </NavLink>
        </nav>
        <div className="mt-auto px-4 pb-4 pt-8">
          <div className="mb-5 rounded-xl bg-[#f0f4eb] p-4">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-forest">
              <Sparkles size={15} />A good place to start
            </span>
            <p className="text-xs leading-5 text-muted">
              A little local business.
              <br />A world of possibilities.
            </p>
            <Link
              to="/"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-forest"
            >
              Meet LocalBiz AI
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <NavLink
            to="/dashboard/profile"
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
          >
            <UserRound size={18} strokeWidth={1.7} />
            Business profile
          </NavLink>
          <div className="mt-4 border-t border-line pt-3">
            <ApiStatus />
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="flex h-[76px] items-center justify-between gap-4 border-b border-line bg-white px-5 sm:px-8 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg p-2 text-ink hover:bg-canvas lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="hidden text-sm text-muted sm:inline">Workspace</span>
            <ChevronRight size={13} className="hidden text-stone-400 sm:block" />
            <span className="truncate text-sm font-medium">{currentPage}</span>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <span className="badge">
              <span className="size-1.5 rounded-full bg-sage" />
              Business workspace
            </span>
            <Link
              to="/dashboard/profile"
              aria-label="Open business profile"
              className="hidden size-8 place-items-center rounded-full border border-line bg-canvas text-xs font-semibold sm:grid"
            >
              {auth.user.name.slice(0, 2).toUpperCase()}
            </Link>
            <button
              className="icon-button"
              aria-label="Log out"
              title="Log out"
              disabled={loggingOut}
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        {logoutError && (
          <p role="alert" className="mx-5 mt-4 text-sm text-red-700">
            {logoutError}
          </p>
        )}

        {menuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="border-b border-line bg-white p-3 lg:hidden"
            onKeyDown={(event) => {
              if (event.key === 'Escape') closeMenu();
            }}
          >
            {[
              ...navigation,
              { to: '/dashboard/campaigns/new', label: 'New campaign', icon: Plus },
              { to: '/dashboard/profile', label: 'Business profile', icon: UserRound },
            ].map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={closeMenu}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
            <div className="px-3">
              <ApiStatus />
            </div>
          </nav>
        )}

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-[1480px] px-5 py-8 sm:px-8 lg:px-10"
        >
          <Outlet context={{ profile, products, campaigns, schedules }} />
        </main>
        <footer className="mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-line py-5 text-[11px] text-muted sm:mx-8 lg:mx-10">
          <span>Built for the businesses that make a neighborhood.</span>
          <span className="inline-flex items-center gap-1.5">
            <CircleHelp size={13} />
            LocalBiz AI · LovHack Season 3
          </span>
        </footer>
      </div>
    </div>
  );
}
