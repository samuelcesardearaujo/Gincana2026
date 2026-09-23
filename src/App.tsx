import React, { useState, useEffect } from 'react';
import { 
  Trophy, ShieldAlert, Users, Plus, 
  BarChart3, LogOut, Edit3 
} from 'lucide-react';
import { supabase } from './supabaseClient';

export type UserRole = 'ADMIN' | 'LIDER';

export interface Team {
  id: string;
  name: string;
  color_hex: string;
  teacher_in_charge: string;
  total_score: number;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('LIDER');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const [loginPassword, setLoginPassword] = useState('');
  const [loginTeamSelect, setLoginTeamSelect] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Estado para controlar o botão de salvar
  const [activeTab, setActiveTab] = useState<'dashboard' | 'equipe' | 'pontos'>('dashboard');

  // Modais
  const [editTeamModalOpen, setEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [pointsDelta, setPointsDelta] = useState<number>(0);

  // Buscar equipes do Supabase
  useEffect(() => {
    fetchTeams();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('total_score', { ascending: false });

      if (error) {
        console.error('Erro ao buscar equipes:', error.message);
      } else if (data) {
        setTeams(data);
        if (data.length > 0 && !loginTeamSelect) {
          setLoginTeamSelect(data[0].id);
          setTargetTeamId(data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Erro de conexão ao buscar:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'admin2026') {
      setUserRole('ADMIN');
      setIsAuthenticated(true);
    } else if (loginPassword === 'lider2026') {
      setUserRole('LIDER');
      setSelectedTeamId(loginTeamSelect);
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta! Use "admin2026" para Comissão ou "lider2026" para Líderes.');
    }
  };

  // Salvar edições de Nome, Cor e Professor no Supabase
  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || userRole !== 'ADMIN' || isSaving) return;

    try {
      setIsSaving(true);

      const { data, error } = await supabase
        .from('teams')
        .update({
          name: editingTeam.name,
          color_hex: editingTeam.color_hex,
          teacher_in_charge: editingTeam.teacher_in_charge,
        })
        .eq('id', editingTeam.id)
        .select();

      if (error) {
        alert('ERRO DO SUPABASE: ' + error.message);
      } else {
        alert('Sucesso! Dados salvos no banco de dados.');
        setEditTeamModalOpen(false);
        setEditingTeam(null);
        await fetchTeams();
      }
    } catch (err: any) {
      alert('Erro inesperado ao salvar: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar alteração de Pontos no Supabase
  const handleScoreAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'ADMIN' || isSaving) return;

    const team = teams.find(t => t.id === targetTeamId);
    if (!team || pointsDelta === 0) return;

    try {
      setIsSaving(true);
      const newScore = team.total_score + pointsDelta;

      const { error } = await supabase
        .from('teams')
        .update({ total_score: newScore })
        .eq('id', team.id);

      if (error) {
        alert('ERRO DO SUPABASE AO ATUALIZAR PONTOS: ' + error.message);
      } else {
        alert('Pontuação atualizada com sucesso!');
        setScoreModalOpen(false);
        setPointsDelta(0);
        await fetchTeams();
      }
    } catch (err: any) {
      alert('Erro ao atualizar pontuação: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="bg-amber-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-slate-900 font-extrabold mb-3">
              <Trophy className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Gincana Escolar 2026</h1>
            <p className="text-xs text-slate-500 mt-1">Escola Nova Aquarela</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Selecione a sua Equipe</label>
              <select 
                value={loginTeamSelect}
                onChange={(e) => setLoginTeamSelect(e.target.value)}
                className="w-full text-sm p-3 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              >
                {teams.length === 0 ? (
                  <option value="">Carregando equipes do Supabase...</option>
                ) : (
                  teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Senha de Acesso</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Insira a sua senha"
                className="w-full text-sm p-3 border border-slate-300 rounded-lg bg-slate-50"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-3 rounded-lg text-sm transition shadow-lg"
            >
              Entrar no Sistema
            </button>
          </form>

          <div className="mt-6 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-500">
            <p><strong>Senha Comissão (Admin):</strong> <code>admin2026</code></p>
            <p><strong>Senha Líder:</strong> <code>lider2026</code></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg text-slate-900 font-extrabold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Gincana Escolar 2026</h1>
              <p className="text-[10px] text-slate-400">Escola Nova Aquarela</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-slate-800 text-amber-400 border border-slate-700">
              {userRole === 'ADMIN' ? 'Comissão Organizadora' : `Líder`}
            </span>
            <button 
              onClick={() => setIsAuthenticated(false)}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex border-b border-slate-200 gap-4 mb-6">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 ${activeTab === 'dashboard' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
          >
            <BarChart3 className="w-4 h-4" /> Painel Principal
          </button>
          
          <button 
            onClick={() => setActiveTab('equipe')} 
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 ${activeTab === 'equipe' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
          >
            <Users className="w-4 h-4" /> Equipes
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {userRole === 'ADMIN' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" /> Painel da Comissão
                  </h3>
                  <p className="text-xs text-amber-700">Lançamento de pontos com salvamento automático no Supabase.</p>
                </div>
                <button 
                  onClick={() => setScoreModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Lançar Pontos
                </button>
              </div>
            )}

            {loading ? (
              <p className="text-xs text-slate-500 italic">Carregando informações do banco de dados...</p>
            ) : teams.length === 0 ? (
              <div className="p-6 bg-white border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                Nenhuma equipe foi encontrada no Supabase. Verifique se criou os dados no SQL Editor do Supabase.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {teams.map((team, index) => (
                  <div 
                    key={team.id} 
                    className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
                    style={{ borderTop: `6px solid ${team.color_hex}` }}
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {index + 1}º LUGAR
                      </span>
                      <h4 className="text-lg font-extrabold" style={{ color: team.color_hex }}>
                        {team.name}
                      </h4>
                    </div>

                    <div className="mt-4">
                      <div className="text-3xl font-black text-slate-900">{team.total_score} <span className="text-xs font-normal text-slate-500">pts</span></div>
                      <p className="text-[11px] text-slate-500 mt-1">Prof: <strong>{team.teacher_in_charge}</strong></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'equipe' && (
          <div className="space-y-4">
            {teams.map(team => (
              <div key={team.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black" style={{ color: team.color_hex }}>
                    {team.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Professor Responsável: <strong>{team.teacher_in_charge}</strong></p>
                </div>

                {userRole === 'ADMIN' && (
                  <button 
                    onClick={() => {
                      setEditingTeam(team);
                      setEditTeamModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-slate-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar no Supabase
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Editar Equipe */}
      {editTeamModalOpen && editingTeam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Editar Equipe no Supabase</h3>
            <form onSubmit={handleSaveTeamEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Equipe</label>
                <input 
                  type="text" 
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold"
                  style={{ color: editingTeam.color_hex }}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Professor Responsável</label>
                <input 
                  type="text" 
                  value={editingTeam.teacher_in_charge}
                  onChange={(e) => setEditingTeam({ ...editingTeam, teacher_in_charge: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cor da Equipe</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={editingTeam.color_hex}
                    onChange={(e) => setEditingTeam({ ...editingTeam, color_hex: e.target.value })}
                    className="w-12 h-9 p-0.5 border border-slate-300 rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={editingTeam.color_hex}
                    onChange={(e) => setEditingTeam({ ...editingTeam, color_hex: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg font-mono uppercase"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setEditTeamModalOpen(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar no Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lançar Pontos */}
      {scoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Lançar / Retirar Pontos</h3>
            <form onSubmit={handleScoreAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Equipe</label>
                <select 
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                >
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade de Pontos</label>
                <input 
                  type="number" 
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(Number(e.target.value))}
                  placeholder="Ex: 50 ou -10"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setScoreModalOpen(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
