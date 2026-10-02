import { useState, useMemo } from 'react';
import { User, Phone, HeartPulse, Scissors, Droplet, Calendar, CreditCard, StickyNote, Hash, Sparkles, Save, Check, Banknote, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ServiceType, PaymentMethod } from '@/types';
import { todayString, addDays, formatDate } from '@/utils/date';

interface NewPatientProps {
  onCreated: (patientId: string) => void;
}

export default function NewPatient({ onCreated }: NewPatientProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('prp');

  // HT fields
  const [htOperationDate, setHtOperationDate] = useState(todayString());
  const [htTotalPrice, setHtTotalPrice] = useState('');
  const [htPaymentMethod, setHtPaymentMethod] = useState<PaymentMethod>('cash');
  const [htPaymentNotes, setHtPaymentNotes] = useState('');

  // PRP fields
  const [prpTotalSessions, setPrpTotalSessions] = useState(4);
  const [prpCycleInterval, setPrpCycleInterval] = useState(30);
  const [prpStartDate, setPrpStartDate] = useState(todayString());
  const [prpTotalPrice, setPrpTotalPrice] = useState('');
  const [prpPaymentMethod, setPrpPaymentMethod] = useState<PaymentMethod>('cash');
  const [prpPaymentNotes, setPrpPaymentNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showHt = serviceType === 'ht' || serviceType === 'both';
  const showPrp = serviceType === 'prp' || serviceType === 'both';

  const prpDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 0; i < prpTotalSessions; i++) {
      dates.push(addDays(prpStartDate, i * prpCycleInterval));
    }
    return dates;
  }, [prpStartDate, prpTotalSessions, prpCycleInterval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Hasta adı zorunludur.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const { data: patient, error: pErr } = await supabase
        .from('patients')
        .insert({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          medical_notes: medicalNotes.trim() || null,
          service_type: serviceType,
        })
        .select()
        .single();

      if (pErr) throw pErr;
      if (!patient) throw new Error('Hasta oluşturulamadı');

      if (showHt) {
        const { error: htErr } = await supabase.from('hair_transplants').insert({
          patient_id: patient.id,
          operation_date: htOperationDate,
          total_price: htTotalPrice ? parseFloat(htTotalPrice) : null,
          payment_method: htPaymentMethod,
          payment_notes: htPaymentNotes.trim() || null,
        });
        if (htErr) throw htErr;
      }

      if (showPrp) {
        const { data: cycle, error: cErr } = await supabase
          .from('prp_cycles')
          .insert({
            patient_id: patient.id,
            total_sessions: prpTotalSessions,
            cycle_interval_days: prpCycleInterval,
            start_date: prpStartDate,
            total_price: prpTotalPrice ? parseFloat(prpTotalPrice) : null,
          })
          .select()
          .single();

        if (cErr) throw cErr;
        if (!cycle) throw new Error('PRP döngüsü oluşturulamadı');

        const perSessionFee = prpTotalPrice ? parseFloat(prpTotalPrice) / prpTotalSessions : 0;

        const sessions = prpDates.map((date, i) => ({
          prp_cycle_id: cycle.id,
          patient_id: patient.id,
          session_number: i + 1,
          scheduled_date: date,
          status: 'scheduled' as const,
          fee_amount: perSessionFee > 0 ? Math.round(perSessionFee * 100) / 100 : 0,
          fee_paid: false,
        }));

        const { error: sErr } = await supabase.from('prp_sessions').insert(sessions);
        if (sErr) throw sErr;
      }

      onCreated(patient.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const intervalPresets = [20, 30, 40];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Yeni Hasta Kaydı</h1>
        <p className="text-slate-500 text-sm mt-1">Yeni hasta oluşturun ve tedavi planını belirleyin</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Info */}
        <Section icon={<User className="w-5 h-5" />} title="Hasta Bilgileri" color="slate">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ad Soyad *" icon={<User className="w-4 h-4" />}>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClass}
                placeholder="Örn. Ahmet Yılmaz"
              />
            </Field>
            <Field label="Telefon" icon={<Phone className="w-4 h-4" />}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="05XX XXX XX XX"
              />
            </Field>
          </div>
          <Field label="Adres" icon={<MapPin className="w-4 h-4" />}>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              placeholder="Mahalle, Sokak, No..."
            />
          </Field>
          <Field label="Tıbbi Notlar / Alerjiler" icon={<HeartPulse className="w-4 h-4" />}>
            <textarea
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              className={`${inputClass} min-h-[80px] resize-y`}
              placeholder="Alerjiler, kronik hastalıklar, kullanılan ilaçlar..."
            />
          </Field>
        </Section>

        {/* Service Type */}
        <Section icon={<Sparkles className="w-5 h-5" />} title="Hizmet Türü" color="slate">
          <div className="grid grid-cols-3 gap-3">
            <ServiceToggle
              active={serviceType === 'ht'}
              onClick={() => setServiceType('ht')}
              label="Saç Ekimi"
              color="blue"
            />
            <ServiceToggle
              active={serviceType === 'prp'}
              onClick={() => setServiceType('prp')}
              label="PRP"
              color="emerald"
            />
            <ServiceToggle
              active={serviceType === 'both'}
              onClick={() => setServiceType('both')}
              label="İkisi Birden"
              color="slate"
            />
          </div>
        </Section>

        {/* Hair Transplant Section */}
        {showHt && (
          <Section icon={<Scissors className="w-5 h-5" />} title="Saç Ekimi Detayları" color="blue">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Operasyon Tarihi" icon={<Calendar className="w-4 h-4" />}>
                <input
                  type="date"
                  value={htOperationDate}
                  onChange={(e) => setHtOperationDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Toplam Fiyat / Anlaşma Tutarı (TL)" icon={<Banknote className="w-4 h-4" />}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={htTotalPrice}
                  onChange={(e) => setHtTotalPrice(e.target.value)}
                  className={inputClass}
                  placeholder="Örn. 50000"
                />
              </Field>
            </div>
            <Field label="Ödeme Yöntemi" icon={<CreditCard className="w-4 h-4" />}>
              <select
                value={htPaymentMethod}
                onChange={(e) => setHtPaymentMethod(e.target.value as PaymentMethod)}
                className={inputClass}
              >
                <option value="cash">Nakit</option>
                <option value="card">Kart</option>
                <option value="mixed">Karma</option>
              </select>
            </Field>
            <Field label="Ödeme Notları" icon={<StickyNote className="w-4 h-4" />}>
              <textarea
                value={htPaymentNotes}
                onChange={(e) => setHtPaymentNotes(e.target.value)}
                className={`${inputClass} min-h-[70px] resize-y`}
                placeholder="Peşinat, taksit planı, ödeme detayları..."
              />
            </Field>
            {htTotalPrice && (
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Toplam Tutar: <span className="font-bold">₺{parseFloat(htTotalPrice).toLocaleString('tr-TR')}</span>
                  {' '}— Ödeme: {htPaymentMethod === 'cash' ? 'Nakit' : htPaymentMethod === 'card' ? 'Kart' : 'Karma'}
                </span>
              </div>
            )}
          </Section>
        )}

        {/* PRP Section */}
        {showPrp && (
          <Section icon={<Droplet className="w-5 h-5" />} title="PRP Tedavi Planı" color="emerald">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Toplam Seans Sayısı" icon={<Hash className="w-4 h-4" />}>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={prpTotalSessions}
                  onChange={(e) => setPrpTotalSessions(Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputClass}
                />
              </Field>
              <Field label="Başlangıç Tarihi" icon={<Calendar className="w-4 h-4" />}>
                <input
                  type="date"
                  value={prpStartDate}
                  onChange={(e) => setPrpStartDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Döngü Aralığı (Gün)" icon={<Calendar className="w-4 h-4" />}>
                <input
                  type="number"
                  min={1}
                  value={prpCycleInterval}
                  onChange={(e) => setPrpCycleInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Toplam Fiyat / Anlaşma Tutarı (TL)" icon={<Banknote className="w-4 h-4" />}>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={prpTotalPrice}
                  onChange={(e) => setPrpTotalPrice(e.target.value)}
                  className={inputClass}
                  placeholder="Örn. 12000"
                />
              </Field>
              <Field label="Ödeme Yöntemi" icon={<CreditCard className="w-4 h-4" />}>
                <select
                  value={prpPaymentMethod}
                  onChange={(e) => setPrpPaymentMethod(e.target.value as PaymentMethod)}
                  className={inputClass}
                >
                  <option value="cash">Nakit</option>
                  <option value="card">Kart</option>
                  <option value="mixed">Karma</option>
                </select>
              </Field>
            </div>

            <Field label="Ödeme Notları" icon={<StickyNote className="w-4 h-4" />}>
              <textarea
                value={prpPaymentNotes}
                onChange={(e) => setPrpPaymentNotes(e.target.value)}
                className={`${inputClass} min-h-[70px] resize-y`}
                placeholder="Peşinat, taksit planı, ödeme detayları..."
              />
            </Field>

            {/* Interval presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Hızlı seçim:</span>
              {intervalPresets.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPrpCycleInterval(d)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                    prpCycleInterval === d
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {d} gün
                </button>
              ))}
            </div>

            {/* Price summary */}
            {prpTotalPrice && (
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="text-sm text-emerald-700">
                  Toplam: <span className="font-bold">₺{parseFloat(prpTotalPrice).toLocaleString('tr-TR')}</span>
                  {prpTotalSessions > 0 && (
                    <span className="ml-2 text-emerald-600">
                    </span>
                  )}
                </span>
              </div>
            )}

            {/* Session preview */}
            <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
              <p className="text-sm font-medium text-emerald-800 mb-3">Otomatik Planlanan Seanslar</p>
              <div className="space-y-2">
                {prpDates.map((date, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-slate-700">{formatDate(date)}</span>
                    {i === 0 && <span className="text-xs text-emerald-600 font-medium">İlk seans</span>}
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-medium px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Kaydediliyor...' : 'Hastayı Kaydet'}
            {saving ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all';

function Section({ icon, title, color, children }: {
  icon: React.ReactNode;
  title: string;
  color: 'blue' | 'emerald' | 'slate';
  children: React.ReactNode;
}) {
  const colors = {
    blue: 'border-blue-200 bg-blue-50/30',
    emerald: 'border-emerald-200 bg-emerald-50/30',
    slate: 'border-slate-200 bg-white',
  };
  const iconColors = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className={`rounded-2xl border ${colors[color]} p-5 space-y-4 shadow-sm`}>
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

function Field({ label, icon, children }: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
        <span className="text-slate-400">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

function ServiceToggle({ active, onClick, label, color }: {
  active: boolean;
  onClick: () => void;
  label: string;
  color: 'blue' | 'emerald' | 'slate';
}) {
  const activeColors = {
    blue: 'border-blue-500 bg-blue-50 text-blue-700 shadow-md shadow-blue-500/10',
    emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-500/10',
    slate: 'border-slate-700 bg-slate-700 text-white shadow-md shadow-slate-700/10',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-5 rounded-xl border-2 transition-all ${
        active ? activeColors[color] : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
