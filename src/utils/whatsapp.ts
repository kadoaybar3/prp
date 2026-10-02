export function buildWhatsAppUrl(phone: string, patientName: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '90' + cleaned.slice(1);
  } else if (!cleaned.startsWith('90') && !cleaned.startsWith('9')) {
    cleaned = '90' + cleaned;
  }
  const firstName = patientName.trim().split(/\s+/)[0];
  const message = `Merhaba ${firstName} Bey, görüşmemize istinaden PRP seans zamanınızı hatırlatmak istedik. Seansınızı ne zaman planlamak istersiniz? Müsait olduğunuz günü iletirseniz randevunuzu oluşturalım. Cevabınızı bekliyoruz.`;
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function getShortPatientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase()}.`;
}
