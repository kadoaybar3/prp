import { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, User, Phone, HeartPulse, Scissors, Droplet, Calendar, CreditCard,
  StickyNote, Banknote, CheckCircle2, Clock, XCircle, CalendarClock, Save, X,
  Edit2, Trash2, MapPin,
} from 'lucide-react';
import WhatsAppIcon from '@/components/WhatsAppIcon';
import { supabase } from '@/lib/supabase';
import type { Patient, HairTransplant, PrpCycleWithSessions, PrpSession, SessionStatus, ServiceType } from '@/types';
import { formatDate, todayString, isPast, isToday } from '@/utils/date';
import { buildWhatsAppUrl } from '@/utils/whatsapp';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
  onDeleted: () => void;
}

export default function PatientDetail({ patientId, onBack, onDeleted }: PatientDetailProps) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [ht, setHt] = useState<HairTransplant | null>(null);
  const [prpCycles, setPrpCycles] = useState<PrpCycleWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState<PrpSession | null>(null);
  const [feeEditing, setFeeEditing] = useState<PrpSession | null>(null);
  const [feeAmount, setFeeAmount] = useState('');
  const [feePaid, setFeePaid] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(todayString());
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editServiceType, setEditServiceType] = useState<ServiceType>('prp');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPatient();
  }, [patientId]);

  async function fetchPatient() {
    setLoading(true);
    const [{ data: p }, { data: htData }, { data: cycles }] = await Promise.all([
      supabase.from('patients').select('*').eq('id', patientId).maybeSingle(),
      supabase.from('hair_transplants').select('*').eq('patient_id', patientId).maybeSingle(),
      supabase.from('prp_cycles').select('*, prp_sessions(*)').eq('patient_id', patientId).order('created_at', { ascending: false }),
    ]);
    setPatient(p);
    setHt(htData);
    setPrpCycles((cycles ?? []).map((c) => ({
      ...c,
      prp_sessions: (c.prp_sessions ?? []).sort((a: PrpSession, b: PrpSession) => a.session_number - b.session_number),
    })));
    setLoading(false);
  }

  async function updateSessionStatus(session: PrpSession, status: SessionStatus) {
    const { error } = await supabase.from('prp_sessions').update({ status }).eq('id', session.id);
    if (error) return;
    fetchPatient();
  }

  async function saveReschedule() {
    if (!rescheduling) return;
    const { error } = await supabase.from('prp_sessions').update({
      scheduled_date: rescheduleDate,
      rescheduled_from: rescheduling.scheduled_date,
    }).eq('id', rescheduling.id);
    if (error) return;
    setRescheduling(null);
    fetchPatient();
  }

  async function saveFee() {
    if (!feeEditing) return;
    const { error } = await supabase.from('prp_sessions').update({
      fee_amount: feeAmount ? parseFloat(feeAmount) : 0,
      fee_paid: feePaid,
    }).eq('id', feeEditing.id);
    if (error) return;
    setFeeEditing(null);
    fetchPatient();
  }

  function openReschedule(session: PrpSession) {
    setRescheduling(session);
    setRescheduleDate(session.scheduled_date);
  }

  function openFeeEditor(session: PrpSession) {
    setFeeEditing(session);
    setFeeAmount(session.fee_amount ? String(session.fee_amount) : '');
    setFeePaid(session.fee_paid ?? false);
  }

  function openEdit() {
    if (!patient) return;
    setEditName(patient.full_name);
    setEditPhone(patient.phone ?? '');
    setEditAddress(patient.address ?? '');
    setEditServiceType(patient.service_type);
    setEditNotes(patient.medical_notes ?? '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!patient) return;
    setSavingEdit(true);
    const { error } = await supabase.from('patients').update({
      full_name: editName.trim(),
      phone: editPhone.trim() || null,
      address: editAddress.trim() || null,
      service_type: editServiceType,
      medical_notes: editNotes.trim() || null,
    }).eq('id', patient.id);
    setSavingEdit(false);
    if (error) return;
    setEditing(false);
    fetchPatient();
  }

  async function deletePatient() {
    if (!patient) return;
    if (!window.confirm(`${patient.full_name} adlı hastayı ve tüm seans kayıtlarını silmek istediğinizden emin misiniz?`)) return;
    setDeleting(true);
    const { error } = await supabase.from('patients').delete().eq('id', patient.id);
    setDeleting(false);
    if (error) return;
    onDeleted();
  }

  const prpProgress = useMemo(() => {
    const allSessions = prpCycles.flatMap((c) => c.prp_sessions);
    const completed = allSessions.filter((s) => s.status === 'completed').length;
    return { completed, total: allSessions.length };
  }, [prpCycles]);

  const totalFees = useMemo(() => {
    const allSessions = prpCycles.flatMap((c) => c.prp_sessions);
    const paid = allSessions.reduce((sum, s) => sum + Number(s.fee_amount || 0) * (s.fee_paid ? 1 : 0), 0);
    const unpaid = allSessions.reduce((sum, s) => sum + Number(s.fee_amount || 0) * (s.fee_paid ? 0 : 1), 0);
    return { paid, unpaid };
  }, [prpCycles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="inline-block w-8 h-8 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500">Hasta bulunamadı.</p>
        <button onClick={onBack} className="mt-4 text-blue-600 font-medium hover:underline">Geri dön</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-white transition-all">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-base sm:text-lg font-bold text-white flex-shrink-0">
            {patient.full_name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{patient.full_name}</h1>
            <p className="text-sm text-slate-500">Kayıt: {formatDate(patient.created_at.slice(0, 10))}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-lg px-3 py-2 transition-all"
          >
            <Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">Düzenle</span>
          </button>
          <button
            onClick={deletePatient}
            disabled={deleting}
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-lg px-3 py-2 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Sil</span>
          </button>
        </div>
      </div>

      {/* Patient Info */}
      <Card icon={<User className="w-5 h-5" />} title="Hasta Bilgileri" color="slate">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem icon={<Phone className="w-4 h-4" />} label="Telefon" value={patient.phone || 'Belirtilmedi'} />
          <InfoItem icon={<MapPin className="w-4 h-4" />} label="Adres" value={patient.address || 'Belirtilmedi'} />
          <InfoItem icon={<HeartPulse className="w-4 h-4" />} label="Hizmet Türü" value={
            patient.service_type === 'ht' ? 'Saç Ekimi' : patient.service_type === 'prp' ? 'PRP' : 'Ekim + PRP'
          } />
        </div>
        {patient.medical_notes && (
          <InfoItem icon={<HeartPulse className="w-4 h-4" />} label="Tıbbi Notlar / Alerjiler" value={patient.medical_notes} />
        )}
      </Card>

      {/* Hair Transplant */}
      {ht && (
        <Card icon={<Scissors className="w-5 h-5" />} title="Saç Ekimi" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem icon={<Calendar className="w-4 h-4" />} label="Operasyon Tarihi" value={formatDate(ht.operation_date)} />
            <InfoItem icon={<CreditCard className="w-4 h-4" />} label="Ödeme Yöntemi" value={
              ht.payment_method === 'cash' ? 'Nakit' : ht.payment_method === 'card' ? 'Kart' : 'Karma'
            } />
            <InfoItem icon={<Banknote className="w-4 h-4" />} label="Toplam Fiyat" value={
              ht.total_price != null ? `₺${Number(ht.total_price).toLocaleString('tr-TR')}` : 'Belirtilmedi'
            } />
          </div>
          {ht.payment_notes && (
            <InfoItem icon={<StickyNote className="w-4 h-4" />} label="Ödeme Notları" value={ht.payment_notes} />
          )}
        </Card>
      )}

      {/* PRP Cycles */}
      {prpCycles.length > 0 && (
        <div className="space-y-4">
          {/* Progress overview */}
          <Card icon={<Droplet className="w-5 h-5" />} title="PRP Tedavi İlerlemesi" color="emerald">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-600">Seans İlerlemesi</span>
                  <span className="text-sm font-bold text-emerald-600">{prpProgress.completed} / {prpProgress.total}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all"
                    style={{ width: `${prpProgress.total > 0 ? (prpProgress.completed / prpProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Fee summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-lg p-3">
                <p className="text-xs text-emerald-600 font-medium">Ödenen</p>
                <p className="text-lg font-bold text-emerald-700">₺{totalFees.paid.toLocaleString('tr-TR')}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-xs text-amber-600 font-medium">Bekleyen</p>
                <p className="text-lg font-bold text-amber-700">₺{totalFees.unpaid.toLocaleString('tr-TR')}</p>
              </div>
            </div>
          </Card>

          {/* Sessions per cycle */}
          {prpCycles.map((cycle, ci) => (
            <Card key={cycle.id} icon={<Droplet className="w-5 h-5" />} title={`PRP Döngüsü ${prpCycles.length > 1 ? ci + 1 : ''}`} color="emerald">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 text-center">
                <div className="bg-slate-50 rounded-lg py-2">
                  <p className="text-xs text-slate-500">Toplam Seans</p>
                  <p className="text-lg font-bold text-slate-800">{cycle.total_sessions}</p>
                </div>
                <div className="bg-slate-50 rounded-lg py-2">
                  <p className="text-xs text-slate-500">Aralık</p>
                  <p className="text-lg font-bold text-slate-800">{cycle.cycle_interval_days} gün</p>
                </div>
                <div className="bg-slate-50 rounded-lg py-2">
                  <p className="text-xs text-slate-500">Başlangıç</p>
                  <p className="text-sm font-bold text-slate-800 pt-1">{formatDate(cycle.start_date)}</p>
                </div>
                <div className="bg-emerald-50 rounded-lg py-2">
                  <p className="text-xs text-emerald-600">Toplam Fiyat</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {cycle.total_price != null ? `₺${Number(cycle.total_price).toLocaleString('tr-TR')}` : '—'}
                  </p>
                </div>
              </div>

              {/* Session list */}
              <div className="space-y-2">
                {cycle.prp_sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    patientName={patient.full_name}
                    patientPhone={patient.phone}
                    onStatusChange={(status) => updateSessionStatus(session, status)}
                    onReschedule={() => openReschedule(session)}
                    onEditFee={() => openFeeEditor(session)}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduling && (
        <Modal title="Seansı Yeniden Planla" onClose={() => setRescheduling(null)}>
          <p className="text-sm text-slate-500 mb-4">
            <span className="font-medium text-slate-700">Seans {rescheduling.session_number}</span> — {formatDate(rescheduling.scheduled_date)}
          </p>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Yeni Tarih</label>
          <input
            type="date"
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
          <div className="flex gap-2 mt-5">
            <button onClick={() => setRescheduling(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
              İptal
            </button>
            <button onClick={saveReschedule} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-all">
              <Save className="w-4 h-4" /> Kaydet
            </button>
          </div>
        </Modal>
      )}

      {/* Fee modal */}
      {feeEditing && (
        <Modal title="PRP Seans Ücreti" onClose={() => setFeeEditing(null)}>
          <p className="text-sm text-slate-500 mb-4">
            <span className="font-medium text-slate-700">Seans {feeEditing.session_number}</span> — {formatDate(feeEditing.scheduled_date)}
          </p>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Ücret Tutarı (₺)</label>
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="number"
              min={0}
              step="0.01"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <button
              type="button"
              onClick={() => setFeePaid(!feePaid)}
              className={`relative w-11 h-6 rounded-full transition-all ${feePaid ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${feePaid ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-slate-700">Ödendi olarak işaretle</span>
          </label>
          <div className="flex gap-2 mt-5">
            <button onClick={() => setFeeEditing(null)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
              İptal
            </button>
            <button onClick={saveFee} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-all">
              <Save className="w-4 h-4" /> Kaydet
            </button>
          </div>
        </Modal>
      )}

      {/* Edit patient modal */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Hastayı Düzenle</h3>
              <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Ad Soyad</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Telefon</label>
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="05XX XXX XX XX"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Adres</label>
                <input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Mahalle, Sokak, No..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">İşlem Türü</label>
                <select
                  value={editServiceType}
                  onChange={(e) => setEditServiceType(e.target.value as ServiceType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  <option value="ht">Saç Ekimi</option>
                  <option value="prp">PRP</option>
                  <option value="both">Ekim + PRP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tıbbi Notlar / Alerjiler</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm min-h-[70px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditing(false)} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">
                  İptal
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {savingEdit ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, patientName, patientPhone, onStatusChange, onReschedule, onEditFee }: {
  session: PrpSession;
  patientName: string;
  patientPhone: string | null;
  onStatusChange: (status: SessionStatus) => void;
  onReschedule: () => void;
  onEditFee: () => void;
}) {
  const completed = session.status === 'completed';
  const cancelled = session.status === 'cancelled';
  const overdue = session.status === 'scheduled' && isPast(session.scheduled_date) && !isToday(session.scheduled_date);
  const todaySession = session.status === 'scheduled' && isToday(session.scheduled_date);

  return (
    <div className={`flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded-xl border transition-all ${
      completed ? 'border-emerald-200 bg-emerald-50/50' :
      cancelled ? 'border-red-200 bg-red-50/30' :
      overdue ? 'border-amber-200 bg-amber-50/30' :
      todaySession ? 'border-blue-300 bg-blue-50/50' :
      'border-slate-200 bg-slate-50/50'
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
        completed ? 'bg-emerald-100 text-emerald-700' :
        cancelled ? 'bg-red-100 text-red-600' :
        'bg-slate-200 text-slate-600'
      }`}>
        {session.session_number}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-800">Seans {session.session_number}</span>
          {completed && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tamamlandı</span>}
          {cancelled && <span className="text-xs text-red-500 font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> İptal</span>}
          {overdue && <span className="text-xs text-amber-600 font-medium">Gecikmiş</span>}
          {todaySession && <span className="text-xs text-blue-600 font-medium">Bugün</span>}
          {session.rescheduled_from && <span className="text-xs text-slate-400">Yeniden planlandı</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(session.scheduled_date)}
          </span>
          {session.fee_amount != null && Number(session.fee_amount) > 0 && (
            <button onClick={onEditFee} className={`text-xs font-medium flex items-center gap-1 hover:underline ${
              session.fee_paid ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              <Banknote className="w-3 h-3" /> ₺{Number(session.fee_amount).toLocaleString('tr-TR')} {session.fee_paid ? 'ödendi' : 'bekliyor'}
            </button>
          )}
          {(!session.fee_amount || Number(session.fee_amount) === 0) && (
            <button onClick={onEditFee} className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1">
              <Banknote className="w-3 h-3" /> Ücret gir
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 ml-auto sm:ml-0">
        {!completed && !cancelled && patientPhone && (
          <a
            href={buildWhatsAppUrl(patientPhone, patientName)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all"
            title="WhatsApp hatırlatması gönder"
          >
            <WhatsAppIcon className="w-4 h-4" />
          </a>
        )}
        {!completed && !cancelled && (
          <>
            <button
              onClick={() => onStatusChange('completed')}
              className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-all"
              title="Tamamlandı olarak işaretle"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button
              onClick={onReschedule}
              className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-all"
              title="Yeniden planla"
            >
              <CalendarClock className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStatusChange('cancelled')}
              className="p-2 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition-all"
              title="İptal et"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        )}
        {completed && (
          <button
            onClick={() => onStatusChange('scheduled')}
            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all"
            title="Geri al"
          >
            <Clock className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function Card({ icon, title, color, children }: {
  icon: React.ReactNode;
  title: string;
  color: 'blue' | 'emerald' | 'slate';
  children: React.ReactNode;
}) {
  const colors = {
    blue: 'border-blue-200',
    emerald: 'border-emerald-200',
    slate: 'border-slate-200',
  };
  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${colors[color]} p-3 sm:p-5 space-y-4`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconColors[color]} flex items-center justify-center`}>
          {icon}
        </div>
        <h2 className="font-semibold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
        <span className="text-slate-400">{icon}</span>
        {label}
      </p>
      <p className="text-sm text-slate-800 bg-slate-50 rounded-lg px-3 py-2 break-words">{value}</p>
    </div>
  );
}

function Modal({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
