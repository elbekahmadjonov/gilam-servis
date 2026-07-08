import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  LogOut, Building2, LayoutDashboard, Plus, ArrowLeft, ExternalLink, Trash2, Power,
  Users, Package, Wallet, TrendingUp, ChevronRight, Search, Moon, Sun,
} from 'lucide-react';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { ToastProvider, useToast } from '../context/ToastContext';
import { formatSum } from '../utils/formatlash';
import { ROLLAR } from '../utils/rollar';
import LangToggle from '../components/LangToggle';
import { superApi, getSuperToken, setSuperToken } from './superApi';

const WEB_BASE = import.meta.env.VITE_WEB_BASE || 'https://gilam.qariya.uz';

// ============================================================
// Auth
// ============================================================
function useSuperAuth() {
  const [admin, setAdmin]     = useState(null);
  const [loading, setLoading] = useState(true);

  const init = useCallback(async () => {
    if (!getSuperToken()) { setAdmin(null); setLoading(false); return; }
    try { setAdmin(await superApi.get('/me')); }
    catch { setAdmin(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { init(); }, [init]);

  const login = async (login, parol) => {
    const { token, admin } = await superApi.post('/login', { login, parol });
    setSuperToken(token); setAdmin(admin); return admin;
  };
  const logout = () => { setSuperToken(null); setAdmin(null); };
  return { admin, loading, login, logout };
}

// ============================================================
// Login
// ============================================================
function SuperLogin({ onLogin }) {
  const [login, setLogin] = useState('');
  const [parol, setParol] = useState('');
  const [xato, setXato]   = useState('');
  const [yuk, setYuk]     = useState(false);

  const submit = async () => {
    if (!login.trim() || !parol) { setXato('Login va parolni kiriting'); return; }
    setYuk(true); setXato('');
    try { await onLogin(login.trim(), parol); }
    catch (e) { setXato(e.message?.includes('parol') ? "Login yoki parol noto'g'ri" : 'Kirishda xatolik'); }
    finally { setYuk(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white dark:bg-black">
      {/* Chap — brend paneli (faqat desktop) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="text-2xl font-black">🛡️ Gilam Servis</div>
        <div>
          <h2 className="text-4xl font-black leading-tight">Boshqaruv<br/>markazi</h2>
          <p className="mt-4 text-blue-100 max-w-sm">Barcha mijozlar, obunalar va statistikani bitta joydan boshqaring.</p>
        </div>
        <p className="text-blue-200 text-sm">Super Admin panel</p>
      </div>
      {/* O'ng — forma */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Xush kelibsiz</h1>
          <p className="text-gray-400 mb-8">Davom etish uchun tizimga kiring</p>
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Login</label>
          <input value={login} onChange={e => setLogin(e.target.value)} placeholder="super"
            className="w-full mb-4 rounded-xl px-4 py-3 border-2 outline-none bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:border-blue-500" />
          <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">Parol</label>
          <input value={parol} onChange={e => setParol(e.target.value)} type="password" placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full mb-4 rounded-xl px-4 py-3 border-2 outline-none bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white focus:border-blue-500" />
          {xato && <p className="text-red-500 text-sm mb-4">{xato}</p>}
          <button onClick={submit} disabled={yuk}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-60">
            {yuk ? 'Kirilmoqda...' : 'Kirish'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Layout — yon menyu (sidebar) + kontent
// ============================================================
function NavItem({ to, icon: Icon, label }) {
  const { pathname } = useLocation();
  const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
  return (
    <Link to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition
        ${active ? 'bg-blue-600 text-white shadow-sm'
                 : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
      <Icon size={18} /> {label}
    </Link>
  );
}

function Shell({ admin, onLogout, children }) {
  const { dark, toggleDark } = useTheme();
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 sticky top-0 h-screen flex flex-col border-r border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
        <div className="text-lg font-black px-2 py-3 flex items-center gap-2">🛡️ <span>Gilam Admin</span></div>
        <nav className="flex flex-col gap-1 mt-4">
          <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/tenants" icon={Building2} label="Mijozlar" />
        </nav>
        <div className="mt-auto">
          <div className="flex items-center gap-2">
            <button onClick={toggleDark}
              className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              {dark ? <Sun size={18}/> : <Moon size={18}/>} {dark ? 'Yorug\'' : 'Qorong\'i'}
            </button>
            <LangToggle dark={dark} />
          </div>
          <div className="mt-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{admin?.ism || 'Super Admin'}</p>
              <p className="text-xs text-gray-400 truncate">@{admin?.login}</p>
            </div>
            <button onClick={onLogout} title="Chiqish" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950 p-2 rounded-lg"><LogOut size={16}/></button>
          </div>
        </div>
      </aside>
      {/* Kontent */}
      <main className="flex-1 min-w-0 p-8 max-w-[1400px]">{children}</main>
    </div>
  );
}

function PageHead({ title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h1 className="text-2xl font-black">{title}</h1>
        {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ============================================================
// Dashboard
// ============================================================
function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}><Icon size={18}/></span>
      </div>
      <p className="text-3xl font-black mt-3">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const active = status === 'active';
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${active
      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}`}>
      {active ? 'Faol' : "To'xtatilgan"}
    </span>
  );
}

function Dashboard() {
  const [s, setS] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    superApi.get('/stats').then(setS).catch(e => setErr(e.message));
    superApi.get('/tenants').then(setTenants).catch(() => {});
  }, []);
  if (err) return <p className="text-red-500">{err}</p>;
  if (!s)  return <p className="text-gray-400">Yuklanmoqda...</p>;

  return (
    <div>
      <PageHead title="Dashboard" subtitle="Platforma bo'yicha umumiy ko'rsatkichlar" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Building2}  label="Jami mijozlar"        value={s.jami_mijoz}      accent="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
        <StatCard icon={TrendingUp} label="Faol mijozlar"        value={s.faol_mijoz}      accent="bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400" />
        <StatCard icon={Users}      label="Jami xodimlar"        value={s.jami_xodim}      accent="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400" />
        <StatCard icon={Package}    label="Jami buyurtmalar"     value={s.jami_buyurtma}   accent="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
        <StatCard icon={Package}    label="Tugagan buyurtmalar"  value={s.tugagan_buyurtma} accent="bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400" />
        <StatCard icon={Wallet}     label="Jami daromad"         value={formatSum(s.jami_daromad)} accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400" />
      </div>

      {/* So'nggi mijozlar */}
      <div className="mt-8 bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold">So'nggi mijozlar</h3>
          <Link to="/tenants" className="text-sm text-blue-600 font-semibold flex items-center gap-1">Barchasi <ChevronRight size={15}/></Link>
        </div>
        <TenantTable rows={tenants.slice(0, 5)} compact />
      </div>
    </div>
  );
}

// ============================================================
// Mijozlar jadvali (qayta ishlatiladi)
// ============================================================
function TenantTable({ rows, compact }) {
  const nav = useNavigate();
  if (!rows) return <p className="text-gray-400 p-5">Yuklanmoqda...</p>;
  if (rows.length === 0) return <p className="text-gray-400 p-8 text-center">Hali mijoz yo'q.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-100 dark:border-gray-800">
            <th className="px-5 py-3 font-semibold">Biznes</th>
            <th className="px-5 py-3 font-semibold">Holat</th>
            <th className="px-5 py-3 font-semibold">Reja</th>
            <th className="px-5 py-3 font-semibold text-right">Xodim</th>
            <th className="px-5 py-3 font-semibold text-right">Buyurtma</th>
            {!compact && <th className="px-5 py-3"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(t => (
            <tr key={t.id} onClick={() => nav(`/tenants/${t.id}`)}
              className="border-b border-gray-50 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
              <td className="px-5 py-3.5">
                <div className="font-bold">{t.nomi}</div>
                <div className="text-xs text-gray-400">/{t.slug}{t.bot_username ? ` · @${t.bot_username}` : ''}</div>
              </td>
              <td className="px-5 py-3.5"><StatusPill status={t.status} /></td>
              <td className="px-5 py-3.5 capitalize">{t.reja}</td>
              <td className="px-5 py-3.5 text-right tabular-nums">{t.xodim_soni}{t.limit_xodim ? <span className="text-gray-400">/{t.limit_xodim}</span> : ''}</td>
              <td className="px-5 py-3.5 text-right tabular-nums">{t.buyurtma_soni}{t.limit_buyurtma ? <span className="text-gray-400">/{t.limit_buyurtma}</span> : ''}</td>
              {!compact && <td className="px-5 py-3.5 text-gray-300"><ChevronRight size={16}/></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Tenants() {
  const [list, setList] = useState(null);
  const [q, setQ]       = useState('');
  const [err, setErr]   = useState('');
  useEffect(() => { superApi.get('/tenants').then(setList).catch(e => setErr(e.message)); }, []);

  const filtered = list?.filter(t =>
    !q.trim() || t.nomi.toLowerCase().includes(q.toLowerCase()) || t.slug.includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHead title="Mijozlar" subtitle="Barcha bizneslar (tenant)"
        action={<Link to="/tenants/yangi" className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 text-sm"><Plus size={17}/>Yangi mijoz</Link>} />
      {err && <p className="text-red-500 mb-3">{err}</p>}
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Qidirish..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 outline-none focus:border-blue-500" />
          </div>
        </div>
        <TenantTable rows={filtered} />
      </div>
    </div>
  );
}

// ============================================================
// Yangi mijoz
// ============================================================
function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{label}</span>
      {hint && <span className="text-xs text-gray-400 ml-2">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
const inputCls = "w-full rounded-xl px-3.5 py-2.5 border-2 outline-none bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:border-blue-500";

function TenantForm() {
  const nav = useNavigate();
  const { showToast } = useToast();
  const [f, setF] = useState({ nomi: '', slug: '', bot_token: '', reja: 'free', limit_buyurtma: '', limit_xodim: '', admin_login: 'admin', admin_parol: 'admin123' });
  const [err, setErr] = useState('');
  const [yuk, setYuk] = useState(false);
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.nomi.trim() || !f.slug.trim()) { setErr('Nomi va slug talab qilinadi'); return; }
    setYuk(true); setErr('');
    try {
      const res = await superApi.post('/tenants', {
        ...f,
        limit_buyurtma: f.limit_buyurtma ? Number(f.limit_buyurtma) : null,
        limit_xodim:    f.limit_xodim ? Number(f.limit_xodim) : null,
      });
      showToast('Mijoz yaratildi' + (res.bot?.username ? ` · bot @${res.bot.username} sozlandi` : ''), 'success');
      nav(`/tenants/${res.tenant.id}`);
    } catch (e) { setErr(e.message?.includes('band') ? 'Bu slug allaqachon band' : 'Xatolik: ' + e.message); }
    finally { setYuk(false); }
  };

  return (
    <div className="max-w-2xl">
      <Link to="/tenants" className="text-sm text-gray-500 flex items-center gap-1 mb-4"><ArrowLeft size={16}/>Mijozlar</Link>
      <PageHead title="Yangi mijoz" subtitle="Biznes va uning admini yaratiladi" />
      <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Biznes nomi"><input value={f.nomi} onChange={e => up('nomi', e.target.value)} placeholder="Musaffo Gilam" className={inputCls}/></Field>
          <Field label="Slug" hint="URL, kichik harf"><input value={f.slug} onChange={e => up('slug', e.target.value)} placeholder="musaffo" className={inputCls}/></Field>
        </div>
        <Field label="Telegram bot tokeni" hint="BotFather'dan"><input value={f.bot_token} onChange={e => up('bot_token', e.target.value)} placeholder="1234:ABC..." className={inputCls}/></Field>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Buyurtma limiti" hint="bo'sh = cheksiz"><input type="number" value={f.limit_buyurtma} onChange={e => up('limit_buyurtma', e.target.value)} placeholder="∞" className={inputCls}/></Field>
          <Field label="Xodim limiti" hint="bo'sh = cheksiz"><input type="number" value={f.limit_xodim} onChange={e => up('limit_xodim', e.target.value)} placeholder="∞" className={inputCls}/></Field>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Admin login"><input value={f.admin_login} onChange={e => up('admin_login', e.target.value)} className={inputCls}/></Field>
          <Field label="Admin parol"><input value={f.admin_parol} onChange={e => up('admin_parol', e.target.value)} className={inputCls}/></Field>
        </div>
        {err && <p className="text-red-500 text-sm">{err}</p>}
        <button onClick={submit} disabled={yuk} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-60">
          {yuk ? 'Yaratilmoqda...' : 'Mijoz yaratish'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Mijoz detali
// ============================================================
function TenantDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { showToast } = useToast();
  const [t, setT] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    superApi.get('/tenants').then(list => {
      const found = list.find(x => x.id === id);
      if (!found) setErr('Mijoz topilmadi'); else setT(found);
    }).catch(e => setErr(e.message));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const patch = async (body) => {
    try { await superApi.patch(`/tenants/${id}`, body); showToast('Saqlandi', 'success'); load(); }
    catch (e) { showToast('Xato: ' + e.message, 'error'); }
  };
  const toggleStatus = () => patch({ status: t.status === 'active' ? 'suspended' : 'active' });
  const impersonate = async () => {
    try {
      const { token, slug } = await superApi.post(`/tenants/${id}/impersonate`, {});
      window.open(`${WEB_BASE}/?t=${slug}#imp=${encodeURIComponent(token)}`, '_blank');
    } catch (e) { showToast('Xato: ' + e.message, 'error'); }
  };
  const remove = async () => {
    if (!confirm(`"${t.nomi}" va BARCHA ma'lumoti o'chiriladi. Tasdiqlaysizmi?`)) return;
    try { await superApi.del(`/tenants/${id}`); showToast("O'chirildi", 'success'); nav('/tenants'); }
    catch (e) { showToast('Xato: ' + e.message, 'error'); }
  };

  if (err) return <p className="text-red-500">{err}</p>;
  if (!t)  return <p className="text-gray-400">Yuklanmoqda...</p>;

  const Row = ({ label, children }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-900 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-semibold text-sm text-right">{children}</span>
    </div>
  );

  return (
    <div className="max-w-4xl">
      <Link to="/tenants" className="text-sm text-gray-500 flex items-center gap-1 mb-4"><ArrowLeft size={16}/>Mijozlar</Link>
      <PageHead title={t.nomi} subtitle={`/${t.slug}`} action={<StatusPill status={t.status} />} />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Chap — ma'lumot */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <h3 className="font-bold mb-2">Ma'lumot</h3>
            <Row label="Bot">{t.bot_username ? '@' + t.bot_username : (t.bot_token_bor ? 'sozlangan' : "— yo'q")}</Row>
            <Row label="Xodimlar">{t.xodim_soni}{t.limit_xodim ? ` / ${t.limit_xodim}` : ''}</Row>
            <Row label="Buyurtmalar">{t.buyurtma_soni}{t.limit_buyurtma ? ` / ${t.limit_buyurtma}` : ''}</Row>
            <Row label="Reja"><span className="capitalize">{t.reja}</span></Row>
            <Row label="Mini App URL"><a href={`${WEB_BASE}/?t=${t.slug}`} target="_blank" rel="noreferrer" className="text-blue-600">{WEB_BASE}/?t={t.slug}</a></Row>
          </div>

          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <h3 className="font-bold mb-3">Sozlamalar</h3>
            <LimitEditor t={t} onSave={patch} />
          </div>

          <XodimlarManager tenantId={id} onChange={load} />
        </div>

        {/* O'ng — amallar */}
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-2.5">
            <h3 className="font-bold mb-1">Amallar</h3>
            <button onClick={impersonate} className="w-full py-2.5 rounded-xl font-bold bg-blue-600 text-white flex items-center justify-center gap-2"><ExternalLink size={16}/>Panelga kirish</button>
            <button onClick={toggleStatus} className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 ${t.status === 'active' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' : 'bg-green-600 text-white'}`}>
              <Power size={16}/>{t.status === 'active' ? "To'xtatish" : 'Faollashtirish'}
            </button>
            <button onClick={remove} className="w-full py-2.5 rounded-xl font-bold text-red-600 border border-red-200 dark:border-red-900 flex items-center justify-center gap-2"><Trash2 size={16}/>O'chirish</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LimitEditor({ t, onSave }) {
  const [lb, setLb] = useState(t.limit_buyurtma ?? '');
  const [lx, setLx] = useState(t.limit_xodim ?? '');
  const [bt, setBt] = useState('');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Buyurtma limiti"><input value={lb} onChange={e => setLb(e.target.value)} type="number" placeholder="∞" className={inputCls}/></Field>
        <Field label="Xodim limiti"><input value={lx} onChange={e => setLx(e.target.value)} type="number" placeholder="∞" className={inputCls}/></Field>
      </div>
      <Field label="Bot tokenni yangilash" hint="ixtiyoriy"><input value={bt} onChange={e => setBt(e.target.value)} placeholder="Yangi token..." className={inputCls}/></Field>
      <button
        onClick={() => onSave({
          limit_buyurtma: lb === '' ? null : Number(lb),
          limit_xodim:    lx === '' ? null : Number(lx),
          ...(bt ? { bot_token: bt } : {}),
        })}
        className="px-5 py-2.5 rounded-xl font-bold bg-gray-900 dark:bg-white text-white dark:text-black">
        Saqlash
      </button>
    </div>
  );
}

// ============================================================
// Xodimlar boshqaruvi (mijoz detalida)
// ============================================================
const ROL_RANG = {
  Admin:      'text-blue-600 dark:text-blue-400',
  Dostavchik: 'text-amber-600 dark:text-amber-400',
  Ishchi:     'text-gray-500 dark:text-gray-400',
};

function XodimlarManager({ tenantId, onChange }) {
  const { showToast } = useToast();
  const [list, setList] = useState(null);
  const [f, setF]       = useState({ ism: '', login: '', parol: '', rol: 'Ishchi' });
  const [yuk, setYuk]   = useState(false);
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));

  const load = useCallback(() => {
    superApi.get(`/tenants/${tenantId}/xodimlar`).then(setList).catch(() => setList([]));
  }, [tenantId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!f.login.trim() || !f.parol) { showToast('Login va parol kiriting', 'error'); return; }
    setYuk(true);
    try {
      await superApi.post(`/tenants/${tenantId}/xodimlar`, {
        ism:   f.ism.trim() || f.login.trim(),
        login: f.login.trim(),
        parol: f.parol,
        rol:   f.rol,
      });
      showToast('Xodim qo\'shildi', 'success');
      setF({ ism: '', login: '', parol: '', rol: 'Ishchi' });
      load();
      onChange?.();   // tenant kartochkasidagi "Xodimlar" sonini yangilaydi
    } catch (e) {
      showToast(e.message?.includes('band') ? 'Bu login band' : 'Xato: ' + e.message, 'error');
    } finally { setYuk(false); }
  };

  const del = async (x) => {
    if (!confirm(`"${x.ism || x.login}" xodimi o'chiriladi. Davom etasizmi?`)) return;
    try {
      await superApi.del(`/tenants/${tenantId}/xodimlar/${x.id}`);
      showToast('O\'chirildi', 'success');
      load();
      onChange?.();
    } catch (e) {
      showToast('Xato: ' + e.message, 'error');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <h3 className="font-bold mb-3 flex items-center gap-2"><Users size={16} /> Xodimlar</h3>

      {/* Mavjud xodimlar ro'yxati */}
      <div className="divide-y divide-gray-50 dark:divide-gray-900 mb-2">
        {list == null ? (
          <p className="text-gray-400 text-sm py-2">Yuklanmoqda...</p>
        ) : list.length === 0 ? (
          <p className="text-gray-400 text-sm py-2">Hali xodim yo'q.</p>
        ) : list.map(x => (
          <div key={x.id} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {x.ism || x.login}{x.telegram_bogli && <span title="Telegram bog'langan"> 🔗</span>}
              </p>
              <p className="text-xs text-gray-400">
                @{x.login} · <span className={ROL_RANG[x.rol] || ''}>{x.rol}</span>
              </p>
            </div>
            <button onClick={() => del(x)} title="O'chirish"
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950 p-2 rounded-lg shrink-0">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      {/* Yangi xodim qo'shish */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
        <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Yangi xodim qo'shish</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ism"><input value={f.ism} onChange={e => up('ism', e.target.value)} placeholder="Ism familiya" className={inputCls} /></Field>
          <Field label="Rol">
            <select value={f.rol} onChange={e => up('rol', e.target.value)} className={inputCls}>
              {ROLLAR.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Login"><input value={f.login} onChange={e => up('login', e.target.value)} placeholder="ishchi1" className={inputCls} /></Field>
          <Field label="Parol"><input value={f.parol} onChange={e => up('parol', e.target.value)} type="text" placeholder="••••" className={inputCls} /></Field>
        </div>
        <button onClick={add} disabled={yuk}
          className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 flex items-center gap-2">
          <Plus size={16} />{yuk ? 'Qo\'shilmoqda...' : 'Xodim qo\'shish'}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Root
// ============================================================
function SuperInner() {
  const { admin, loading, login, logout } = useSuperAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black text-gray-400">Yuklanmoqda...</div>;
  if (!admin)  return <SuperLogin onLogin={login} />;
  return (
    <Shell admin={admin} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/tenants/yangi" element={<TenantForm />} />
        <Route path="/tenants/:id" element={<TenantDetail />} />
      </Routes>
    </Shell>
  );
}

export default function SuperApp() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
          <SuperInner />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}
