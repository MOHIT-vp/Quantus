import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import { Menu, Search, X } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true }, { to: '/leads', label: 'Prospects' }, { to: '/pipeline', label: 'Pipeline' }, { to: '/customers', label: 'Accounts' }, { to: '/team', label: 'Team', managerOnly: true },
];
export default function Layout() {
  const { user, isManager, logout } = useAuth(); const navigate = useNavigate(); const [menuOpen, setMenuOpen] = useState(false); const [searchOpen, setSearchOpen] = useState(false); const [searchQuery, setSearchQuery] = useState('');
  const links = NAV_ITEMS.filter(item => !item.managerOnly || isManager);
  const handleSearch = (event: React.FormEvent) => { event.preventDefault(); const query = searchQuery.trim(); if (query) navigate(`/leads?search=${encodeURIComponent(query)}`); setSearchOpen(false); setMenuOpen(false); };
  return <div className="app-shell text-charcoal">
    <header className="relative z-20 border-b border-hairline bg-ivory/90 backdrop-blur-md">
      <div className="mx-auto flex h-[74px] w-full max-w-[1440px] items-center justify-between px-5 md:px-10 lg:px-16">
        <NavLink to="/" className="font-[family-name:var(--font-display)] text-[1.65rem] tracking-[-.06em] text-charcoal">Quantus<span className="text-bronze">.</span></NavLink>
        <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">{links.map(item => <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `relative py-7 text-[.68rem] font-semibold uppercase tracking-[.13em] transition-colors ${isActive ? 'text-charcoal after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-bronze' : 'text-stone hover:text-charcoal'}`}>{item.label}</NavLink>)}</nav>
        <div className="flex items-center gap-3"><button type="button" aria-label="Search prospects" onClick={() => setSearchOpen(value => !value)} className="grid h-10 w-10 place-items-center border border-hairline text-charcoal transition-colors hover:border-bronze hover:text-bronze"><Search size={17} strokeWidth={1.6}/></button><button type="button" aria-label="Open navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)} className="grid h-10 w-10 place-items-center border border-hairline text-charcoal lg:hidden"><Menu size={18} strokeWidth={1.6}/></button><div className="hidden border-l border-hairline pl-4 text-right sm:block"><p className="max-w-[10rem] truncate text-[.76rem] font-semibold">{user?.name}</p><p className="font-[family-name:var(--font-ticker)] text-[.58rem] uppercase tracking-[.1em] text-stone">{isManager ? 'Manager' : 'Sales rep'}</p></div><button type="button" onClick={logout} className="signout-btn hidden md:flex ml-2"><div className="sign"><svg viewBox="0 0 512 512"><path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"></path></svg></div><div className="text">Logout</div></button></div>
      </div>
      {searchOpen && <form onSubmit={handleSearch} className="absolute inset-x-0 top-full border-b border-hairline bg-ivory px-5 py-4 shadow-[0_16px_35px_rgba(75,46,43,.09)] md:px-10"><div className="mx-auto flex max-w-[1440px] items-center gap-3"><Search size={18} className="text-bronze"/><input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search prospects by company or contact" className="input-institutional flex-1"/><button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search" className="p-2 text-stone hover:text-charcoal"><X size={18}/></button></div></form>}
      {menuOpen && <div className="absolute inset-x-0 top-full border-b border-hairline bg-ivory px-5 py-5 shadow-[0_16px_35px_rgba(75,46,43,.09)] lg:hidden"><nav className="flex flex-col">{links.map(item => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={({isActive}) => `border-b border-hairline py-4 text-sm font-semibold ${isActive ? 'text-bronze' : 'text-charcoal'}`}>{item.label}</NavLink>)}<button type="button" onClick={logout} className="pt-5 text-left text-[.68rem] font-semibold uppercase tracking-[.13em] text-stone">Sign out</button></nav></div>}
    </header><main className="app-main"><Outlet /></main>
  </div>;
}
