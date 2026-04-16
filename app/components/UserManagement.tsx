import React, { useState, useEffect } from 'react';
import { User, Edit3, Trash2, Plus, Search, Mail, Calendar, Shield, CheckCircle, XCircle } from 'lucide-react';
import { getSupabase } from '../supabase';

const supabase = getSupabase();

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  company: string;
  department: string;
  registrationNumber: string;
  cpf: string;
  matricula: string;
  created_at: string;
  updated_at: string;
}

interface UserManagementProps {
  user: any;
}

export default function UserManagement({ user }: UserManagementProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Colaborador',
    company: 'Chronos Tech',
    department: 'Desenvolvimento'
  });

  useEffect(() => {
    if (supabase) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUsers = async () => {
    if (!supabase) {
      console.warn('Supabase não está configurado');
      setLoading(false);
      return;
    }

    try {
      console.log('Tentando buscar usuários...');
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Erro detalhado ao buscar usuários:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Erro ao carregar usuários: ${error.message}`);
        return;
      }

      console.log('Usuários carregados com sucesso:', data?.length || 0);
      setUsers(data || []);
    } catch (error) {
      console.error('Erro inesperado ao buscar usuários:', error);
      alert('Erro inesperado ao carregar usuários. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user:', error);
        alert('Erro ao atualizar usuário');
        return;
      }

      setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
      setEditingUser(null);
      alert('Usuário atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!supabase) return;

    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
        alert('Erro ao excluir usuário');
        return;
      }

      setUsers(users.filter(u => u.id !== userId));
      alert('Usuário excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário');
    }
  };

  const handleCreateUser = async () => {
    if (!supabase) return;

    try {
      const newUser = {
        ...formData,
        id: `temp_${Date.now()}`, // Temporary ID for UI
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100`,
        registrationNumber: '',
        cpf: '',
        matricula: ''
      };

      // In a real app, you'd create the user in auth first, then profile
      // For now, we'll just add to profiles table
      const { error } = await supabase
        .from('profiles')
        .insert([newUser]);

      if (error) {
        console.error('Error creating user:', error);
        alert('Erro ao criar usuário');
        return;
      }

      setUsers([newUser, ...users]);
      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        role: 'Colaborador',
        company: 'Chronos Tech',
        department: 'Desenvolvimento'
      });
      alert('Usuário criado com sucesso!');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Erro ao criar usuário');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Usuários</h1>
          <p className="text-slate-600 mt-1">Gerencie usuários, perfis e permissões do sistema</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-xl hover:bg-brand-blue/90 transition-colors"
        >
          <Plus size={18} />
          Novo Usuário
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
        />
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Criar Novo Usuário</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <XCircle size={24} />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
                placeholder="Nome completo"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Cargo</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
              >
                <option value="Colaborador">Colaborador</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Empresa</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
                placeholder="Nome da empresa"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Departamento</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
                placeholder="Departamento"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCreateUser}
              className="bg-brand-blue text-white px-6 py-2 rounded-xl hover:bg-brand-blue/90 transition-colors"
            >
              Criar Usuário
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Usuários ({filteredUsers.length})
          </h2>
        </div>

        <div className="divide-y divide-slate-200">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-slate-900">{user.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail size={14} />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <span>{user.role}</span>
                        <span>•</span>
                        <span>{user.department}</span>
                        <span>•</span>
                        <span>{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-2 text-slate-400 hover:text-brand-blue transition-colors"
                      title="Editar usuário"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Excluir usuário"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Editar Usuário</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cargo</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
                >
                  <option value="Colaborador">Colaborador</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Departamento</label>
                <input
                  type="text"
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-brand-blue focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleUpdateUser(editingUser.id, {
                  name: editingUser.name,
                  role: editingUser.role,
                  department: editingUser.department
                })}
                className="bg-brand-blue text-white px-6 py-2 rounded-xl hover:bg-brand-blue/90 transition-colors"
              >
                Salvar
              </button>
              <button
                onClick={() => setEditingUser(null)}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded-xl hover:bg-slate-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}