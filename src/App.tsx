import React, { useState } from 'react';
import { 
  Trophy, ShieldAlert, Calendar, Gift, Users, 
  Upload, Plus, Clock, BarChart3, LogOut, Edit3, Trash2, MapPin, Award
} from 'lucide-react';

export type UserRole = 'ADMIN' | 'LIDER';

export interface Team {
  id: string;
  name: string;
  color_hex: string;
  teacher_in_charge: string;
  leader_name?: string;
  vice_leader_name?: string;
  mascot_name?: string;
  war_cry?: string;
  total_score: number;
}

export interface ScheduleItem {
  id: string;
  date: string;
  time: string;
  title: string;
  location: string;
  max_points?: number;
}

export interface ScoreAuditLog {
  id: string;
  team_name: string;
  changed_by: string;
  previous_points: number;
  new_points: number;
  points_delta: number;
  reason: string;
  timestamp: string;
}

const INITIAL_TEAMS: Team[] = [
  { id: '1', name: 'Equipe Amarela', color_hex: '#D97706', teacher_in_charge: 'Prof. Carlos', total_score: 0 },
  { id: '2', name: 'Equipe Azul', color_hex: '#2563EB', teacher_in_charge: 'Profa. Mariana', total_score: 0 },
  { id: '3', name: 'Equipe Verde', color_hex: '#059669', teacher_in_charge: 'Prof. Roberto', total_score: 0 },
  { id: '4', name: 'Equipe Vermelha', color_hex: '#DC2626', teacher_in_charge: 'Profa. Ana', total_score: 0 },
];

const INITIAL_SCHEDULE: ScheduleItem[] = [
  { id: '1', date: '06/10', time: '08:00', title: 'Abertura Oficial e Apresentação das Equipes', location: 'Quadra Coberta', max_points: 50 },
  { id: '2', date: '07/10', time: '09:30', title: 'Entrega da Prova Solidária (Alimentos)', location: 'Pátio Central', max_points: 100 },
];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('LIDER');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('2');
  
  const [loginPassword, setLoginPassword] = useState('');
  const [loginTeamSelect, setLoginTeamSelect] = useState('2');

  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [schedule, setSchedule] = useState<ScheduleItem[]>(INITIAL_SCHEDULE);
  const [auditLogs, setAuditLogs] = useState<ScoreAuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'equipe' | 'pontos' | 'doacoes' | 'cronograma'>('dashboard');

  // Modais
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [targetTeamId, setTargetTeamId] = useState('1');
  const [pointsDelta, setPointsDelta] = useState<number>(0);
  const [scoreReason, setScoreReason] = useState('');

  // Modal Edição de Equipe
  const [editTeamModalOpen, setEditTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Modal Novo Evento no Cronograma
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventPoints, setNewEventPoints] = useState<number | ''>('');

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
      alert('Senha incorreta! Utilize "admin2026" para Comissão ou "lider2026" para Líderes.');
    }
  };

  const handleScoreAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'ADMIN') return;

    const team = teams.find(t => t.id === targetTeamId);
    if (!team || pointsDelta === 0 || !scoreReason.trim()) return;

    const prevPoints = team.total_score;
    const newPoints = prevPoints + pointsDelta;

    setTeams(prev => prev.map(t => t.id === team.id ? { ...t, total_score: newPoints } : t));

    const newLog: ScoreAuditLog = {
      id: String(Date.now()),
      team_name: team.name,
      changed_by: 'Comissão Organizadora',
      previous_points: prevPoints,
      new_points: newPoints,
      points_delta: pointsDelta,
      reason: scoreReason,
      timestamp: new Date().toLocaleString('pt-BR')
    };

    setAuditLogs([newLog, ...auditLogs]);
    setScoreModalOpen(false);
    setPointsDelta(0);
    setScoreReason('');
  };

  const handleSaveTeamEdit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!editingTeam || userRole !== 'ADMIN') return;

  const { error } = await supabase
    .from('teams')
    .update({
      name: editingTeam.name,
      color_hex: editingTeam.color_hex,
      teacher_in_charge: editingTeam.teacher_in_charge,
    })
    .eq('id', editingTeam.id);

  if (error) {
    console.error('Erro detalhado do Supabase:', error);
    alert(`Erro ao salvar: ${error.message}`);
  } else {
    alert('Alteração salva com sucesso no Supabase!');
    setEditTeamModalOpen(false);
    setEditingTeam(null);
    fetchTeams(); // Atualiza a lista com as informações do banco
  }
};

  const handleAddScheduleItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'ADMIN' || !newEventTitle || !newEventDate) return;

    const newItem: ScheduleItem = {
      id: String(Date.now()),
      date: newEventDate,
      time: newEventTime || 'A definir',
      title: newEventTitle,
      location: newEventLocation || 'Escola Nova Aquarela',
      max_points: newEventPoints ? Number(newEventPoints) : undefined
    };

    setSchedule([...schedule, newItem]);
    setScheduleModalOpen(false);
    setNewEventDate('');
    setNewEventTime('');
    setNewEventTitle('');
    setNewEventLocation('');
    setNewEventPoints('');
  };

  const handleDeleteScheduleItem = (id: string) => {
    if (userRole !== 'ADMIN') return;
    if (confirm('Tem certeza de que deseja remover este evento do cronograma?')) {
      setSchedule(prev => prev.filter(item => item.id !== id));
    }
  };

  const rankedTeams = [...teams].sort((a, b) => b.total_score - a.total_score);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="bg-amber-500 w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-slate-900 font-extrabold mb-3">
              <Trophy className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">Gincana Escolar 2026</h1>
            <p className="text-xs text-slate-500 mt-1">Escola Nova Aquarela • EF II (6º ao 9º ano)</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Selecione a sua Equipe</label>
              <select 
                value={loginTeamSelect}
                onChange={(e) => setLoginTeamSelect(e.target.value)}
                className="w-full text-sm p-3 border border-slate-300 rounded-lg bg-slate-50 font-medium"
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
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
            <p><strong>Acesso de Teste:</strong></p>
            <p>• Comissão (Admin): <code>admin2026</code></p>
            <p>• Líder de Equipe: <code>lider2026</code></p>
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
              {userRole === 'ADMIN' ? 'Comissão Organizadora' : `Líder: ${teams.find(t => t.id === selectedTeamId)?.name}`}
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

      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 text-white text-center py-2 px-4 font-medium text-xs flex justify-center items-center gap-2">
        <Clock className="w-3.5 h-3.5 animate-pulse" />
        <span>PRÓXIMO EVENTO: <strong>Apresentação das Equipes & Abertura Oficial</strong></span>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 scrollbar-none">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <BarChart3 className="w-4 h-4" /> Painel Principal
          </button>
          
          <button 
            onClick={() => setActiveTab('equipe')} 
            className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'equipe' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Users className="w-4 h-4" /> {userRole === 'ADMIN' ? 'Todas as Equipes' : 'A Minha Equipe'}
          </button>

          <button 
            onClick={() => setActiveTab('pontos')} 
            className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'pontos' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Trophy className="w-4 h-4" /> Tabela de Pontos
          </button>

          <button 
            onClick={() => setActiveTab('doacoes')} 
            className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'doacoes' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Gift className="w-4 h-4" /> Prova Solidária
          </button>

          <button 
            onClick={() => setActiveTab('cronograma')} 
            className={`pb-3 px-4 font-semibold text-sm flex items-center gap-2 border-b-2 whitespace-nowrap ${activeTab === 'cronograma' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Calendar className="w-4 h-4" /> Cronograma
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="mt-6 space-y-6">
            {userRole === 'ADMIN' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex justify-between items-center gap-4">
                <div>
                  <h3 className="font-bold text-amber-900 flex items-center gap-2 text-sm">
                    <ShieldAlert className="w-4 h-4 text-amber-600" /> Painel da Comissão Organizadora
                  </h3>
                  <p className="text-xs text-amber-700">Lançamento de pontuações e gestão em tempo real.</p>
                </div>
                <button 
                  onClick={() => setScoreModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Registar Pontos
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {rankedTeams.map((team, index) => (
                <div 
                  key={team.id} 
                  className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
                  style={{ borderTop: `6px solid ${team.color_hex}` }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {index + 1}º LUGAR
                      </span>
                      {/* Nome da Equipe com a cor selecionada */}
                      <h4 className="text-lg font-extrabold" style={{ color: team.color_hex }}>
                        {team.name}
                      </h4>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-3xl font-black text-slate-900">{team.total_score} <span className="text-xs font-normal text-slate-500">pts</span></div>
                    <p className="text-[11px] text-slate-500 mt-1">Resp: <strong>{team.teacher_in_charge}</strong></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'equipe' && (
          <div className="mt-6 space-y-6">
            {teams
              .filter(team => userRole === 'ADMIN' ? true : team.id === selectedTeamId)
              .map(team => (
                <div key={team.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-10 rounded-md" style={{ backgroundColor: team.color_hex }}></div>
                      <div>
                        {/* Nome da Equipe impresso com a própria cor */}
                        <h2 className="text-2xl font-black" style={{ color: team.color_hex }}>
                          {team.name}
                        </h2>
                        <p className="text-xs text-slate-500">Professor Responsável: <strong>{team.teacher_in_charge}</strong></p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
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
                      <div className="bg-slate-100 px-3 py-1.5 rounded-lg font-bold text-slate-700 text-xs">
                        Pontos: <span className="text-amber-600 text-sm">{team.total_score} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Mascote da Equipe</h4>
                      <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center bg-slate-50">
                        <Upload className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                        <p className="text-xs text-slate-500">Carregar fotografia do mascote</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Grito de Guerra</h4>
                      <textarea 
                        rows={3}
                        placeholder="Escreva o grito de guerra da equipe aqui..."
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
            ))}
          </div>
        )}

        {activeTab === 'cronograma' && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Cronograma Oficial de Provas</h3>
                <p className="text-xs text-slate-500">Acompanhe as datas, locais e pontuações de cada evento.</p>
              </div>

              {userRole === 'ADMIN' && (
                <button 
                  onClick={() => setScheduleModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Adicionar Evento / Prova
                </button>
              )}
            </div>

            <div className="space-y-3">
              {schedule.map((item) => (
                <div key={item.id} className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition flex justify-between items-center gap-4 bg-slate-50/50">
                  <div className="flex items-start gap-4">
                    <div className="bg-amber-100 text-amber-900 border border-amber-200 px-3 py-2 rounded-lg text-center min-w-[70px]">
                      <div className="text-xs font-black">{item.date}</div>
                      <div className="text-[10px] text-amber-700 font-semibold">{item.time}</div>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>
                        {item.max_points && (
                          <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Award className="w-3 h-3" /> Vale até {item.max_points} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {userRole === 'ADMIN' && (
                    <button 
                      onClick={() => handleDeleteScheduleItem(item.id)}
                      className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition"
                      title="Eliminar evento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pontos' && (
          <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Histórico de Alterações de Pontuação</h3>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Nenhum registo efetuado até ao momento.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="p-2">Data</th>
                      <th className="p-2">Equipe</th>
                      <th className="p-2">Pontos</th>
                      <th className="p-2">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100">
                        <td className="p-2 text-slate-500">{log.timestamp}</td>
                        <td className="p-2 font-bold">{log.team_name}</td>
                        <td className="p-2 font-bold text-emerald-600">+{log.points_delta} pts</td>
                        <td className="p-2 text-slate-600">{log.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Lançar Pontos */}
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
                  placeholder="Ex: 20 ou -10"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Nome da Prova</label>
                <textarea 
                  value={scoreReason}
                  onChange={(e) => setScoreReason(e.target.value)}
                  placeholder="Descrição do motivo ou prova..."
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  rows={2}
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setScoreModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Equipe (Comissão) */}
      {editTeamModalOpen && editingTeam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Editar Dados da Equipe</h3>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Escolher Cor da Equipe</label>
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
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar Evento ao Cronograma */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 mb-3">Adicionar Prova / Evento</h3>
            <form onSubmit={handleAddScheduleItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome do Evento / Prova</label>
                <input 
                  type="text" 
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Ex: Prova do Grito de Guerra"
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data</label>
                  <input 
                    type="text" 
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    placeholder="Ex: 08/10"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário</label>
                  <input 
                    type="text" 
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="Ex: 10:00"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Local</label>
                  <input 
                    type="text" 
                    value={newEventLocation}
                    onChange={(e) => setNewEventLocation(e.target.value)}
                    placeholder="Ex: Quadra"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pontos Máximos</label>
                  <input 
                    type="number" 
                    value={newEventPoints}
                    onChange={(e) => setNewEventPoints(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Ex: 50"
                    className="w-full text-xs p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold"
                >
                  Adicionar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
