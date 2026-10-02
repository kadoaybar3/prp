import { useState, useEffect, useMemo } from 'react';
import { Search, Users, Scissors, Droplet, Check, Phone, ChevronRight, Trash2 } from 'lucide-react';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import { supabase } from '@/lib/supabase';
import type { Patient, PrpSession, ServiceType } from '@/types';
import { formatDate } from '@/utils/date';
import { buildWhatsAppUrl } from '@/utils/whatsapp';

interface PatientListProps {
  onSelectPatient: (id: string) => void;
  onNavigate: (page: 'new-patient') => void;
}

export default function PatientList({ onSelectPatient, onNavigate }: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prpSessions, setPrpSessions] = useState<PrpSession[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ServiceType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: p }, { data: ps }] = await Promise.all([
      supabase.from('patients').select('*').order('created_at', { ascending: false }),
      supabase.from('prp_sessions').select('*'),
    ]);
    setPatients(p ?? []);
    setPrpSessions(ps ?? []);
    setLoading(false);
  }

  const patientsWithPrp = useMemo(() => {
    const m = new Set<string>();
    prpSessions.forEach((s) => {
      if (s.status !== 'cancelled') m.add(s.patient_id);
    });
    return m;
  }, [prpSessions]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (filter !== 'all' && p.service_type !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.full_name.toLowerCase().includes(q) || (p.phone?.includes(q) ?? false);
      }
      return true;
    });
  }, [patients, search, filter]);

  async function deletePatient(patient: Patient) {
    if (!window.confirm(`${patient.full_name} adlı hastayı ve tüm seans kayıtlarını silmek istediğinizden emin misiniz?`)) return;
    const { error } = await supabase.from('patients').delete().eq('id', patient.id);
    if (error) return;
    setPatients((prev) => prev.filter((p) => p.id !== patient.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Hastalar</h1>
          <p className="text-slate-500 text-sm mt-1">{patients.length} hasta kayıtlı</p>
        </div>
        <button
          onClick={() => onNavigate('new-patient')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg shadow-blue-600/20 transition-all self-start sm:self-auto"
        >
          Yeni Hasta
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya telefon ara..."
            className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto">
          {(['all', 'ht', 'prp', 'both'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 sm:px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'Tümü' : f === 'ht' ? 'Ekim' : f === 'prp' ? 'PRP' : 'İkisi'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400 mt-3">Yükleniyor...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {search || filter !== 'all' ? 'Aramanızla eşleşen hasta bulunamadı.' : 'Henüz hasta kaydı yok.'}
            </p>
            {!search && filter === 'all' && (
              <button onClick={() => onNavigate('new-patient')} className="mt-4 text-sm text-blue-600 font-medium hover:underline">
                İlk hastanızı ekleyin →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((patient) => {
              const hasPrp = patientsWithPrp.has(patient.id);
              return (
                <div
                  key={patient.id}
                  className="w-full flex items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-slate-50 transition-all text-left group"
                >
                  <button
                    onClick={() => onSelectPatient(patient.id)}
                    className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                      {patient.full_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{patient.full_name}</p>
                        <ServiceBadge type={patient.service_type} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {patient.phone && (
                          <span className="text-xs text-slate-400 flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 flex-shrink-0" /> {patient.phone}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 hidden sm:inline">{formatDate(patient.created_at.slice(0, 10))}</span>
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {hasPrp && patient.phone && (
                      <a
                        href={buildWhatsAppUrl(patient.phone, patient.full_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-2.5 sm:px-3 py-2 rounded-lg transition-all shadow-sm"
                        title="WhatsApp PRP hatırlatması gönder"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePatient(patient); }}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all"
                      title="Hastayı sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => onSelectPatient(patient.id)}>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceBadge({ type }: { type: ServiceType }) {
  if (type === 'ht') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
        <Scissors className="w-3 h-3" /> Ekim
      </span>
    );
  }
  if (type === 'prp') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-medium rounded-full">
        <Droplet className="w-3 h-3" /> PRP
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
      <Check className="w-3 h-3" /> İkisi
    </span>
  );
}
