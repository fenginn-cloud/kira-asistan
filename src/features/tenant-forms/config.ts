import type { TenantFormResult, TenantFormStatus } from '@/types';

export const STATUS_LABELS: Record<TenantFormStatus, string> = {
  pending: 'Bekleniyor',
  completed: 'Tamamlandı',
  reviewed: 'Değerlendirildi',
  expired: 'Süresi Doldu',
};

export const STATUS_COLORS: Record<TenantFormStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-warning-soft', text: 'text-warning' },
  completed: { bg: 'bg-primary-50', text: 'text-primary-700' },
  reviewed: { bg: 'bg-success-soft', text: 'text-success' },
  expired: { bg: 'bg-danger-soft', text: 'text-danger' },
};

export const RESULT_LABELS: Record<TenantFormResult, string> = {
  suitable: 'Uygun',
  need_docs: 'Ek Belge Gerekli',
  unsuitable: 'Uygun Değil',
  unrated: 'Değerlendirilmedi',
};

export const RESULT_COLORS: Record<TenantFormResult, { bg: string; text: string }> = {
  suitable: { bg: 'bg-success-soft', text: 'text-success' },
  need_docs: { bg: 'bg-warning-soft', text: 'text-warning' },
  unsuitable: { bg: 'bg-danger-soft', text: 'text-danger' },
  unrated: { bg: 'bg-background', text: 'text-muted' },
};

// ---------------------------------------------------------------------------
// Form şeması — public form (giriş) ve detay ekranı (okuma) ortak kullanır.
// ---------------------------------------------------------------------------

export type FieldType =
  | 'text'
  | 'textarea'
  | 'tel'
  | 'email'
  | 'date'
  | 'number'
  | 'money'
  | 'bool'
  | 'select';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  /** Yalnızca başka bir alanın değerine göre gösterilir. */
  showIf?: { key: string; equals: unknown };
}

export interface StepDef {
  /** responses içindeki grup anahtarı (personal, employment, ...). */
  key: string;
  title: string;
  fields: FieldDef[];
  /** Bu adımda araç ekleme bileşeni gösterilsin mi (Adım 2). */
  vehicles?: boolean;
  /** Bu adımda gelir belgesi yükleme gösterilsin mi (Adım 4). */
  documents?: boolean;
}

const MARITAL = ['Bekar', 'Evli', 'Boşanmış', 'Dul', 'Diğer'];
const WORK_TYPE = ['Maaşlı', 'Serbest', 'Şirket Sahibi', 'Diğer'];
const MOVE_REASON = ['İş', 'Eğitim', 'Aile', 'Evlilik', 'Yatırım', 'Diğer'];

export const FORM_STEPS: StepDef[] = [
  {
    key: 'personal',
    title: 'Kişisel Bilgiler',
    fields: [
      { key: 'fullName', label: 'Ad Soyad', type: 'text' },
      { key: 'birthDate', label: 'Doğum Tarihi', type: 'date' },
      { key: 'phone', label: 'Telefon', type: 'tel' },
      { key: 'email', label: 'E-posta', type: 'email' },
      { key: 'currentAddress', label: 'Mevcut Adres', type: 'textarea' },
      { key: 'maritalStatus', label: 'Medeni Durum', type: 'select', options: MARITAL },
      { key: 'householdSize', label: 'Evde Kaç Kişi Yaşayacak?', type: 'number' },
      { key: 'childrenCount', label: 'Çocuk Sayısı', type: 'number' },
      { key: 'hasPet', label: 'Evcil Hayvan Var mı?', type: 'bool' },
      { key: 'otherResidents', label: 'Evde Yaşayacak Diğer Kişiler', type: 'textarea' },
    ],
  },
  {
    key: 'vehicle',
    title: 'Araç Bilgileri',
    vehicles: true,
    fields: [{ key: 'hasVehicle', label: 'Aracınız var mı?', type: 'bool' }],
  },
  {
    key: 'emergency',
    title: 'Acil Durumda Ulaşılacak Kişi',
    fields: [
      { key: 'fullName', label: 'Ad Soyad', type: 'text' },
      { key: 'relation', label: 'Yakınlık Derecesi', type: 'text' },
      { key: 'phone', label: 'Telefon', type: 'tel' },
      { key: 'altPhone', label: 'Alternatif Telefon', type: 'tel' },
      { key: 'address', label: 'Adres', type: 'textarea' },
    ],
  },
  {
    key: 'employment',
    title: 'İş ve Gelir Bilgileri',
    documents: true,
    fields: [
      { key: 'company', label: 'Çalıştığı Firma/Kurum', type: 'text' },
      { key: 'position', label: 'Görevi', type: 'text' },
      { key: 'startDate', label: 'İşe Başlama Tarihi', type: 'date' },
      { key: 'workType', label: 'Çalışma Şekli', type: 'select', options: WORK_TYPE },
      { key: 'netIncome', label: 'Aylık Net Gelir', type: 'money' },
      { key: 'extraIncome', label: 'Ek Gelir', type: 'money' },
      { key: 'workPhone', label: 'İş Yeri Telefonu', type: 'tel' },
      { key: 'workAddress', label: 'İş Yeri Adresi', type: 'textarea' },
      { key: 'hasIncomeDoc', label: 'Gelir Belgesi Var mı?', type: 'bool' },
    ],
  },
  {
    key: 'previousRental',
    title: 'Önceki Kiralık Ev Bilgileri',
    fields: [
      { key: 'address', label: 'Önceki Ev Adresi', type: 'textarea' },
      { key: 'duration', label: 'Önceki Evde Oturma Süresi', type: 'text' },
      { key: 'rentAmount', label: 'Önceki Kira Tutarı', type: 'money' },
      { key: 'landlordName', label: 'Önceki Ev Sahibi', type: 'text' },
      { key: 'landlordPhone', label: 'Ev Sahibinin Telefonu', type: 'tel' },
      { key: 'hadPaymentIssues', label: 'Kira Ödemelerinde Sorun Yaşandı mı?', type: 'bool' },
      { key: 'hadLegalIssues', label: 'Tahliye/İcra/Hukuki Uyuşmazlık Yaşandı mı?', type: 'bool' },
      { key: 'leaveReason', label: 'Önceki Evden Ayrılma Nedeni', type: 'textarea' },
      { key: 'referenceAvailable', label: 'Önceki Ev Sahibinden Referans Alınabilir mi?', type: 'bool' },
    ],
  },
  {
    key: 'moving',
    title: 'Taşınma ve Referans',
    fields: [
      { key: 'yearsInCity', label: 'Bu şehirde ne zamandır yaşıyor?', type: 'text' },
      { key: 'reasonInCity', label: 'Şehre geliş nedeni', type: 'select', options: MOVE_REASON },
      { key: 'previousCity', label: 'Önceki Yaşadığı Şehir', type: 'text' },
      { key: 'movingReason', label: 'Mevcut Evden Taşınma Nedeni', type: 'textarea' },
      { key: 'refName', label: 'Referans — Ad Soyad', type: 'text' },
      { key: 'refRelation', label: 'Referans — Yakınlık / İlişki', type: 'text' },
      { key: 'refPhone', label: 'Referans — Telefon', type: 'tel' },
      { key: 'refJob', label: 'Referans — Meslek', type: 'text' },
      { key: 'refAddress', label: 'Referans — Adres', type: 'textarea' },
      { key: 'refKnownDuration', label: 'Kiracıyı Ne Kadar Zamandır Tanıyor?', type: 'text' },
      { key: 'refNote', label: 'Referans Açıklaması', type: 'textarea' },
    ],
  },
  {
    key: 'rentalRequest',
    title: 'Kiralama Talebi',
    fields: [
      { key: 'property', label: 'Kiralanmak İstenen Taşınmaz', type: 'text' },
      { key: 'moveInDate', label: 'Planlanan Taşınma Tarihi', type: 'date' },
      { key: 'plannedYears', label: 'Kaç Yıl Oturmayı Planlıyor?', type: 'number' },
      { key: 'householdSize', label: 'Evde Kaç Kişi Yaşayacak?', type: 'number' },
      { key: 'paymentDayPref', label: 'Kira Ödeme Tarihi Tercihi', type: 'number' },
      { key: 'deposit', label: 'Depozito', type: 'money' },
      { key: 'hasGuarantor', label: 'Kefil Var mı?', type: 'bool' },
      {
        key: 'guarantorName',
        label: 'Kefil Ad Soyad',
        type: 'text',
        showIf: { key: 'hasGuarantor', equals: true },
      },
      {
        key: 'guarantorPhone',
        label: 'Kefil Telefon',
        type: 'tel',
        showIf: { key: 'hasGuarantor', equals: true },
      },
    ],
  },
];

/** Detay ekranında araç/belge grupları için etiketler. */
export const DOC_TYPE_LABELS: Record<string, string> = {
  payslip: 'Maaş Bordrosu',
  sgk: 'SGK Hizmet Dökümü',
  tax: 'Vergi Levhası',
  other: 'Diğer',
};
