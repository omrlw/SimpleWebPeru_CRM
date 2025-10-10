import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit, LogOut, LoaderCircle } from 'lucide-react';

// --- CONFIGURACIÓN DE LA API ---
const API_URL = 'http://localhost:5001/api';

const apiClient = axios.create({
    baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('crm_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// --- COMPONENTES ---

// 1. Componente de Autenticación (Login y Registro)
function AuthPage({ setToken }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const endpoint = isLogin ? '/auth/login' : '/auth/register';
        try {
            const response = await apiClient.post(endpoint, { email, password });
            if (isLogin) {
                const { accessToken } = response.data;
                localStorage.setItem('crm_token', accessToken);
                setToken(accessToken);
            } else {
                // Después de registrar, cambiar a la vista de login
                setIsLogin(true);
                alert('Registro exitoso. Ahora puedes iniciar sesión.');
            }
        } catch (err) {
            setError(err.response?.data?.error || `Error al ${isLogin ? 'iniciar sesión' : 'registrarse'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-center text-gray-800">{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-gray-700">Contraseña</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
                         {loading ? <LoaderCircle className="animate-spin" /> : (isLogin ? 'Entrar' : 'Crear Cuenta')}
                    </button>
                </form>
                <p className="text-sm text-center text-gray-600">
                    {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="ml-1 font-medium text-indigo-600 hover:text-indigo-500">
                        {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                    </button>
                </p>
            </div>
        </div>
    );
}


// 2. Modal para Crear/Editar Leads
function LeadModal({ lead, onSave, onCancel, onDelete }) {
    const [formData, setFormData] = useState(lead || { name: '', email: '', phone: '', notes: '', stage: 'Nuevos Leads' });
    const isNew = !lead?.id;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-lg p-6 bg-white rounded-lg shadow-xl">
                <h3 className="mb-4 text-xl font-semibold">{isNew ? 'Crear Nuevo Lead' : 'Editar Lead'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre del Lead" required className="p-2 border rounded" />
                        <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="p-2 border rounded" />
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Teléfono" className="p-2 border rounded" />
                        <select name="stage" value={formData.stage} onChange={handleChange} className="p-2 border rounded">
                             {STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                    </div>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notas..." className="w-full p-2 mt-4 border rounded" rows="4"></textarea>
                    <div className="flex items-center justify-end mt-4 space-x-3">
                         {!isNew && (
                            <button type="button" onClick={() => onDelete(lead.id)} className="p-2 text-red-500 rounded hover:bg-red-100">
                                <Trash2 size={20} />
                            </button>
                        )}
                        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancelar</button>
                        <button type="submit" className="px-4 py-2 text-white bg-indigo-600 rounded hover:bg-indigo-700">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// 3. Tarjeta de Lead
function LeadCard({ lead, onClick }) {
    const onDragStart = (e) => {
        e.dataTransfer.setData('leadId', lead.id);
    };

    return (
        <div draggable onDragStart={onDragStart} onClick={() => onClick(lead)} className="p-3 mb-3 bg-white border-l-4 border-indigo-500 rounded-md shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-gray-800">{lead.name}</h4>
            <p className="text-sm text-gray-500">{lead.email}</p>
        </div>
    );
}

// 4. Columna del Kanban
function KanbanColumn({ stage, leads, onDrop, onCardClick }) {
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        onDrop(leadId, stage);
    };

    return (
        <div onDragOver={handleDragOver} onDrop={handleDrop} className="flex-1 min-w-[280px] p-3 bg-gray-100 rounded-lg">
            <h3 className="mb-4 font-semibold text-gray-700">{stage} ({leads.length})</h3>
            <div className="h-full space-y-2">
                {leads.map(lead => <LeadCard key={lead.id} lead={lead} onClick={onCardClick} />)}
            </div>
        </div>
    );
}


// --- APLICACIÓN PRINCIPAL ---
const STAGES = [
    'Nuevos Leads',
    'Brief Recibido',
    'Propuesta Enviada',
    'Contrato y Pago',
    'En Desarrollo',
    'Lanzado',
    'Soporte'
];

function App() {
    const [token, setToken] = useState(localStorage.getItem('crm_token'));
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingLead, setEditingLead] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchLeads = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const response = await apiClient.get('/leads');
            setLeads(response.data);
        } catch (err) {
            setError('No se pudieron cargar los leads.');
            if (err.response?.status === 403) {
                 handleLogout();
            }
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const handleLogout = () => {
        localStorage.removeItem('crm_token');
        setToken(null);
        setLeads([]);
    };

    const handleOpenModal = (lead = null) => {
        setEditingLead(lead);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingLead(null);
    };

    const handleSaveLead = async (leadData) => {
        try {
            if (leadData.id) { // Actualizar
                const response = await apiClient.put(`/leads/${leadData.id}`, leadData);
                setLeads(leads.map(l => l.id === leadData.id ? response.data : l));
            } else { // Crear
                const response = await apiClient.post('/leads', leadData);
                setLeads([...leads, response.data]);
            }
            handleCloseModal();
        } catch (err) {
            console.error("Error guardando lead:", err);
            alert("Error al guardar el lead.");
        }
    };

    const handleDeleteLead = async (leadId) => {
         if (window.confirm('¿Estás seguro de que quieres eliminar este lead?')) {
            try {
                await apiClient.delete(`/leads/${leadId}`);
                setLeads(leads.filter(l => l.id !== leadId));
                handleCloseModal();
            } catch (err) {
                console.error("Error eliminando lead:", err);
                alert("Error al eliminar el lead.");
            }
        }
    };
    
    const handleDrop = async (leadId, newStage) => {
        const lead = leads.find(l => l.id.toString() === leadId);
        if (lead && lead.stage !== newStage) {
             const updatedLeadData = { ...lead, stage: newStage };
             // optimistic update
             setLeads(leads.map(l => l.id === lead.id ? updatedLeadData : l));
             try {
                await apiClient.put(`/leads/${lead.id}`, updatedLeadData);
             } catch (err) {
                // revert on error
                setLeads(leads.map(l => l.id === lead.id ? lead : l));
                alert('No se pudo mover el lead.');
             }
        }
    };

    const leadsByStage = useMemo(() => {
        return STAGES.reduce((acc, stage) => {
            acc[stage] = leads.filter(lead => lead.stage === stage);
            return acc;
        }, {});
    }, [leads]);
    
    if (!token) {
        return <AuthPage setToken={setToken} />;
    }

    return (
        <div className="flex flex-col h-screen font-sans bg-gray-50">
            <header className="flex items-center justify-between p-4 bg-white border-b">
                <h1 className="text-xl font-bold text-gray-800">CRM - SimpleWebPeru</h1>
                <div>
                    <button onClick={() => handleOpenModal()} className="inline-flex items-center px-4 py-2 mr-4 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">
                        <Plus size={16} className="mr-2" /> Añadir Lead
                    </button>
                    <button onClick={handleLogout} className="inline-flex items-center p-2 text-sm font-medium text-gray-600 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200">
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 overflow-x-auto">
                 {loading && <div className="flex justify-center mt-10"><LoaderCircle className="animate-spin text-indigo-600" size={40} /></div>}
                 {error && <p className="text-center text-red-500">{error}</p>}
                
                {!loading && !error && (
                    <div className="flex h-full space-x-4">
                        {STAGES.map(stage => (
                            <KanbanColumn
                                key={stage}
                                stage={stage}
                                leads={leadsByStage[stage] || []}
                                onDrop={handleDrop}
                                onCardClick={handleOpenModal}
                            />
                        ))}
                    </div>
                )}
            </main>

            {isModalOpen && (
                <LeadModal
                    lead={editingLead}
                    onSave={handleSaveLead}
                    onCancel={handleCloseModal}
                    onDelete={handleDeleteLead}
                />
            )}
        </div>
    );
}

export default App;