import React, { useState, useEffect } from 'react';
import { 
  Trophy, ShieldAlert, Users, Plus, 
  BarChart3, LogOut, Edit3, Calendar, MapPin, Clock, Key, RefreshCw, UserPlus, Trash2, GraduationCap
} from 'lucide-react';
import { supabase } from './supabaseClient';

export type UserRole = 'ADMIN' | 'LIDER';

export interface Team {
  id: string;
  name: string;
  color_hex: string;
  teacher_in_charge: string;
  classroom: string;
  leader_name: string;
  vice_leader_name: string;
  total_score: number;
}

export interface Participant {
  id: string;
  team_id: string;
  student_name: string;
  grade_class: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  points: number;
  description: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
}

export interface TeamPassword {
  team_id: string;
  password: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('LIDER');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const [loginPassword, setLoginPassword] = useState('');
  const [loginTeamSelect, setLoginTeamSelect] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [passwordsList, setPasswordsList] = useState<TeamPassword[]>([]);
  const [participantsList, setParticipantsList] = useState<Participant[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'equipe' | 'participantes' | 'eventos' | 'seguranca'>('dashboard');

  // Modais
  const [editTeamModalOpen, setEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState('');
  const [pointsDelta, setPointsDelta] = useState<number>(0);

  const [newEventModalOpen, setNewEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', location: '', points: 100, description: '' });

  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Formulário de Novo Participante
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('');

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel('schema-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchTeams())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_passwords' }, () => fetchPasswords())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, () => fetchParticipants())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchTeams(), fetchEvents(), fetchPasswords(), fetchParticipants()]);
    setLoading(false);
  };

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*').order('total_score', { ascending: false });
    if (data) {
      setTeams(data);
      if (data.length > 0 && !loginTeamSelect) {
        setLoginTeamSelect(data[0].id);
        setTargetTeamId(data[0].id);
      }
    }
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (data) setEventsList(data as EventItem[]);
  };

  const fetchPasswords = async () => {
    const { data } = await supabase.from('team_passwords').select('*');
    if (data) setPasswordsList(data);
  };

  const fetchParticipants = async () => {
    const { data } = await supabase.from('participants').select('*').order('student_name', { ascending: true });
    if (data) setParticipantsList(data);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === 'admin2026') {
      setUserRole('ADMIN');
      setIsAuthenticated(true);
      return;
    }

    const teamPass = passwordsList.find(p => p.team_id === loginTeamSelect);
    const validPassword = teamPass ? teamPass.password : 'lider2026';

    if (loginPassword === validPassword) {
      setUserRole('LIDER');
      setSelectedTeamId(loginTeamSelect);
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta para a equipe selecionada!');
    }
  };

  // Salvar edições da Equipe (incluindo Sala, Líder e Vice)
  const handleSaveTeamEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || userRole !== 'ADMIN' || isSaving) return;

    setIsSaving(true);
    const { error } = await supabase.from('teams').update({
      name: editingTeam.name,
      color_hex: editingTeam.color_hex,
      teacher_in_charge: editingTeam.teacher_in_charge,
      classroom: editingTeam.classroom,
      leader_name: editingTeam.leader_name,
      vice_leader_name: editingTeam.vice_leader_name,
    }).eq('id', editingTeam.id);

    if (error) alert('Erro: ' + error.message);
    else {
      alert('Equipe atualizada!');
      setEditTeamModalOpen(false);
      fetchTeams();
    }
    setIsSaving(false);
  };

  // Adicionar Participante/Aluno
  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId && userRole !== 'ADMIN') return;
    const targetTeam = userRole === 'ADMIN' ? targetTeamId : selectedTeamId;

    if (!newStudentName || !newStudentGrade || isSaving) return;

    setIsSaving(true);
    const { error } = await supabase.from('participants').insert([{
      team_id: targetTeam,
      student_name: newStudentName,
      grade_class: newStudentGrade
    }]);

    if (error) alert('Erro ao adicionar integrante: ' + error.message);
    else {
      setNewStudentName('');
      setNewStudentGrade('');
      fetchParticipants();
    }
    setIsSaving(false);
  };

  // Remover Participante
  const handleDeleteParticipant = async (id: string) => {
    if (!confirm('Deseja remover este integrante da equipe?')) return;
    const { error } = await supabase.from('participants').delete().eq('id', id);
    if (error) alert('Erro ao remover: ' + error.message);
    else fetchParticipants();
  };

  // Lançar Pontos
  const handleScoreAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'ADMIN' || isSaving) return;

    const team = teams.find(t => t.id === targetTeamId);
    if (!team || pointsDelta === 0) return;

    setIsSaving(true);
    const newScore = team.total_score + pointsDelta;
    const { error } = await supabase.from('teams').update({ total_score: newScore }).eq('id', team.id);

    if (error) alert('Erro ao lançar pontos: ' + error.message);
    else {
      alert('Pontuação atualizada!');
      setScoreModalOpen(false);
      setPointsDelta(0);
      fetchTeams();
    }
    setIsSaving(false);
  };

  // Criar Evento
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'ADMIN' || isSaving) return;

    setIsSaving(true);
    const { error } = await supabase.from('events').insert([{ ...newEvent, status: 'PENDENTE' }]);

    if (error) alert('Erro ao criar evento: ' + error.message);
    else {
      alert('Novo evento cadastrado!');
      setNewEventModalOpen(false);
      setNewEvent({ title: '', date: '', time: '', location: '', points: 100, description: '' });
      fetchEvents();
    }
    setIsSaving(false);
  };

  // Trocar Senha
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !newPasswordInput || isSaving) return;

    setIsSaving(true);
    const { error } = await supabase.from('team_passwords').upsert({
      team_id: selectedTeamId,
      password: newPasswordInput,
      updated_at: new Date().toISOString()
    });

    if (error) alert('Erro ao alterar senha: ' + error.message);
    else {
      alert('Senha alterada com sucesso!');
      setChangePasswordModalOpen(false);
      setNewPasswordInput('');
      fetchPasswords();
    }
    setIsSaving(false);
  };

  // Resetar Senha
  const handleResetPassword = async (teamId: string) => {
    if (userRole !== 'ADMIN') return;
    if (!confirm('Deseja resetar a senha desta equipe para "lider2026"?')) return;

    const { error } = await supabase.from('team_passwords').upsert({
      team_id: teamId,
      password: 'lider2026',
      updated_at: new Date().toISOString()
    });

    if (error) alert('Erro ao resetar senha: ' + error.message);
    else {
      alert('Senha resetada para "lider2026"!');
      fetchPasswords();
    }
  };

  const nextEvent = eventsList.find(e => e.status !== 'CONCLUIDO');
  const loggedTeam = teams.find(t => t.id === selectedTeamId);

  // Filtrar participantes para o Líder da equipe ou todos para o Admin
  const visibleParticipants = userRole === 'ADMIN' 
    ? participantsList.filter(p => p.team_id === targetTeamId)
    : participantsList.filter(p => p.team_id === selectedTeamId);

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
            <p><strong>Senha Padrão Líder:</strong> <code>lider2026</code></p>
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
              {userRole === 'ADMIN' ? 'Comissão Organizadora' : `Líder - ${loggedTeam?.name || ''}`}
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
        
        {/* DESTAQUE: PRÓXIMO EVENTO NO TOPO */}
        {nextEvent && (
          <div className="bg-slate-900 text-white rounded-2xl p-5 mb-6 shadow-xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                Próximo Evento Em Destaque
              </span>
              <h2 className="text-xl font-black mt-2">{nextEvent.title}</h2>
              <p className="text-xs text-slate-300 mt-1">{nextEvent.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-800/80 p-3 rounded-xl border border-slate-700/50">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Calendar className="w-4 h-4" /> {nextEvent.date}
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" /> {nextEvent.time}
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" /> {nextEvent.location}
              </span>
              <span className="font-black bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg">
                +{nextEvent.points} pts
              </span>
            </div>
          </div>
        )}

        <div className="flex border-b border-slate-200 gap-4 mb-6 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
          >
            <BarChart3 className="w-4 h-4" /> Painel Principal
          </button>
          
          <button 
            onClick={() => setActiveTab('equipe')} 
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'equipe' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
          >
            <Users className="w-4 h-4" /> Equipes
          </button>

          <button 
            onClick={() => setActiveTab('participantes')} 
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'participantes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
          >
            <GraduationCap className="w-4 h-4" /> Alunos / Participantes
          </button>

          <button 
            onClick={() => setActiveTab('eventos')} 
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'eventos' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
          >
            <Calendar className="w-4 h-4" /> Eventos & Provas
          </button>

          <button 
            onClick={() => setActiveTab('seguranca')} 
            className={`pb-3 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'seguranca' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500'}`}
          >
            <Key className="w-4 h-4" /> Seguranca & Senhas
          </button>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {userRole === 'ADMIN' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600" /> Painel da Comissão
                  </h3>
                  <p className="text-xs text-amber-700">Lançamento rápido de pontos para o ranking geral.</p>
                </div>
                <button 
                  onClick={() => setScoreModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Lançar Pontos
                </button>
              </div>
            )}

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

                  <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
                    <div className="text-3xl font-black text-slate-900">{team.total_score} <span className="text-xs font-normal text-slate-500">pts</span></div>
                    <p className="text-[11px] text-slate-600">Prof: <strong>{team.teacher_in_charge || 'Não informado'}</strong></p>
                    <p className="text-[11px] text-slate-500">Sala: <strong>{team.classroom || 'Não informada'}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: EQUIPES */}
        {activeTab === 'equipe' && (
          <div className="space-y-4">
            {teams.map(team => (
              <div key={team.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black" style={{ color: team.color_hex }}>
                    {team.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-600 mt-2">
                    <p>Prof. Responsável: <strong>{team.teacher_in_charge || 'N/A'}</strong></p>
                    <p>Sala: <strong>{team.classroom || 'N/A'}</strong></p>
                    <p>Líder: <strong>{team.leader_name || 'N/A'}</strong></p>
                    <p>Vice-Líder: <strong>{team.vice_leader_name || 'N/A'}</strong></p>
                  </div>
                </div>

                {userRole === 'ADMIN' && (
                  <button 
                    onClick={() => {
                      setEditingTeam(team);
                      setEditTeamModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-slate-200"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar Equipe
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: ALUNOS / PARTICIPANTES */}
        {activeTab === 'participantes' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-amber-500" /> Cadastro de Alunos da Equipe
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                {userRole === 'ADMIN' ? 'Selecione uma equipe para visualizar ou cadastrar os integrantes.' : `Cadastre os participantes da sua equipe (${loggedTeam?.name}).`}
              </p>

              {userRole === 'ADMIN' && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selecione a Equipe</label>
                  <select 
                    value={targetTeamId} 
                    onChange={(e) => setTargetTeamId(e.target.value)} 
                    className="w-full md:w-64 text-xs p-2.5 border border-slate-300 rounded-lg bg-slate-50 font-bold"
                  >
                    {teams.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                  </select>
                </div>
              )}

              {/* Formulário de Adicionar Aluno */}
              <form onSubmit={handleAddParticipant} className="flex flex-col md:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="Nome completo do aluno"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div className="w-full md:w-48">
                  <input 
                    type="text" 
                    value={newStudentGrade}
                    onChange={(e) => setNewStudentGrade(e.target.value)}
                    placeholder="Turma (Ex: 6º Ano A)"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <UserPlus className="w-4 h-4" /> Cadastrar Aluno
                </button>
              </form>
            </div>

            {/* Lista de Alunos Cadastrados */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-900 text-white font-bold text-xs flex justify-between">
                <span>Lista de Alunos Integrantes ({visibleParticipants.length})</span>
              </div>

              {visibleParticipants.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 italic">
                  Nenhum aluno cadastrado para esta equipe ainda.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visibleParticipants.map((st, idx) => (
                    <div key={st.id} className="p-3.5 flex justify-between items-center hover:bg-slate-50 transition">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 w-6">{idx + 1}.</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{st.student_name}</p>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {st.grade_class}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDeleteParticipant(st.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition"
                        title="Remover participante"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: EVENTOS */}
        {activeTab === 'eventos' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" /> Cronograma de Eventos
                </h2>
                <p className="text-xs text-slate-500 mt-1">Provas e atividades agendadas para a Gincana 2026.</p>
              </div>

              {userRole === 'ADMIN' && (
                <button 
                  onClick={() => setNewEventModalOpen(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-amber-400 px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Novo Evento
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {eventsList.map(ev => (
                <div key={ev.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        +{ev.points} Pontos
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {ev.time}
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-900 mb-1">{ev.title}</h3>
                    <p className="text-xs text-slate-600 mb-3">{ev.description}</p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" /> {ev.location}
                    </span>
                    <span className="font-semibold text-slate-700">{ev.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: SEGURANÇA E SENHAS */}
        {activeTab === 'seguranca' && (
          <div className="space-y-6">
            {userRole === 'LIDER' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-md">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" /> Alterar Minha Senha
                </h3>
                <p className="text-xs text-slate-500 mb-4">A nova senha será exigida no próximo login da equipe.</p>
                
                <button 
                  onClick={() => setChangePasswordModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
                >
                  Criar Nova Senha
                </button>
              </div>
            )}

            {userRole === 'ADMIN' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" /> Painel de Gestão de Senhas (Comissão)
                </h3>
                <p className="text-xs text-slate-500 mb-4">Caso uma equipe perca a senha, clique em resetar para restaurar para "lider2026".</p>

                <div className="space-y-2">
                  {teams.map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium">
                      <span className="font-bold text-slate-800" style={{ color: t.color_hex }}>{t.name}</span>
                      <button 
                        onClick={() => handleResetPassword(t.id)}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded flex items-center gap-1 text-[11px] font-bold"
                      >
                        <RefreshCw className="w-3 h-3" /> Resetar Senha
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: EDITAR EQUIPE (INCLUINDO SALA, LÍDER E VICE) */}
      {editTeamModalOpen && editingTeam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Editar Equipe</h3>
            <form onSubmit={handleSaveTeamEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Equipe</label>
                <input 
                  type="text" 
                  value={editingTeam.name}
                  onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg font-bold"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Sala da Equipe</label>
                <input 
                  type="text" 
                  value={editingTeam.classroom || ''}
                  onChange={(e) => setEditingTeam({ ...editingTeam, classroom: e.target.value })}
                  placeholder="Ex: Sala 04 / Bloco B"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Líder</label>
                  <input 
                    type="text" 
                    value={editingTeam.leader_name || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, leader_name: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Vice-Líder</label>
                  <input 
                    type="text" 
                    value={editingTeam.vice_leader_name || ''}
                    onChange={(e) => setEditingTeam({ ...editingTeam, vice_leader_name: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cor Hexadecimal</label>
                <input 
                  type="color" 
                  value={editingTeam.color_hex}
                  onChange={(e) => setEditingTeam({ ...editingTeam, color_hex: e.target.value })}
                  className="w-full h-9 p-0.5 border border-slate-300 rounded cursor-pointer mb-1"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditTeamModalOpen(false)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">{isSaving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADICIONAR EVENTO */}
      {newEventModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Novo Evento / Prova</h3>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título do Evento</label>
                <input 
                  type="text" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Ex: Torneio de Queimada"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data</label>
                  <input 
                    type="date" 
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário</label>
                  <input 
                    type="text" 
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    placeholder="Ex: 09:30"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Local</label>
                  <input 
                    type="text" 
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    placeholder="Ex: Quadra 2"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pontos Em Disputa</label>
                  <input 
                    type="number" 
                    value={newEvent.points}
                    onChange={(e) => setNewEvent({ ...newEvent, points: Number(e.target.value) })}
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Descrição / Regras</label>
                <textarea 
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={2}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setNewEventModalOpen(false)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">{isSaving ? 'Cadastrando...' : 'Cadastrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR PONTOS */}
      {scoreModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Lançar Pontos</h3>
            <form onSubmit={handleScoreAdjustment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Equipe</label>
                <select value={targetTeamId} onChange={(e) => setTargetTeamId(e.target.value)} className="w-full text-xs p-2 border border-slate-300 rounded-lg">
                  {teams.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade</label>
                <input type="number" value={pointsDelta} onChange={(e) => setPointsDelta(Number(e.target.value))} placeholder="Ex: 50 ou -10" className="w-full text-xs p-2 border border-slate-300 rounded-lg" required />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setScoreModalOpen(false)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">{isSaving ? 'Salvando...' : 'Confirmar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TROCAR SENHA DO LÍDER */}
      {changePasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Alterar Senha de Acesso</h3>
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nova Senha</label>
                <input 
                  type="password" 
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Digite a nova senha da equipe"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setChangePasswordModalOpen(false)} className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold">Cancelar</button>
                <button type="submit" disabled={isSaving} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold">{isSaving ? 'Salvando...' : 'Salvar Nova Senha'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
