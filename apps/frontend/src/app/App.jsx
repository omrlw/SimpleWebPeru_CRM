import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
    LayoutDashboard,
    Users,
    KanbanSquare,
    CheckSquare,
    MessageSquare,
    Settings,
    Plus,
    LogOut,
    Search,
    Filter,
    CalendarRange,
    DollarSign,
    ClipboardCheck,
    UserCheck,
    Users as UsersIcon,
    Loader2,
    X,
    Pencil,
    Trash2,
    RefreshCw,
    MessageCircle,
    ChevronLeft,
    ChevronRight,
    Menu,
    TrendingUp,
    UserPlus,
    ExternalLink,
    Clock,
    ListTodo,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const apiClient = axios.create({
    baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('crm_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'pipeline', label: 'Embudo de Ventas', icon: KanbanSquare },
    { id: 'tasks', label: 'Tareas', icon: CheckSquare },
    { id: 'communications', label: 'Comunicaciones', icon: MessageSquare },
    { id: 'settings', label: 'Configuración', icon: Settings },
];

const STAGE_ORDER = ['Entrante', 'Contactado', 'Negociación', 'Trato Ganado', 'Trato Perdido'];

const STAGE_CONFIG = {
    Entrante: { badge: 'bg-[#edf1ff] text-[#1d3fe0]', header: 'bg-[#f4f6ff]', value: 'text-[#1d3fe0]' },
    Contactado: { badge: 'bg-[#e9f1ff] text-[#275efe]', header: 'bg-[#f3f7ff]', value: 'text-[#275efe]' },
    Negociación: { badge: 'bg-[#fff4e5] text-[#b45309]', header: 'bg-[#fff8ed]', value: 'text-[#b45309]' },
    'Trato Ganado': { badge: 'bg-[#e8fbf2] text-[#047857]', header: 'bg-[#f2fcf7]', value: 'text-[#0f8a4b]' },
    'Trato Perdido': { badge: 'bg-[#fdecef] text-[#d92d55]', header: 'bg-[#fef4f6]', value: 'text-[#d92d55]' },
};

const STAGE_CHART_COLORS = {
    Entrante: 'from-[#dbeafe] via-[#bfdbfe] to-[#60a5fa]',
    Contactado: 'from-[#e0f2fe] via-[#bae6fd] to-[#3b82f6]',
    Negociación: 'from-[#fef3c7] via-[#fde68a] to-[#f97316]',
    'Trato Ganado': 'from-[#dcfce7] via-[#bbf7d0] to-[#22c55e]',
    'Trato Perdido': 'from-[#fee2e2] via-[#fecdd3] to-[#f43f5e]',
};

const TASK_STATUS_OPTIONS = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_progreso', label: 'En Progreso' },
    { value: 'completada', label: 'Completada' },
    { value: 'cerrada', label: 'Cerrada' },
];

const COMMUNICATION_CHANNELS = [
    { value: 'email', label: 'Email' },
    { value: 'llamada', label: 'Llamada' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'reunion', label: 'Reunión' },
];

const DATE_FILTERS = [
    { id: 'today', label: 'Hoy' },
    { id: 'yesterday', label: 'Ayer' },
    { id: 'week', label: 'Esta semana' },
    { id: 'month', label: 'Este mes' },
    { id: 'range', label: 'Rango' },
];

const DEFAULT_SUMMARY = {
    metrics: {
        projectedRevenue: 0,
        pendingTasks: 0,
        activeClients: 0,
        newClients: 0,
    },
    tasks: [],
    communications: [],
    funnel: STAGE_ORDER.map((stage) => ({ stage, value: 0 })),
    previousMetrics: null,
};

const DEFAULT_FILTER = {
    ...DATE_FILTERS[0],
    displayLabel: DATE_FILTERS[0].label,
    startDate: null,
    endDate: null,
};

const formatCurrency = (value) => {
    const number = Number(value) || 0;
    return number.toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const toDateTimeInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
};

const formatRangeLabel = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Rango';
    const formatter = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' });
    const start = formatter.format(new Date(startDate));
    const end = formatter.format(new Date(endDate));
    return `${start} - ${end}`;
};

const getInitials = (text) => {
    if (!text) return 'U';
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
};

const mapClientFromApi = (client) => ({
    id: client.id,
    firstName: client.first_name || '',
    lastName: client.last_name || '',
    company: client.company || '',
    ruc: client.ruc || '',
    email: client.email || '',
    phone: client.phone || '',
    tags: client.tags || [],
    createdAt: client.created_at,
});

const toClientPayload = (client) => ({
    firstName: client.firstName,
    lastName: client.lastName,
    company: client.company,
    ruc: client.ruc,
    email: client.email,
    phone: client.phone,
    tags: client.tags,
});

const mapDealFromApi = (deal) => {
    const normalizedStage = STAGE_ORDER.includes(deal.stage) ? deal.stage : STAGE_ORDER[0];
    return {
        id: deal.id,
        name: deal.name || '',
        notes: deal.notes || '',
        stage: normalizedStage,
        value: Number(deal.value) || 0,
        clientId: deal.contact_id || null,
        clientName: deal.contact_name || '',
        createdAt: deal.created_at,
    };
};

const toDealPayload = (deal) => ({
    name: deal.name,
    notes: deal.notes,
    stage: deal.stage,
    value: Number(deal.value) || 0,
    contactId: deal.clientId,
});

const mapTaskFromApi = (task) => ({
    id: task.id,
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'pendiente',
    dueDate: task.due_date,
    clientId: task.contact_id || null,
    dealId: task.lead_id || null,
    clientName: task.client_name || task.contact_name || '',
    createdAt: task.created_at,
});

const toTaskPayload = (task) => ({
    title: task.title,
    description: task.description,
    status: task.status,
    dueDate: task.dueDate,
    contactId: task.clientId,
    leadId: task.dealId,
});

const mapCommunicationFromApi = (communication) => ({
    id: communication.id,
    channel: communication.channel || 'email',
    subject: communication.subject || '',
    summary: communication.summary || '',
    communicationDate: communication.communication_date,
    clientId: communication.contact_id || null,
    clientName: communication.contact_name || '',
});

const toCommunicationPayload = (communication) => ({
    channel: communication.channel,
    subject: communication.subject,
    summary: communication.summary,
    communicationDate: communication.communicationDate,
    contactId: communication.clientId,
});

const createEmptyDealForm = () => ({
    name: '',
    notes: '',
    stage: STAGE_ORDER[0],
    value: '',
    clientId: null,
});

function AuthPage({ onAuthSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        setInfo('');
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        try {
            const { data } = await apiClient.post(endpoint, { email, password });
            if (isLogin) {
                const { accessToken } = data;
                onAuthSuccess(accessToken, email);
            } else {
                setIsLogin(true);
                setInfo('Registro exitoso. Ahora puedes iniciar sesión.');
            }
        } catch (err) {
            setError(err.response?.data?.error || `No se pudo ${isLogin ? 'iniciar sesión' : 'registrar'}.`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--swp-muted-bg)] px-4">
            <div className="w-full max-w-md rounded-2xl border border-[var(--swp-muted-border)] bg-white p-8 shadow-xl">
                <h1 className="text-center text-2xl font-bold text-[var(--swp-primary)]">SimpleWeb CRM</h1>
                <p className="mt-2 text-center text-sm text-[var(--swp-dark)] opacity-70">
                    {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta para empezar'}
                </p>
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div>
                        <label className="text-sm font-medium text-[var(--swp-dark)]">Correo electrónico</label>
                        <input
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-[var(--swp-dark)]">Contraseña</label>
                        <input
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-rose-600">{error}</p>}
                    {info && <p className="text-sm text-emerald-600">{info}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center rounded-lg bg-[var(--swp-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--swp-primary-hover)] disabled:cursor-not-allowed disabled:bg-[#93c5fd]"
                    >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : isLogin ? 'Entrar' : 'Crear cuenta'}
                    </button>
                </form>
                <p className="mt-5 text-center text-sm text-[var(--swp-dark)] opacity-70">
                    {isLogin ? '¿No tienes cuenta?' : '¿Ya estás registrado?'}{' '}
                    <button
                        className="font-semibold text-[var(--swp-primary)] hover:text-[var(--swp-primary-hover)]"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setInfo('');
                        }}
                    >
                        {isLogin ? 'Regístrate' : 'Inicia sesión'}
                    </button>
                </p>
            </div>
        </div>
    );
}

function Modal({ title, onClose, children, widthClass = 'max-w-2xl' }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`w-full ${widthClass} rounded-2xl bg-white shadow-2xl`}>
                <div className="flex items-center justify-between border-b border-[var(--swp-muted-border)] px-6 py-4">
                    <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
                    <button
                        className="rounded-full p-1 text-slate-500 hover:bg-[var(--swp-muted-card)] hover:text-slate-700"
                        onClick={onClose}
                        aria-label="Cerrar modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
            </div>
        </div>
    );
}

function Sidebar({ activePage, onSelect, onLogout, userEmail, clientsTotal }) {
    const displayName = userEmail ? userEmail.split('@')[0] : 'Usuario';
    const initials = getInitials(displayName);
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`hidden flex-shrink-0 flex-col border-r border-[var(--swp-muted-border)] bg-white transition-all duration-300 lg:flex ${
                collapsed ? 'w-20' : 'w-72'
            }`}
        >
            <div
                className={`flex items-center border-b border-[var(--swp-muted-border)] py-5 ${
                    collapsed ? 'justify-center px-3' : 'justify-between px-6'
                }`}
            >
                <div className={`flex items-center gap-3 ${collapsed ? '' : ''}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--swp-primary-soft)] text-sm font-bold uppercase text-[var(--swp-primary)]">
                        SW
                    </div>
                    {!collapsed && (
                        <div>
                            <p className="text-lg font-semibold text-[var(--swp-dark)]">SimpleWeb</p>
                            <p className="text-xs font-medium text-[var(--swp-dark)]/50">CRM • PYMEs</p>
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => setCollapsed((prev) => !prev)}
                    className="hidden rounded-full border border-[var(--swp-muted-border)] p-2 text-[var(--swp-dark)] transition hover:bg-[var(--swp-muted-card)] lg:inline-flex"
                    aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
                >
                    {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = activePage === item.id;
                        const baseClasses = collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5';
                        const activeClasses = collapsed
                            ? 'bg-[var(--swp-primary)] text-white'
                            : 'bg-[var(--swp-primary-soft)] text-[var(--swp-primary)] font-semibold border border-[var(--swp-primary)]/30';
                        const inactiveClasses = 'text-[var(--swp-dark)]/70 hover:bg-[var(--swp-muted-card)]';
                        return (
                            <button
                                key={item.id}
                                className={`group relative flex w-full items-center rounded-lg text-sm transition-colors ${baseClasses} ${
                                    isActive ? activeClasses : inactiveClasses
                                }`}
                                onClick={() => onSelect(item.id)}
                                title={collapsed ? item.label : undefined}
                            >
                                <Icon className="h-5 w-5" />
                                {!collapsed && <span>{item.label}</span>}
                            </button>
                        );
                    })}
                </div>
            </nav>
            <div className="border-t border-[var(--swp-muted-border)] px-4 py-5">
                <div className={`flex ${collapsed ? 'flex-col items-center gap-2' : 'items-center'}`}>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--swp-primary-soft)] text-sm font-semibold text-[var(--swp-primary)]">
                        {initials}
                    </div>
                    {!collapsed && (
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-[var(--swp-dark)] capitalize">{displayName}</p>
                            <p className="text-xs text-[var(--swp-dark)]/60">Clientes: {clientsTotal}</p>
                        </div>
                    )}
                </div>
                <button
                    className={`mt-4 flex w-full items-center justify-center rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm font-medium text-[var(--swp-dark)]/70 transition hover:bg-[var(--swp-muted-card)] ${
                        collapsed ? 'px-0' : ''
                    }`}
                    onClick={onLogout}
                    title={collapsed ? 'Cerrar sesión' : undefined}
                >
                    <LogOut className="h-4 w-4" />
                    {!collapsed && <span className="ml-2">Cerrar sesión</span>}
                </button>
            </div>
        </aside>
    );
}

function MobileNav({ activePage, onSelect, onLogout }) {
    const [open, setOpen] = useState(false);

    const handleSelect = (pageId) => {
        onSelect(pageId);
        setOpen(false);
    };

    const handleLogoutClick = () => {
        setOpen(false);
        onLogout();
    };

    return (
        <div className="lg:hidden">
            <div className="flex items-center justify-between border-b border-[var(--swp-muted-border)] bg-white px-4 py-4 shadow-sm">
                <button
                    type="button"
                    className="rounded-lg border border-[var(--swp-muted-border)] p-2 text-[var(--swp-dark)]/70 transition hover:bg-[var(--swp-muted-card)]"
                    onClick={() => setOpen((prev) => !prev)}
                    aria-label={open ? 'Cerrar navegación' : 'Abrir navegación'}
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <div className="text-base font-semibold text-[var(--swp-dark)]">SimpleWeb CRM</div>
                <button
                    type="button"
                    className="rounded-lg border border-[var(--swp-muted-border)] p-2 text-[var(--swp-dark)]/70 transition hover:bg-[var(--swp-muted-card)]"
                    onClick={handleLogoutClick}
                    aria-label="Cerrar sesión"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
            {open && (
                <div className="border-b border-[var(--swp-muted-border)] bg-white px-4 pb-4 shadow-sm">
                    <div className="grid gap-2 pt-4">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = activePage === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleSelect(item.id)}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                                        isActive
                                            ? 'bg-[var(--swp-primary-soft)] text-[var(--swp-primary)]'
                                            : 'text-[var(--swp-dark)]/70 hover:bg-[var(--swp-muted-card)]'
                                    }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricCard({ icon, title, value, helperText, helperIcon, helperClass = 'text-slate-500', helperActionLabel, onHelperAction }) {
    return (
        <div className="rounded-xl border border-[var(--swp-muted-border)] bg-white p-5">
            <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[var(--swp-primary-soft)] p-3 text-[var(--swp-primary)]">{icon}</div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--swp-dark)]/50">{title}</p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--swp-dark)]">{value}</p>
                </div>
            </div>
            {helperText && (
                <div className="mt-4 flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-2 font-medium ${helperClass}`}>
                        {helperIcon}
                        {helperText}
                    </span>
                    {helperActionLabel && onHelperAction && (
                        <button
                            type="button"
                            onClick={onHelperAction}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                            {helperActionLabel}
                            <ExternalLink className="h-3 w-3" />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function DateRangeModal({ initialStart, initialEnd, onApply, onCancel }) {
    const [startDate, setStartDate] = useState(initialStart || '');
    const [endDate, setEndDate] = useState(initialEnd || '');
    const [error, setError] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!startDate || !endDate) {
            setError('Debes seleccionar ambas fechas.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('La fecha inicial no puede ser posterior a la final.');
            return;
        }
        onApply({ startDate, endDate });
    };

    return (
        <Modal title="Selecciona un rango personalizado" onClose={onCancel} widthClass="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Desde</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(event) => setStartDate(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Hasta</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(event) => setEndDate(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                            required
                        />
                    </div>
                </div>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-[var(--swp-muted-border)] px-4 py-2 text-sm font-medium text-[var(--swp-dark)] opacity-80 hover:bg-[var(--swp-muted-card)]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--swp-primary-hover)]"
                    >
                        Aplicar rango
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function DashboardPage({
    summary,
    filter,
    dateFilters,
    onSelectFilter,
    onRequestRange,
    onCreateDeal,
    onRefresh,
    loadingSummary,
    onAddTask,
    onViewTasks,
    onViewNewClients,
}) {
    const metrics = summary?.metrics || DEFAULT_SUMMARY.metrics;
    const tasks = summary?.tasks ?? DEFAULT_SUMMARY.tasks;
    const communications = summary?.communications ?? DEFAULT_SUMMARY.communications;
    const funnelData = summary?.funnel?.length ? summary.funnel : DEFAULT_SUMMARY.funnel;
    const previousMetrics = summary?.previousMetrics;
    const filterLabel = filter.displayLabel || filter.label;

    const tasksDueToday = useMemo(() => {
        const today = new Date();
        return tasks.filter((task) => {
            if (!task.due_date) return false;
            const dueDate = new Date(task.due_date);
            if (Number.isNaN(dueDate.getTime())) return false;
            return (
                dueDate.getFullYear() === today.getFullYear() &&
                dueDate.getMonth() === today.getMonth() &&
                dueDate.getDate() === today.getDate()
            );
        }).length;
    }, [tasks]);

    const revenueChangePercent = useMemo(() => {
        const current = metrics.projectedRevenue || 0;
        const previous = previousMetrics?.projectedRevenue ?? null;
        if (previous === null) return null;
        if (previous === 0) return current === 0 ? 0 : 100;
        return ((current - previous) / previous) * 100;
    }, [metrics.projectedRevenue, previousMetrics]);

    const revenueHelperText =
        revenueChangePercent === null
            ? 'Sin histórico comparativo'
            : `${revenueChangePercent >= 0 ? '+' : ''}${revenueChangePercent.toFixed(1)}% vs periodo anterior`;
    const revenueHelperClass =
        revenueChangePercent === null ? 'text-slate-400' : revenueChangePercent >= 0 ? 'text-emerald-600' : 'text-rose-600';
    const tasksHelperText =
        tasksDueToday === 0 ? 'Sin vencimientos hoy' : `${tasksDueToday} vence${tasksDueToday === 1 ? '' : 'n'} hoy`;
    const tasksHelperClass = tasksDueToday === 0 ? 'text-slate-400' : 'text-amber-600';
    const normalizedFilterLabel = filterLabel ? filterLabel.toLowerCase() : '';
    const newClientsDescriptor = filter.id === 'month' ? 'este mes' : 'en el periodo';
    const activeHelperText =
        metrics.newClients > 0 ? `+${metrics.newClients} nuevos ${newClientsDescriptor}` : `Sin nuevos ${newClientsDescriptor}`;
    const activeHelperClass = metrics.newClients > 0 ? 'text-sky-600' : 'text-slate-400';
    const newClientsHelperText =
        filter.id === 'today' ? 'Nuevos clientes hoy' : `Nuevos clientes (${normalizedFilterLabel})`;
    const maxFunnelValue = useMemo(() => {
        if (!funnelData || funnelData.length === 0) return 1;
        return Math.max(...funnelData.map((item) => item.value), 1);
    }, [funnelData]);

    return (
        <div className="page-content space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Dashboard</h2>
                    <p className="text-sm text-slate-500">Sigue tus tratos y clientes en un solo lugar</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onRefresh}
                        className="flex items-center rounded-lg border border-[var(--swp-muted-border)] px-4 py-2 text-sm font-medium text-[var(--swp-dark)] opacity-80 hover:bg-[var(--swp-muted-card)]"
                    >
                        {loadingSummary ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        <span className="ml-2">Actualizar</span>
                    </button>
                    <button
                        onClick={onCreateDeal}
                        className="flex items-center rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:bg-[var(--swp-primary-hover)]"
                    >
                        <Plus className="mr-2 h-5 w-5" /> Nuevo trato
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="mr-2 font-medium text-slate-600">Mostrar datos de:</span>
                {dateFilters.map((item) => {
                    const isActive = filter.id === item.id;
                    if (item.id === 'range') {
                        return (
                            <button
                                key={item.id}
                                className={`flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                    isActive
                                        ? 'bg-[var(--swp-primary)] text-white shadow-sm'
                                        : 'border border-[var(--swp-muted-border)] text-slate-500 hover:bg-[var(--swp-muted-card)]'
                                }`}
                                onClick={onRequestRange}
                            >
                                <CalendarRange className="mr-2 h-4 w-4" />
                                {isActive ? filterLabel : item.label}
                            </button>
                        );
                    }
                    return (
                        <button
                            key={item.id}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isActive
                                    ? 'bg-[var(--swp-primary)] text-white shadow-sm'
                                    : 'border border-[var(--swp-muted-border)] text-slate-500 hover:bg-[var(--swp-muted-card)]'
                            }`}
                            onClick={() => onSelectFilter(item)}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                    icon={<DollarSign className="h-6 w-6 text-[var(--swp-primary)]" />}
                    title="Ingresos proyectados"
                    value={`S/ ${formatCurrency(metrics.projectedRevenue)}`}
                    helperText={revenueHelperText}
                    helperIcon={<TrendingUp className="h-3.5 w-3.5" />}
                    helperClass={revenueHelperClass}
                />
                <MetricCard
                    icon={<ClipboardCheck className="h-6 w-6 text-[var(--swp-primary-hover)]" />}
                    title="Tareas pendientes"
                    value={metrics.pendingTasks}
                    helperText={tasksHelperText}
                    helperIcon={<Clock className="h-3.5 w-3.5" />}
                    helperClass={tasksHelperClass}
                />
                <MetricCard
                    icon={<UserCheck className="h-6 w-6 text-[var(--swp-accent)]" />}
                    title="Clientes activos"
                    value={metrics.activeClients}
                    helperText={activeHelperText}
                    helperIcon={<UserPlus className="h-3.5 w-3.5" />}
                    helperClass={activeHelperClass}
                />
                <MetricCard
                    icon={<UsersIcon className="h-6 w-6 text-[var(--swp-primary)]" />}
                    title={`Nuevos clientes (${filterLabel})`}
                    value={metrics.newClients}
                    helperText={newClientsHelperText}
                    helperIcon={<UsersIcon className="h-3.5 w-3.5" />}
                    helperClass="text-indigo-600"
                    helperActionLabel="Ver detalles"
                    onHelperAction={onViewNewClients}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Agenda de tareas</h3>
                            <p className="text-sm text-slate-500">Mantén tus pendientes visibles y crea recordatorios.</p>
                        </div>
                        <button
                            type="button"
                            onClick={onAddTask}
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--swp-primary)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--swp-primary-hover)]"
                        >
                            <Plus className="h-4 w-4" /> Crear tarea
                        </button>
                    </div>
                    <div className="mt-5 space-y-4">
                        {tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--swp-muted-border)] bg-[var(--swp-muted-card)]/40 p-8 text-center">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--swp-primary)]/10 text-[var(--swp-primary)]">
                                    <ListTodo className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-slate-700">Mantente organizado</p>
                                    <p className="mt-1 text-sm text-slate-500">
                                        No tienes tareas pendientes para el periodo seleccionado.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            tasks.slice(0, 4).map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 shadow-sm"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--swp-primary)]" />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                                            {task.contact_name && <p className="text-xs text-slate-500">{task.contact_name}</p>}
                                            <p className="text-xs text-slate-400">
                                                {task.due_date ? formatDateTime(task.due_date) : 'Sin fecha definida'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onViewTasks}
                                        className="text-xs font-medium text-[var(--swp-primary)] hover:text-[var(--swp-primary-hover)]"
                                    >
                                        Ver
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={onViewTasks}
                            className="text-sm font-semibold text-[var(--swp-primary)] hover:text-[var(--swp-primary-hover)]"
                        >
                            Ver todas las tareas
                        </button>
                    </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-2">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">Embudo mensual</h3>
                            <p className="text-sm text-slate-500">Seguimiento de tratos por etapa durante el periodo seleccionado.</p>
                        </div>
                    </div>
                    <div className="mt-6 flex h-56 items-end gap-6">
                        {funnelData.map((item) => {
                            const value = item.value || 0;
                            const hasValue = value > 0;
                            const heightPercent = maxFunnelValue > 0 ? Math.max(hasValue ? (value / maxFunnelValue) * 100 : 8, 8) : 8;
                            const barClass = hasValue
                                ? `bg-gradient-to-br ${STAGE_CHART_COLORS[item.stage] || 'from-slate-200 to-slate-400'} shadow`
                                : 'bg-slate-200';
                            return (
                                <div key={item.stage} className="flex w-full flex-col items-center">
                                    <div className="flex h-48 w-full items-end justify-center">
                                        <div
                                            className={`w-full max-w-[72px] rounded-t-xl ${barClass}`}
                                            style={{ height: `${heightPercent}%` }}
                                        />
                                    </div>
                                    <span className="mt-3 text-sm font-semibold text-slate-700">{value}</span>
                                    <span className="text-xs text-slate-500">{item.stage}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Últimas comunicaciones</h3>
                </div>
                <div className="mt-4 space-y-4">
                    {communications.length === 0 && (
                        <p className="text-sm text-slate-500">Registra tus interacciones para hacer seguimiento oportuno.</p>
                    )}
                    {communications.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2">
                            <div className="rounded-full bg-[var(--swp-muted-card)] p-2 text-[var(--swp-primary)]">
                                <MessageCircle className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-700">
                                    {item.subject || 'Sin asunto'}{' '}
                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-500">
                                        {item.channel}
                                    </span>
                                </p>
                                {item.contact_name && <p className="text-xs text-slate-500">{item.contact_name}</p>}
                                <p className="text-xs text-slate-400">{formatDateTime(item.communication_date)}</p>
                                {item.summary && <p className="mt-1 text-xs text-slate-500">{item.summary}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ClientsPage({ clients, onAddClient, onEditClient, onDeleteClient, onSearch, searchValue, loading }) {
    return (
        <div className="page-content space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Clientes</h2>
                    <p className="text-sm text-slate-500">Administra tus cuentas y personas de contacto.</p>
                </div>
                <button
                    onClick={() => onAddClient()}
                    className="flex items-center gap-2 rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--swp-primary-hover)]"
                >
                    <Plus className="h-5 w-5" /> Agregar cliente
                </button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        className="w-full rounded-lg border border-[var(--swp-muted-border)] bg-white py-2 pl-10 pr-3 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        placeholder="Buscar por nombre, empresa o RUC..."
                        value={searchValue}
                        onChange={(event) => onSearch(event.target.value)}
                    />
                </div>
                <button className="flex items-center gap-2 rounded-lg border border-[var(--swp-muted-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--swp-dark)]/70 hover:bg-[var(--swp-muted-card)]">
                    <Filter className="h-4 w-4" /> Filtrar
                </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--swp-muted-border)] bg-white">
                <table className="min-w-full divide-y divide-[var(--swp-muted-border)] text-left text-sm">
                    <thead className="bg-[var(--swp-muted-card)] text-xs font-semibold uppercase tracking-wide text-[var(--swp-dark)]/60">
                        <tr>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Empresa / Razón Social</th>
                            <th className="px-6 py-3">Email y teléfono</th>
                            <th className="px-6 py-3">Etiquetas</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--swp-muted-border)] text-sm text-[var(--swp-dark)]/70">
                        {!loading && clients.length === 0 && (
                            <tr>
                                <td className="px-6 py-6 text-center text-slate-400" colSpan={5}>
                                    No se encontraron clientes.
                                </td>
                            </tr>
                        )}
                        {loading && (
                            <tr>
                                <td className="px-6 py-6 text-center text-slate-500" colSpan={5}>
                                    <Loader2 className="inline h-5 w-5 animate-spin text-[var(--swp-primary)]" /> Cargando clientes...
                                </td>
                            </tr>
                        )}
                        {clients.map((client) => (
                            <tr key={client.id}>
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--swp-muted-card)] text-sm font-semibold text-[var(--swp-primary)]">
                                            {getInitials(`${client.firstName} ${client.lastName}`)}
                                        </div>
                                        <div className="ml-3">
                                            <div className="font-semibold text-slate-800">
                                                {client.firstName} {client.lastName}
                                            </div>
                                            {client.email && <div className="text-xs text-slate-500">{client.email}</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-slate-700">{client.company || '—'}</div>
                                    {client.ruc && <div className="text-xs text-slate-400">RUC: {client.ruc}</div>}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm">{client.email || '—'}</div>
                                    <div className="text-xs text-slate-500">{client.phone || '—'}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {client.tags.length === 0 && <span className="text-xs text-slate-400">Sin etiquetas</span>}
                                        {client.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="inline-flex items-center rounded-full bg-[var(--swp-muted-card)] px-2 py-0.5 text-xs font-medium text-[var(--swp-primary)]"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="rounded-lg border border-[var(--swp-muted-border)] px-2 py-1 text-xs font-medium text-[var(--swp-dark)] opacity-70 hover:bg-[var(--swp-muted-card)]"
                                            onClick={() => onEditClient(client)}
                                        >
                                            <Pencil className="mr-1 inline h-4 w-4" /> Editar
                                        </button>
                                        <button
                                            className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                            onClick={() => onDeleteClient(client)}
                                        >
                                            <Trash2 className="mr-1 inline h-4 w-4" /> Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DealCard({ deal, onEdit, onDelete, onDragStart, onDragEnd }) {
    const config = STAGE_CONFIG[deal.stage] || STAGE_CONFIG[STAGE_ORDER[0]];
    return (
        <div
            className="k-card rounded-xl border border-[var(--swp-muted-border)] bg-white p-4"
            draggable
            onDragStart={(event) => onDragStart(event, deal.id)}
            onDragEnd={onDragEnd}
        >
            <div className="flex items-start justify-between">
                <div>
                    <h4 className="text-sm font-semibold text-[var(--swp-dark)]">{deal.name}</h4>
                    <p className="text-xs text-slate-500">
                        {deal.clientName ? `Cliente: ${deal.clientName}` : 'Cliente sin asignar'}
                    </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.badge}`}>{deal.stage}</span>
            </div>
            <div className="mt-3 space-y-2 text-xs text-slate-500">
                <p className={`text-sm font-semibold ${config.value}`}>S/ {formatCurrency(deal.value)}</p>
                {deal.notes && <p className="text-slate-500">Notas: {deal.notes}</p>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--swp-muted-border)] pt-3">
                <button className="text-xs font-medium text-[var(--swp-primary)] hover:text-[var(--swp-primary-hover)]" onClick={() => onEdit(deal)}>
                    Editar
                </button>
                <button className="text-xs font-medium text-rose-600 hover:text-rose-700" onClick={() => onDelete(deal)}>
                    Eliminar
                </button>
            </div>
        </div>
    );
}

function KanbanColumn({
    stage,
    deals,
    totals,
    onDrop,
    onDragOver,
    onDragLeave,
    onEditDeal,
    onDeleteDeal,
    onDragStart,
    onDragEnd,
    isHovered,
}) {
    const config = STAGE_CONFIG[stage] || STAGE_CONFIG[STAGE_ORDER[0]];
    return (
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`k-col flex w-80 flex-shrink-0 flex-col rounded-xl border border-[var(--swp-muted-border)] bg-white p-3 transition ${
                isHovered ? 'border-[var(--swp-primary)]' : ''
            }`}
        >
            <div className={`flex items-center justify-between rounded-lg border border-[var(--swp-muted-border)] px-2 py-2 ${config.header}`}>
                <h3 className="text-sm font-semibold text-[var(--swp-dark)]">
                    {stage} ({deals.length})
                </h3>
                <span className="text-xs font-semibold text-slate-500">S/ {formatCurrency(totals)}</span>
            </div>
            <div className="mt-3 space-y-3">
                {deals.map((deal) => (
                    <DealCard
                        key={deal.id}
                        deal={deal}
                        onEdit={onEditDeal}
                        onDelete={onDeleteDeal}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                    />
                ))}
                {deals.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[var(--swp-muted-border)] p-4 text-center text-xs text-slate-400">
                        Arrastra tratos aquí
                    </div>
                )}
            </div>
        </div>
    );
}

function PipelinePage({ deals, onCreateDeal, onEditDeal, onDeleteDeal, onMoveDeal }) {
    const [hoveredStage, setHoveredStage] = useState(null);

    const dealsByStage = useMemo(() => {
        return STAGE_ORDER.reduce((acc, stage) => {
            const stageDeals = deals.filter((deal) => deal.stage === stage);
            acc[stage] = {
                items: stageDeals,
                total: stageDeals.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
            };
            return acc;
        }, {});
    }, [deals]);

    const handleDragStart = (event, dealId) => {
        event.dataTransfer.setData('application/x-deal-id', String(dealId));
        event.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (event, stage) => {
        event.preventDefault();
        const dealId = Number(event.dataTransfer.getData('application/x-deal-id'));
        if (Number.isNaN(dealId)) return;
        setHoveredStage(null);
        onMoveDeal(dealId, stage);
    };

    return (
        <div className="page-content space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Embudo de ventas</h2>
                    <p className="text-sm text-slate-500">Arrastra los tratos entre etapas y mantén tu flujo actualizado.</p>
                </div>
                <button
                    onClick={() => onCreateDeal()}
                    className="flex items-center gap-2 rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--swp-primary-hover)]"
                >
                    <Plus className="h-5 w-5" /> Nuevo trato
                </button>
            </div>
            <div className="hide-scrollbar w-full overflow-x-auto pb-4">
                <div className="flex min-w-max gap-4">
                    {STAGE_ORDER.map((stage) => (
                        <KanbanColumn
                            key={stage}
                            stage={stage}
                            deals={dealsByStage[stage]?.items || []}
                            totals={dealsByStage[stage]?.total || 0}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setHoveredStage(stage);
                            }}
                            onDragLeave={() => {
                                setHoveredStage((current) => (current === stage ? null : current));
                            }}
                            onDrop={(event) => handleDrop(event, stage)}
                            onEditDeal={onEditDeal}
                            onDeleteDeal={onDeleteDeal}
                            onDragStart={handleDragStart}
                            onDragEnd={() => setHoveredStage(null)}
                            isHovered={hoveredStage === stage}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function TasksPage({ tasks, onAddTask, onEditTask, onDeleteTask, onStatusChange }) {
    const [statusFilter, setStatusFilter] = useState('todos');

    const filteredTasks = useMemo(() => {
        if (statusFilter === 'todos') return tasks;
        return tasks.filter((task) => task.status === statusFilter);
    }, [tasks, statusFilter]);

    return (
        <div className="page-content space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Tareas</h2>
                    <p className="text-sm text-slate-500">Gestiona los pendientes vinculados a tratos y clientes.</p>
                </div>
                <button
                    onClick={() => onAddTask()}
                    className="flex items-center gap-2 rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--swp-primary-hover)]"
                >
                    <Plus className="h-5 w-5" /> Nueva tarea
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setStatusFilter('todos')}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusFilter === 'todos'
                            ? 'border-transparent bg-[var(--swp-primary)] text-white'
                            : 'border-[var(--swp-muted-border)] text-[var(--swp-dark)]/60 hover:bg-[var(--swp-muted-card)]'
                    }`}
                >
                    Todas
                </button>
                {TASK_STATUS_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => setStatusFilter(option.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                            statusFilter === option.value
                                ? 'border-transparent bg-[var(--swp-primary)] text-white'
                                : 'border-[var(--swp-muted-border)] text-[var(--swp-dark)]/60 hover:bg-[var(--swp-muted-card)]'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--swp-muted-border)] bg-white">
                <table className="min-w-full divide-y divide-[var(--swp-muted-border)] text-left text-sm">
                    <thead className="bg-[var(--swp-muted-card)] text-xs font-semibold uppercase tracking-wide text-[var(--swp-dark)]/60">
                        <tr>
                            <th className="px-6 py-3">Tarea</th>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--swp-muted-border)] text-[var(--swp-dark)]/70">
                        {filteredTasks.length === 0 && (
                            <tr>
                                <td className="px-6 py-6 text-center text-sm text-slate-400" colSpan={5}>
                                    No hay tareas para mostrar.
                                </td>
                            </tr>
                        )}
                        {filteredTasks.map((task) => (
                            <tr key={task.id}>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                                    {task.description && <p className="text-xs text-slate-500">{task.description}</p>}
                                </td>
                                <td className="px-6 py-4 text-sm text-[var(--swp-dark)]/70">{task.clientName || '—'}</td>
                                <td className="px-6 py-4 text-sm text-[var(--swp-dark)]/70">
                                    {task.dueDate ? formatDateTime(task.dueDate) : 'Sin fecha'}
                                </td>
                                <td className="px-6 py-4">
                                    <select
                                        value={task.status}
                                        onChange={(event) => onStatusChange(task, event.target.value)}
                                        className="rounded-full border border-[var(--swp-muted-border)] bg-white px-3 py-1 text-xs font-medium text-[var(--swp-dark)]/70 focus:border-[var(--swp-primary)] focus:outline-none"
                                    >
                                        {TASK_STATUS_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="rounded-lg border border-[var(--swp-muted-border)] px-2 py-1 text-xs font-medium text-[var(--swp-dark)] opacity-70 hover:bg-[var(--swp-muted-card)]"
                                            onClick={() => onEditTask(task)}
                                        >
                                            <Pencil className="mr-1 inline h-4 w-4" /> Editar
                                        </button>
                                        <button
                                            className="rounded-lg border border-rose-200 px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                            onClick={() => onDeleteTask(task)}
                                        >
                                            <Trash2 className="mr-1 inline h-4 w-4" /> Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CommunicationsPage({ communications, onAddCommunication }) {
    return (
        <div className="page-content space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Comunicaciones</h2>
                    <p className="text-sm text-slate-500">Registra llamadas, correos y reuniones con tus clientes.</p>
                </div>
                <button
                    onClick={() => onAddCommunication()}
                    className="flex items-center gap-2 rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--swp-primary-hover)]"
                >
                    <Plus className="h-5 w-5" /> Registrar actividad
                </button>
            </div>

            <div className="space-y-4">
                {communications.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[var(--swp-muted-border)] bg-white p-6 text-center text-sm text-slate-400">
                        Aún no tienes comunicaciones registradas.
                    </div>
                )}
                {communications.map((item) => (
                    <div key={item.id} className="rounded-xl border border-[var(--swp-muted-border)] bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-800">{item.subject || 'Sin asunto'}</p>
                                <p className="text-xs text-slate-500">{item.clientName || 'Sin cliente asignado'}</p>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span className="rounded-full bg-slate-100 px-2 py-1 capitalize">{item.channel}</span>
                                <span>{formatDateTime(item.communicationDate)}</span>
                            </div>
                        </div>
                        {item.summary && <p className="mt-3 text-sm text-slate-600">{item.summary}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}

function SettingsPage() {
    return (
        <div className="page-content space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-800">Configuración</h2>
                <p className="text-sm text-slate-500">Personaliza tu CRM según tu proceso comercial.</p>
            </div>
            <div className="space-y-4">
                <div className="rounded-xl border border-[var(--swp-muted-border)] bg-white p-6">
                    <h3 className="text-lg font-semibold text-slate-800">Preferencias generales</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Define tus etapas del embudo, etiquetas clave y automatizaciones básicas.
                    </p>
                </div>
                <div className="rounded-xl border border-[var(--swp-muted-border)] bg-white p-6">
                    <h3 className="text-lg font-semibold text-slate-800">Integraciones</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Conecta tu CRM con WhatsApp Business, Gmail o tu calendario favorito.
                    </p>
                </div>
            </div>
        </div>
    );
}

function ClientModal({ client, onSubmit, onClose }) {
    const isEdit = Boolean(client?.id);
    const [form, setForm] = useState(
        client || {
            firstName: '',
            lastName: '',
            company: '',
            ruc: '',
            email: '',
            phone: '',
            tags: [],
        }
    );
    const [tagsInput, setTagsInput] = useState((client?.tags || []).join(', '));

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit({
            ...form,
            tags: tagsInput
                .split(',')
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0),
        });
    };

    return (
        <Modal title={isEdit ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Nombres</label>
                        <input
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Apellidos</label>
                        <input
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Empresa / Razón social</label>
                    <input
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">RUC</label>
                        <input
                            name="ruc"
                            value={form.ruc}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Teléfono</label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Etiquetas (separadas por coma)</label>
                    <input
                        value={tagsInput}
                        onChange={(event) => setTagsInput(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-[var(--swp-muted-border)] px-4 py-2 text-sm font-medium text-[var(--swp-dark)] opacity-80 hover:bg-[var(--swp-muted-card)]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--swp-primary-hover)]"
                    >
                        {isEdit ? 'Guardar cambios' : 'Guardar cliente'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function DealModal({ deal, clients, onSubmit, onClose, onRequestCreateClient }) {
    const CREATE_NEW_CLIENT_OPTION = '__create_new_client__';
    const isEdit = Boolean(deal?.id);
    const [form, setForm] = useState(deal || createEmptyDealForm());
    const [needsClient, setNeedsClient] = useState(false);

    useEffect(() => {
        if (deal) {
            setForm({
                name: deal.name || '',
                notes: deal.notes || '',
                stage: deal.stage || STAGE_ORDER[0],
                value: deal.value !== null && deal.value !== undefined && deal.value !== '' ? String(deal.value) : '',
                clientId: deal.clientId || null,
            });
        } else {
            setForm(createEmptyDealForm());
        }
        setNeedsClient(false);
    }, [deal]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        if (name === 'value') {
            setForm((prev) => ({ ...prev, value }));
            return;
        }
        if (name === 'clientId') {
            if (value === CREATE_NEW_CLIENT_OPTION) {
                onRequestCreateClient?.(form);
                return;
            }
            setForm((prev) => ({ ...prev, clientId: value ? Number(value) : null }));
            setNeedsClient(false);
            return;
        }
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!form.clientId) {
            setNeedsClient(true);
            return;
        }
        onSubmit(form);
    };

    return (
        <Modal title={isEdit ? 'Editar trato' : 'Nuevo trato'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Nombre del trato</label>
                    <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Etapa del proceso</label>
                        <select
                            name="stage"
                            value={form.stage}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        >
                            {STAGE_ORDER.map((stage) => (
                                <option key={stage} value={stage}>
                                    {stage}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Valor estimado (S/)</label>
                        <input
                            type="number"
                            min="0"
                            name="value"
                            value={form.value}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Cliente relacionado</label>
                    <select
                        name="clientId"
                        value={form.clientId != null ? String(form.clientId) : ''}
                        onChange={handleChange}
                        required
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    >
                        <option value="">Selecciona un cliente</option>
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                                {client.firstName} {client.lastName}
                            </option>
                        ))}
                        <option value={CREATE_NEW_CLIENT_OPTION}>+ Crear cliente nuevo</option>
                    </select>
                    {clients.length === 0 && (
                        <div className="mt-2 rounded-lg border border-[var(--swp-muted-border)] bg-[var(--swp-muted-card)] px-3 py-3 text-xs font-medium text-[var(--swp-primary)]">
                            <p>Registra tu primer cliente para asignarlo al trato.</p>
                            <button
                                type="button"
                                onClick={() => onRequestCreateClient?.(form)}
                                className="mt-2 inline-flex items-center rounded-full bg-[var(--swp-primary)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--swp-primary-hover)]"
                            >
                                + Crear cliente desde aquí
                            </button>
                        </div>
                    )}
                    {needsClient && clients.length > 0 && (
                        <div className="mt-2 flex items-start gap-3 rounded-lg border border-[var(--swp-muted-border)] bg-[var(--swp-muted-card)] px-3 py-3 text-xs font-medium text-[var(--swp-primary)]">
                            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-[var(--swp-primary)]" aria-hidden="true" />
                            <div className="space-y-2">
                                <p>Selecciona un cliente existente o crea uno nuevo para continuar.</p>
                                <button
                                    type="button"
                                    onClick={() => onRequestCreateClient?.(form)}
                                    className="inline-flex items-center rounded-full border border-[var(--swp-primary)] px-3 py-1 text-[var(--swp-primary)] hover:bg-[var(--swp-primary)] hover:text-white"
                                >
                                    + Crear cliente sin salir
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Notas</label>
                    <textarea
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-[var(--swp-muted-border)] px-4 py-2 text-sm font-medium text-[var(--swp-dark)] opacity-80 hover:bg-[var(--swp-muted-card)]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--swp-primary-hover)]"
                    >
                        {isEdit ? 'Guardar cambios' : 'Crear trato'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function TaskModal({ task, clients, deals, onSubmit, onClose }) {
    const isEdit = Boolean(task?.id);
    const [form, setForm] = useState(
        task || {
            title: '',
            description: '',
            status: 'pendiente',
            dueDate: '',
            clientId: null,
            dealId: null,
        }
    );

    const handleChange = (event) => {
        const { name, value } = event.target;
        if (name === 'clientId' || name === 'dealId') {
            setForm((prev) => ({ ...prev, [name]: value ? Number(value) : null }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit(form);
    };

    return (
        <Modal title={isEdit ? 'Editar tarea' : 'Nueva tarea'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Título</label>
                    <input
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        required
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Descripción</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={3}
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Estado</label>
                        <select
                            name="status"
                            value={form.status}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        >
                            {TASK_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Fecha y hora</label>
                        <input
                            type="datetime-local"
                            name="dueDate"
                            value={toDateTimeInputValue(form.dueDate)}
                            onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Cliente</label>
                        <select
                            name="clientId"
                            value={form.clientId || ''}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        >
                            <option value="">Sin cliente</option>
                            {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                    {client.firstName} {client.lastName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Trato</label>
                        <select
                            name="dealId"
                            value={form.dealId || ''}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        >
                            <option value="">Sin trato</option>
                            {deals.map((deal) => (
                                <option key={deal.id} value={deal.id}>
                                    {deal.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-[var(--swp-muted-border)] px-4 py-2 text-sm font-medium text-[var(--swp-dark)] opacity-80 hover:bg-[var(--swp-muted-card)]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--swp-primary-hover)]"
                    >
                        {isEdit ? 'Guardar cambios' : 'Crear tarea'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function CommunicationModal({ communication, clients, onSubmit, onClose }) {
    const isEdit = Boolean(communication?.id);
    const [form, setForm] = useState(
        communication || {
            channel: 'email',
            subject: '',
            summary: '',
            communicationDate: new Date().toISOString().slice(0, 16),
            clientId: null,
        }
    );

    const handleChange = (event) => {
        const { name, value } = event.target;
        if (name === 'clientId') {
            setForm((prev) => ({ ...prev, [name]: value ? Number(value) : null }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        onSubmit(form);
    };

    return (
        <Modal title={isEdit ? 'Editar comunicación' : 'Nueva comunicación'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Canal</label>
                        <select
                            name="channel"
                            value={form.channel}
                            onChange={handleChange}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        >
                            {COMMUNICATION_CHANNELS.map((channel) => (
                                <option key={channel.value} value={channel.value}>
                                    {channel.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-semibold uppercase text-slate-500">Fecha y hora</label>
                        <input
                            type="datetime-local"
                            name="communicationDate"
                            value={toDateTimeInputValue(form.communicationDate)}
                            onChange={(event) => setForm((prev) => ({ ...prev, communicationDate: event.target.value }))}
                            className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Cliente</label>
                    <select
                        name="clientId"
                        value={form.clientId || ''}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    >
                        <option value="">Sin cliente</option>
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                                {client.firstName} {client.lastName}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Asunto</label>
                    <input
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold uppercase text-slate-500">Resumen</label>
                    <textarea
                        name="summary"
                        value={form.summary}
                        onChange={handleChange}
                        rows={4}
                        className="mt-1 w-full rounded-lg border border-[var(--swp-muted-border)] px-3 py-2 text-sm focus:border-[var(--swp-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--swp-muted-card)]"
                    />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-[var(--swp-muted-border)] px-4 py-2 text-sm font-medium text-[var(--swp-dark)] opacity-80 hover:bg-[var(--swp-muted-card)]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-[var(--swp-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--swp-primary-hover)]"
                    >
                        {isEdit ? 'Guardar cambios' : 'Registrar comunicación'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function App() {
    const [token, setToken] = useState(localStorage.getItem('crm_token'));
    const [userEmail, setUserEmail] = useState(localStorage.getItem('crm_user_email') || '');
    const [activePage, setActivePage] = useState('dashboard');
    const [summaryFilter, setSummaryFilter] = useState(DEFAULT_FILTER);
    const [summary, setSummary] = useState(DEFAULT_SUMMARY);
    const [clients, setClients] = useState([]);
    const [deals, setDeals] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [communications, setCommunications] = useState([]);
    const [loadingMap, setLoadingMap] = useState({
        summary: false,
        clients: false,
        deals: false,
        tasks: false,
        communications: false,
    });
    const [globalError, setGlobalError] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [modalState, setModalState] = useState({ type: null, data: null });
    const [pendingAction, setPendingAction] = useState(null);

    const handleAuthSuccess = (tokenValue, emailValue) => {
        localStorage.setItem('crm_token', tokenValue);
        localStorage.setItem('crm_user_email', emailValue);
        setToken(tokenValue);
        setUserEmail(emailValue);
    };

    const handleLogout = useCallback(() => {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user_email');
        setToken(null);
        setUserEmail('');
        setActivePage('dashboard');
    }, []);

    const processApiError = useCallback(
        (error, fallbackMessage) => {
            console.error(fallbackMessage, error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                handleLogout();
            } else {
                setGlobalError(error.response?.data?.error || fallbackMessage);
            }
        },
        [handleLogout]
    );

    useEffect(() => {
        if (!globalError) return;
        const timeout = setTimeout(() => setGlobalError(''), 4000);
        return () => clearTimeout(timeout);
    }, [globalError]);

    const fetchSummary = useCallback(
        async (filterOverride) => {
            const effectiveFilter = filterOverride || summaryFilter || DEFAULT_FILTER;
            setLoadingMap((prev) => ({ ...prev, summary: true }));
            try {
                const params = { period: effectiveFilter.id };
                if (effectiveFilter.id === 'range') {
                    params.startDate = effectiveFilter.startDate;
                    params.endDate = effectiveFilter.endDate;
                }
                const { data } = await apiClient.get('/summary', { params });
                const rawFunnel = Array.isArray(data.funnel) ? data.funnel : [];
                const normalizedFunnel = STAGE_ORDER.map((stage) => {
                    const entry = rawFunnel.find((item) => item.stage === stage);
                    return {
                        stage,
                        value: entry?.value ?? 0,
                    };
                });

                setSummary({
                    metrics: {
                        projectedRevenue: data.metrics?.projectedRevenue ?? 0,
                        pendingTasks: data.metrics?.pendingTasks ?? 0,
                        activeClients: data.metrics?.activeClients ?? 0,
                        newClients: data.metrics?.newClients ?? 0,
                    },
                    tasks: data.tasks || [],
                    communications: data.communications || [],
                    previousMetrics: data.previousMetrics || null,
                    funnel: normalizedFunnel,
                });
            } catch (error) {
                processApiError(error, 'No se pudo cargar el dashboard.');
            } finally {
                setLoadingMap((prev) => ({ ...prev, summary: false }));
            }
        },
        [processApiError, summaryFilter]
    );

    const fetchClients = useCallback(
        async (searchValue = '') => {
            setLoadingMap((prev) => ({ ...prev, clients: true }));
            try {
                const response = await apiClient.get('/contacts', searchValue ? { params: { search: searchValue } } : undefined);
                setClients(response.data.map(mapClientFromApi));
                setClientSearch(searchValue);
            } catch (error) {
                processApiError(error, 'No se pudieron cargar los clientes.');
            } finally {
                setLoadingMap((prev) => ({ ...prev, clients: false }));
            }
        },
        [processApiError]
    );

    const fetchDeals = useCallback(async () => {
        setLoadingMap((prev) => ({ ...prev, deals: true }));
        try {
            const { data } = await apiClient.get('/leads');
            setDeals(data.map(mapDealFromApi));
        } catch (error) {
            processApiError(error, 'No se pudieron cargar los tratos.');
        } finally {
            setLoadingMap((prev) => ({ ...prev, deals: false }));
        }
    }, [processApiError]);

    const fetchTasks = useCallback(async () => {
        setLoadingMap((prev) => ({ ...prev, tasks: true }));
        try {
            const { data } = await apiClient.get('/tasks');
            setTasks(data.map(mapTaskFromApi));
        } catch (error) {
            processApiError(error, 'No se pudieron cargar las tareas.');
        } finally {
            setLoadingMap((prev) => ({ ...prev, tasks: false }));
        }
    }, [processApiError]);

    const fetchCommunications = useCallback(async () => {
        setLoadingMap((prev) => ({ ...prev, communications: true }));
        try {
            const { data } = await apiClient.get('/communications');
            setCommunications(data.map(mapCommunicationFromApi));
        } catch (error) {
            processApiError(error, 'No se pudieron cargar las comunicaciones.');
        } finally {
            setLoadingMap((prev) => ({ ...prev, communications: false }));
        }
    }, [processApiError]);

    useEffect(() => {
        if (!token) return;
        fetchClients(clientSearch);
        fetchDeals();
        fetchTasks();
        fetchCommunications();
    }, [token, fetchClients, fetchDeals, fetchTasks, fetchCommunications, clientSearch]);

    useEffect(() => {
        if (token) {
            fetchSummary(summaryFilter);
        }
    }, [token, summaryFilter, fetchSummary]);

    const closeModal = () => setModalState({ type: null, data: null });

    const handleRequestCreateClientFromDeal = (draft) => {
        setPendingAction({ type: 'createDeal', draft: { ...createEmptyDealForm(), ...draft } });
        setModalState({ type: 'client', data: null });
    };

    const handleSaveClient = async (client) => {
        try {
            let savedClient;
            if (client.id) {
                const { data } = await apiClient.put(`/contacts/${client.id}`, toClientPayload(client));
                savedClient = mapClientFromApi(data);
            } else {
                const { data } = await apiClient.post('/contacts', toClientPayload(client));
                savedClient = mapClientFromApi(data);
            }
            await fetchClients(clientSearch);
            if (pendingAction?.type === 'createDeal') {
                const draft = pendingAction.draft ? { ...pendingAction.draft } : createEmptyDealForm();
                setPendingAction(null);
                setModalState({
                    type: 'deal',
                    data: {
                        ...draft,
                        clientId: savedClient.id,
                    },
                });
            } else {
                closeModal();
            }
            await fetchDeals();
        } catch (error) {
            processApiError(error, 'No se pudo guardar el cliente.');
        }
    };

    const handleCancelClientModal = () => {
        if (pendingAction?.type === 'createDeal') {
            const draft = pendingAction.draft ? { ...pendingAction.draft } : createEmptyDealForm();
            setPendingAction(null);
            setModalState({ type: 'deal', data: draft });
        } else {
            closeModal();
        }
    };

    const handleDeleteClient = async (client) => {
        if (!window.confirm(`¿Eliminar el cliente ${client.firstName}?`)) return;
        try {
            await apiClient.delete(`/contacts/${client.id}`);
            await fetchClients(clientSearch);
            await fetchDeals();
        } catch (error) {
            processApiError(error, 'No se pudo eliminar el cliente.');
        }
    };

    const handleSaveDeal = async (deal) => {
        try {
            if (deal.id) {
                await apiClient.put(`/leads/${deal.id}`, toDealPayload(deal));
            } else {
                await apiClient.post('/leads', toDealPayload(deal));
            }
            closeModal();
            await fetchDeals();
            await fetchSummary(summaryFilter);
        } catch (error) {
            processApiError(error, 'No se pudo guardar el trato.');
        }
    };

    const handleDeleteDeal = async (deal) => {
        if (!window.confirm(`¿Eliminar el trato ${deal.name}?`)) return;
        try {
            await apiClient.delete(`/leads/${deal.id}`);
            await fetchDeals();
            await fetchSummary(summaryFilter);
        } catch (error) {
            processApiError(error, 'No se pudo eliminar el trato.');
        }
    };

    const handleMoveDeal = async (dealId, newStage) => {
        const originalDeal = deals.find((deal) => deal.id === dealId);
        if (!originalDeal || originalDeal.stage === newStage) return;
        setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage: newStage } : deal)));
        try {
            await apiClient.put(`/leads/${dealId}`, toDealPayload({ ...originalDeal, stage: newStage }));
            await fetchSummary(summaryFilter);
        } catch (error) {
            setDeals((prev) => prev.map((deal) => (deal.id === dealId ? originalDeal : deal)));
            processApiError(error, 'No se pudo mover el trato.');
        }
    };

    const handleSaveTask = async (task) => {
        try {
            if (task.id) {
                await apiClient.put(`/tasks/${task.id}`, toTaskPayload(task));
            } else {
                await apiClient.post('/tasks', toTaskPayload(task));
            }
            closeModal();
            await fetchTasks();
            await fetchSummary(summaryFilter);
        } catch (error) {
            processApiError(error, 'No se pudo guardar la tarea.');
        }
    };

    const handleDeleteTask = async (task) => {
        if (!window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
        try {
            await apiClient.delete(`/tasks/${task.id}`);
            await fetchTasks();
            await fetchSummary(summaryFilter);
        } catch (error) {
            processApiError(error, 'No se pudo eliminar la tarea.');
        }
    };

    const handleUpdateTaskStatus = async (task, status) => {
        try {
            await apiClient.put(`/tasks/${task.id}`, toTaskPayload({ ...task, status }));
            await fetchTasks();
            await fetchSummary(summaryFilter);
        } catch (error) {
            processApiError(error, 'No se pudo actualizar la tarea.');
        }
    };

    const handleSaveCommunication = async (communication) => {
        try {
            if (communication.id) {
                await apiClient.put(`/communications/${communication.id}`, toCommunicationPayload(communication));
            } else {
                await apiClient.post('/communications', toCommunicationPayload(communication));
            }
            closeModal();
            await fetchCommunications();
            await fetchSummary(summaryFilter);
        } catch (error) {
            processApiError(error, 'No se pudo guardar la comunicación.');
        }
    };

    const handleSelectFilter = (filter) => {
        setSummaryFilter({
            id: filter.id,
            label: filter.label,
            displayLabel: filter.label,
            startDate: null,
            endDate: null,
        });
    };

    const handleApplyRangeFilter = ({ startDate, endDate }) => {
        setSummaryFilter({
            id: 'range',
            label: 'Rango',
            displayLabel: formatRangeLabel(startDate, endDate),
            startDate,
            endDate,
        });
        closeModal();
    };

    const requestNewDeal = () => {
        const draft = createEmptyDealForm();
        if (clients.length === 0) {
            setPendingAction({ type: 'createDeal', draft });
        } else {
            setPendingAction(null);
        }
        setModalState({ type: 'deal', data: draft });
    };

    const renderPage = () => {
        switch (activePage) {
            case 'dashboard':
                return (
                    <DashboardPage
                        summary={summary}
                        filter={summaryFilter}
                        dateFilters={DATE_FILTERS}
                        onSelectFilter={handleSelectFilter}
                        onRequestRange={() =>
                            setModalState({ type: 'dateRange', data: { startDate: summaryFilter.startDate, endDate: summaryFilter.endDate } })
                        }
                        onCreateDeal={requestNewDeal}
                        onRefresh={() => fetchSummary(summaryFilter)}
                        loadingSummary={loadingMap.summary}
                        onAddTask={() => setModalState({ type: 'task', data: null })}
                        onViewTasks={() => setActivePage('tasks')}
                        onViewNewClients={() => setActivePage('clients')}
                    />
                );
            case 'clients':
                return (
                    <ClientsPage
                        clients={clients}
                        onAddClient={() => setModalState({ type: 'client', data: null })}
                        onEditClient={(client) => setModalState({ type: 'client', data: client })}
                        onDeleteClient={handleDeleteClient}
                        onSearch={(value) => fetchClients(value)}
                        searchValue={clientSearch}
                        loading={loadingMap.clients}
                    />
                );
            case 'pipeline':
                return (
                    <PipelinePage
                        deals={deals}
                        onCreateDeal={requestNewDeal}
                        onEditDeal={(deal) => setModalState({ type: 'deal', data: deal })}
                        onDeleteDeal={handleDeleteDeal}
                        onMoveDeal={handleMoveDeal}
                    />
                );
            case 'tasks':
                return (
                    <TasksPage
                        tasks={tasks}
                        onAddTask={() => setModalState({ type: 'task', data: null })}
                        onEditTask={(task) => setModalState({ type: 'task', data: task })}
                        onDeleteTask={handleDeleteTask}
                        onStatusChange={handleUpdateTaskStatus}
                    />
                );
            case 'communications':
                return (
                    <CommunicationsPage
                        communications={communications}
                        onAddCommunication={() => setModalState({ type: 'communication', data: null })}
                    />
                );
            case 'settings':
                return <SettingsPage />;
            default:
                return null;
        }
    };

    if (!token) {
        return <AuthPage onAuthSuccess={handleAuthSuccess} />;
    }

    return (
        <div className="flex h-screen bg-[var(--swp-muted-bg)] text-[var(--swp-dark)]">
            <Sidebar
                activePage={activePage}
                onSelect={setActivePage}
                onLogout={handleLogout}
                userEmail={userEmail}
                clientsTotal={clients.length}
            />
            <div className="flex flex-1 flex-col overflow-hidden">
                <MobileNav activePage={activePage} onSelect={setActivePage} onLogout={handleLogout} />
                <main className="flex-1 overflow-y-auto">
                    <div className="w-full px-5 py-6 sm:px-6 lg:px-12">
                        {globalError && (
                            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                                {globalError}
                            </div>
                        )}
                        {renderPage()}
                    </div>
                </main>
            </div>
            {modalState.type === 'client' && (
                <ClientModal client={modalState.data} onSubmit={handleSaveClient} onClose={handleCancelClientModal} />
            )}
            {modalState.type === 'deal' && (
                <DealModal
                    deal={modalState.data}
                    clients={clients}
                    onSubmit={handleSaveDeal}
                    onClose={closeModal}
                    onRequestCreateClient={handleRequestCreateClientFromDeal}
                />
            )}
            {modalState.type === 'task' && (
                <TaskModal task={modalState.data} clients={clients} deals={deals} onSubmit={handleSaveTask} onClose={closeModal} />
            )}
            {modalState.type === 'communication' && (
                <CommunicationModal communication={modalState.data} clients={clients} onSubmit={handleSaveCommunication} onClose={closeModal} />
            )}
            {modalState.type === 'dateRange' && (
                <DateRangeModal
                    initialStart={modalState.data?.startDate}
                    initialEnd={modalState.data?.endDate}
                    onApply={handleApplyRangeFilter}
                    onCancel={closeModal}
                />
            )}
        </div>
    );
}

export default App;
