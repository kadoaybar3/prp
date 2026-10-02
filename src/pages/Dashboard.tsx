import { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, Activity, Clock, ChevronLeft, ChevronRight, Scissors, Droplet, CheckCircle2, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Patient, HairTransplant, PrpSession, CalendarEvent } from '@/types';
import { getCalendarGrid, getMonthName, toDateString, todayString, isToday, formatDayMonth, getDayShort } from '@/utils/date';
import { getShortPatientName } from '@/utils/whatsapp';

interface DashboardProps {
  onSelectPatient: (id: string) => void;
  onNavigate: (page: 'patient-list' | 'new-patient') => void;
}

export default function Dashboard({ onSelectPatient }: DashboardProps) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [hairTransplants, setHairTransplants] = useState<HairTransplant[]>([]);
  const [prpSessions, setPrpSessions] = useState<PrpSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: p }, { data: ht }, { data: ps }] = await Promise.all([
      supabase.from('patients').select('*').order('created_at', { ascending: false }),
      supabase.from('hair_transplants').select('*'),
      supabase.from('prp_sessions').select('*'),
    ]);
    setPatients(p ?? []);
    setHairTransplants(ht ?? []);
    setPrpSessions(ps ?? []);
    setLoading(false);
  }

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach((p) => m.set(p.id, p));
    return m;
  }, [patients]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];
    hairTransplants.forEach((ht) => {
      const p = patientMap.get(ht.patient_id);
      if (p) {
        events.push({
          id: ht.id,
          date: ht.operation_date,
          type: 'ht',
          patientName: p.full_name,
          patientId: p.id,
        });
      }
    });
    prpSessions.forEach((ps) => {
      if (ps.status === 'cancelled') return;
      const p = patientMap.get(ps.patient_id);
      if (p) {
        events.push({
          id: ps.id,
          date: ps.scheduled_date,
          type: 'prp',
          patientName: p.full_name,
          patientId: p.id,
          sessionNumber: ps.session_number,
          status: ps.status,
        });
      }
    });
    return events;
  }, [hairTransplants, prpSessions, patientMap]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    calendarEvents.forEach((e) => {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    });
    return m;
  }, [calendarEvents]);

  const today = todayString();
  const todayEvents = eventsByDate.get(today) ?? [];

  const now = new Date();
  const realMonthStart = toDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  const realMonthEnd = toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const prpReminders = useMemo(() => {
    return calendarEvents
      .filter((e) => e.type === 'prp' && e.date >= realMonthStart && e.date <= realMonthEnd && e.status !== 'completed')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 12);
  }, [calendarEvents, realMonthStart, realMonthEnd]);

  const activePrpCycles = useMemo(() => {
    const cycleIds = new Set(prpSessions.filter((s) => s.status === 'scheduled').map((s) => s.prp_cycle_id));
    return cycleIds.size;
  }, [prpSessions]);

  const totalPatients = patients.length;

  const pendingToday = todayEvents.length;

  const calendarDays = getCalendarGrid(cursor.year, cursor.month);

  function prevMonth() {
    setCursor((c) => {
      const m = c.month - 1;
      return m < 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: m };
    });
  }

  function nextMonth() {
    setCursor((c) => {
      const m = c.month + 1;
      return m > 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: m };
    });
  }

  function goToToday() {
    const d = new Date();
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kontrol Paneli</h1>
          <p className="text-slate-500 text-sm mt-1">Klinik takviminizi ve hasta özetinizi görüntüleyin</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          icon={<Users className="w-5 h-5" />}
          label="Toplam Hasta"
          value={totalPatients}
          color="blue"
          loading={loading}
        />
        <SummaryCard
          icon={<Activity className="w-5 h-5" />}
          label="Aktif PRP Döngüleri"
          value={activePrpCycles}
          color="emerald"
          loading={loading}
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5" />}
          label="Bugünkü Randevular"
          value={pendingToday}
          color="amber"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-slate-800">{getMonthName(cursor.month)} {cursor.year}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goToToday} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 border border-slate-200 rounded-lg hover:border-blue-300 transition-all">
                Bugün
              </button>
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-all">
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => {
                const dateStr = toDateString(date);
                const isCurrentMonth = date.getMonth() === cursor.month;
                const todayHighlight = isToday(dateStr);
                const dayEvents = eventsByDate.get(dateStr) ?? [];

                return (
                  <div
                    key={dateStr}
                    className={`relative rounded-lg flex flex-col items-stretch p-1 transition-all min-h-[80px] ${
                      !isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-300'
                        : todayHighlight
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : dayEvents.length > 0
                        ? 'bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer'
                        : 'hover:bg-slate-50 border border-transparent'
                    } ${dayEvents.length > 0 && isCurrentMonth ? 'cursor-pointer' : ''}`}
                    onClick={() => dayEvents.length > 0 && setSelectedDateEvents(dayEvents)}
                  >
                    <span className={`text-xs ${isCurrentMonth ? 'text-slate-700' : 'text-slate-400'} ${todayHighlight ? 'font-bold text-blue-700' : ''} px-0.5`}>
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                        {dayEvents.slice(0, 3).map((e) => (
                          <CalendarBadge key={e.id} event={e} />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-slate-400 px-1">+{dayEvents.length - 3} daha</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-xs text-slate-600">Saç Ekimi</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-xs text-slate-600">PRP Seansı</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Current month PRP reminders */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Mevcut Ayın PRP Hatırlatmaları</h2>
              <span className="ml-auto text-xs font-medium text-slate-400">{prpReminders.length}</span>
            </div>
            <div className="p-3 max-h-[28rem] overflow-y-auto">
              {prpReminders.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-6">Bu ay için PRP hatırlatması yok</p>
              ) : (
                prpReminders.map((e) => <EventRow key={e.id} event={e} onClick={() => onSelectPatient(e.patientId)} />)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDateEvents && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDateEvents(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{formatDayMonth(selectedDateEvents[0].date)} - {getDayShort(selectedDateEvents[0].date)}</h3>
              <button onClick={() => setSelectedDateEvents(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>
            <div className="p-4 space-y-2">
              {selectedDateEvents.map((e) => <EventRow key={e.id} event={e} onClick={() => { onSelectPatient(e.patientId); setSelectedDateEvents(null); }} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color, loading }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'emerald' | 'amber';
  loading: boolean;
}) {
  const colors = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/20',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/20',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/20',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-lg`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{loading ? '–' : value}</p>
      </div>
    </div>
  );
}

function EventRow({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const isHt = event.type === 'ht';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-all text-left group"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isHt ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
      }`}>
        {isHt ? <Scissors className="w-4 h-4" /> : <Droplet className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{event.patientName}</p>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isHt ? 'text-blue-600' : 'text-emerald-600'}`}>
            {isHt ? 'Saç Ekimi' : `PRP Seans ${event.sessionNumber}`}
          </span>
          {event.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
        </div>
      </div>
      <span className="text-xs text-slate-400 flex-shrink-0">{formatDayMonth(event.date)}</span>
    </button>
  );
}

function CalendarBadge({ event }: { event: CalendarEvent }) {
  const isHt = event.type === 'ht';
  const shortName = getShortPatientName(event.patientName);
  return (
    <div
      className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate font-medium ${
        isHt
          ? 'bg-blue-100 text-blue-700'
          : 'bg-emerald-100 text-emerald-700'
      } ${event.status === 'completed' ? 'opacity-50 line-through' : ''}`}
    >
      {shortName} — {isHt ? 'Ekim' : `PRP ${event.sessionNumber}`}
    </div>
  );
}
