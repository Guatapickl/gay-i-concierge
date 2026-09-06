'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, MessageSquare, CalendarDays, Newspaper, Users, Calendar, BookOpen, Megaphone, ListTodo, Bot, Rss, Vote, Settings } from 'lucide-react';
import dynamic from 'next/dynamic';
const AvatarMenu = dynamic(() => import('@/components/AvatarMenu'), {ssr:false});
import FeedbackWidget from '@/components/FeedbackWidget';
import ThemeToggle from '@/components/ThemeToggle';
const ChatModalProvider = dynamic(() => import('@/components/ChatModalProvider'), {ssr:false});
import { useCurrentUser } from '@/hooks/useCurrentUser';

const navigation = [
  {href:'/',label:'Dashboard',icon:LayoutDashboard},
  {href:'/chat',label:'Communication Hub',icon:MessageSquare},
  {href:'/calendar',label:'Meeting Calendar',icon:CalendarDays},
  {href:'/events',label:'Events',icon:Calendar},
  {href:'/news',label:'News Feed',icon:Newspaper},
  {href:'/resources',label:'Resources',icon:BookOpen},
  {href:'/community',label:'Community',icon:Users},
  {href:'/feed',label:'Community Feed',icon:Rss},
  {href:'/announcements',label:'Announcements',icon:Megaphone},
  {href:'/agenda',label:'Agenda Maker',icon:ListTodo},
  {href:'/robot',label:'Robot Benchmark',icon:Bot},
  {href:'/vote',label:'Date votes',icon:Vote},
];
const publicNavigation = [
  {href:'/community',label:'Community'}, {href:'/events',label:'Events'},
  {href:'/news',label:'News'}, {href:'/resources',label:'Resources'},
];

export default function AppLayout({ children }: {children: React.ReactNode}) {
  const pathname = usePathname();
  const {user} = useCurrentUser();
  const [mobileOpen,setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const isAuth = pathname.startsWith('/auth');
  const isLegal = ['/privacy-policy','/terms-of-use','/accessibility'].includes(pathname);
  const member = !!user && !isAuth && !isLegal;
  const current = navigation.find(n => n.href === '/' ? pathname === '/' : pathname === n.href || pathname.startsWith(n.href + '/'));
  const active = (href:string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');
  useEffect(() => { setMobileOpen(false); }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow='hidden';
    drawer.current?.querySelector<HTMLElement>('button, a')?.focus();
    const key = (e:KeyboardEvent) => {
      if(e.key==='Escape'){setMobileOpen(false);menuButton.current?.focus();}
      if(e.key==='Tab') {
        const els=drawer.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if(!els?.length)return;
        if(e.shiftKey && document.activeElement===els[0]) {e.preventDefault();els[els.length-1].focus();}
        else if(!e.shiftKey && document.activeElement===els[els.length-1]) {e.preventDefault();els[0].focus();}
      }
    };
    window.addEventListener('keydown',key);
    return ()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',key);};
  },[mobileOpen]);
  return <div className={`site-shell ${member ? 'member-shell' : 'public-shell'}`}>
    <a href="#main-content" className="skip-link" inert={mobileOpen}>Skip to content</a>
    <header className="site-header" inert={mobileOpen}>
      <Link href="/" className="wordmark"><span>Gay I Club</span><span className="wordmark-meta">NYC · EST. 2024</span></Link>
      {!member && <nav className="public-nav" aria-label="Main navigation">{publicNavigation.map(n=><Link key={n.href} href={n.href} aria-current={active(n.href)?'page':undefined}>{n.label}</Link>)}</nav>}
      {member && <span className="header-location">{current?.label || 'Your club'}</span>}
      <div className="header-actions"><ThemeToggle/><div className="header-account"><AvatarMenu/></div>
        <button ref={menuButton} type="button" className="mobile-menu-toggle" onClick={()=>setMobileOpen(true)} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label="Open navigation"><Menu size={21}/></button>
      </div>
    </header>
    {member && <aside className="sidebar" inert={mobileOpen}><nav aria-label="Club navigation">{[
      {label:'Home',paths:['/']},
      {label:'Connect',paths:['/chat','/community','/feed']},
      {label:'Happenings',paths:['/calendar','/events','/news','/announcements','/vote']},
      {label:'Tools',paths:['/resources','/agenda','/robot']},
    ].map(group=><div key={group.label}><p className="eyebrow sidebar-label mt-5">{group.label}</p>{group.paths.map(path=>navigation.find(n=>n.href===path)!).map(({href,label,icon:Icon})=><Link href={href} key={href} className={active(href)?'active':''} aria-current={active(href)?'page':undefined}><Icon size={17}/><span>{label}</span></Link>)}</div>)}</nav><Link className="sidebar-settings" href="/profile"><Settings size={17}/>Your profile</Link><div className="sidebar-note">GAY PEOPLE EXPLORING<br/>THE AI FRONTIER</div></aside>}
    {mobileOpen && <div className="drawer-backdrop" onClick={e=>{if(e.target===e.currentTarget){setMobileOpen(false);menuButton.current?.focus();}}}>
      <div className="mobile-drawer" id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation" ref={drawer}>
        <div className="flex justify-between items-center mb-6"><span className="font-semibold">Gay I Club</span><button className="icon-button" aria-label="Close navigation" onClick={()=>{setMobileOpen(false);menuButton.current?.focus();}}><X size={22}/></button></div>
        <nav aria-label="Mobile navigation">{(member ? navigation : [{href:'/',label:'Home'},...publicNavigation,{href:'/auth/sign-in',label:'Sign in'},{href:'/auth/sign-up',label:'Join the club'}]).map(n=><Link key={n.href} href={n.href} onClick={()=>setMobileOpen(false)} aria-current={active(n.href)?'page':undefined}>{n.label}</Link>)}</nav>
        {member && <Link className="btn-secondary mt-5" href="/profile" onClick={()=>setMobileOpen(false)}>Your profile</Link>}
      </div>
    </div>}
    <div className="site-body" inert={mobileOpen}><main id="main-content" tabIndex={-1} className={pathname==='/'&&!member?'landing-main':'content-main'}>{children}</main>
      <footer className="site-footer"><div><span>Gay I Club · a VibeShift AI project</span><p>© {new Date().getFullYear()} VibeShift AI. All rights reserved.</p></div><nav aria-label="Legal"><Link href="/privacy-policy">Privacy Policy</Link><Link href="/terms-of-use">Terms of Use</Link><Link href="/accessibility">Accessibility</Link></nav></footer>
    </div>
    <FeedbackWidget hidden={mobileOpen || pathname==='/profile'}/>
    {member && !mobileOpen && <><nav className="mobile-tabbar" aria-label="Quick navigation">{[navigation[0],navigation[1],navigation[3],navigation[4]].map(({href,label,icon:Icon})=><Link href={href} key={href} aria-label={label} aria-current={active(href)?'page':undefined}><Icon size={20}/><span>{href==='/'?'Home':href==='/chat'?'Hub':href==='/events'?'Events':'News'}</span></Link>)}</nav>{pathname!=='/profile' && <ChatModalProvider/>}</>}
  </div>;
}
