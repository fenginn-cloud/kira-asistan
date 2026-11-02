import type {
  AppUser,
  Company,
  Contract,
  Payment,
  PaymentMethod,
  PaymentTransaction,
  TenantClaim,
} from '@/types';

/**
 * Repository contract. The mock implementation backs Phase 1; a Supabase
 * implementation will satisfy the same interface in Phase 2 with zero changes
 * to the feature hooks that consume it.
 */
export interface ContractRepository {
  list(): Promise<Contract[]>;
  getById(id: string): Promise<Contract | null>;
  create(input: Omit<Contract, 'id' | 'createdAt'>): Promise<Contract>;
  update(id: string, patch: Partial<Contract>): Promise<Contract>;
  remove(id: string): Promise<void>;
  /** Tenant-link token. Returns null if unavailable (e.g. migration not yet applied). */
  getPublicToken(id: string): Promise<string | null>;
  /**
   * Kira artışı / düzeltmesi: `effectiveMonth` ve sonrası yeni tutara geçer.
   * Önceki aylar eski tutarla korunur; tahsilatlara dokunulmaz.
   */
  applyRentChange(id: string, input: RentChangeInput): Promise<void>;
  /** Kiracı çıkışı: sözleşmeyi sonlandır + depozito iadesi/kesintisi kaydet. */
  terminate(id: string, input: TerminateInput): Promise<void>;
}

export interface RentChangeInput {
  effectiveMonth: string; // YYYY-MM-01
  rentAmount: number;
  duesAmount: number;
}

export interface TerminateInput {
  exitDate: string; // YYYY-MM-DD
  depositReturned: number;
  depositDeduction: number;
  depositNote: string | null;
}

export interface CollectInput {
  /** Gerçek ödeme satırı ya da sanal (`v:` önekli) beklenen ay. */
  paymentId: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod | null;
  description: string | null;
  receiptUrl: string | null;
  /**
   * Tekrar koruması: aynı işlem (çift tıklama / bağlantı tekrarı) aynı
   * anahtarla gelirse ikinci kayıt OLUŞMAZ.
   */
  clientRef: string;
}

export interface PaymentRepository {
  listByContract(contractId: string): Promise<Payment[]>;
  listAll(): Promise<Payment[]>;
  /**
   * Tahsilat kaydet (tüm ekranların TEK yolu). Sanal ay ise önce satırı
   * oluşturur. Aynı clientRef ikinci kez gelirse mevcut kaydı döndürür.
   */
  collect(input: CollectInput): Promise<{ transactionId: string }>;
  listTransactions(paymentId: string): Promise<PaymentTransaction[]>;
  listTransactionsByContract(contractId: string): Promise<PaymentTransaction[]>;
  /** Delete a single collection; the ledger recomputes automatically. */
  deleteTransaction(id: string): Promise<void>;
  /**
   * Bir ayın TÜM tahsilatlarını silip "ödenmedi"ye döndürür (açık onayla).
   */
  resetMonth(paymentId: string): Promise<void>;
  /** Takip öncesinden devreden borç (yeni sözleşmede bir kez). */
  addOpeningBalance(contract: Contract, amount: number): Promise<void>;
  /**
   * Excel senkron: bir ayı "ödendi" yap. Güvenli — mevcut ödeme/dekont varsa
   * DOKUNMAZ, asla "ödenmedi"ye çevirmez; yalnızca kalan borcu tahsil eder.
   */
  syncPaidMonth(input: {
    contractId: string;
    periodMonth: string; // 'YYYY-MM-01'
    amountDue: number;
    paymentDay: number;
  }): Promise<void>;
}

export interface CreateUserInput extends Omit<AppUser, 'id' | 'createdAt'> {
  /** Initial password for the new user's auth account. */
  password: string;
}

export interface UserRepository {
  list(): Promise<AppUser[]>;
  create(input: CreateUserInput): Promise<AppUser>;
  update(id: string, patch: Partial<AppUser>): Promise<AppUser>;
}

export interface CompanyRepository {
  getCurrent(): Promise<Company>;
  update(patch: Partial<Company>): Promise<Company>;
}

export interface ClaimsRepository {
  /** Tenant-reported payments awaiting owner approval (newest first). */
  listPending(): Promise<TenantClaim[]>;
  /** Approve: record the payment into the ledger + mark the claim approved. */
  approve(claim: TenantClaim, contract: Contract): Promise<void>;
  reject(id: string): Promise<void>;
}

export interface BuildingUnit {
  building: string;
  total: number;
}

export interface BuildingUnitsRepository {
  /** Şirketin bina→toplam daire ayarları. */
  list(): Promise<BuildingUnit[]>;
  /** Bir binanın toplam daire sayısını ekle/güncelle. */
  set(building: string, total: number): Promise<void>;
}

export type UnitStatus = 'occupied' | 'vacant';

export interface UnitDetails {
  areaM2: number | null;
  layout: string | null; // ör. "2+1"
  balcony: boolean;
  terrace: boolean;
  fixtures: string[]; // demirbaşlar
  note: string | null;
}

export interface Unit extends UnitDetails {
  id: string;
  building: string;
  block: string;
  unitLabel: string;
  status: UnitStatus;
  /** status='vacant' iken daire ne zamandan beri boş (YYYY-MM-DD). */
  vacantSince: string | null;
}

export interface UnitUpsertInput {
  building: string;
  block?: string;
  unitLabel: string;
  status?: UnitStatus;
  vacantSince?: string | null;
  note?: string | null;
}

export interface UnitsRepository {
  /** Şirketin tüm daire envanteri. */
  list(): Promise<Unit[]>;
  /** Daire ekle/güncelle. Çakışma (aynı bina+blok+etiket) korunur. */
  upsert(input: UnitUpsertInput): Promise<Unit>;
  /** Boş/dolu işaretle (vacantSince ile birlikte). */
  setStatus(id: string, status: UnitStatus, vacantSince?: string | null): Promise<void>;
  /** Daire detaylarını (m², oda tipi, balkon, teras, demirbaş, not) kaydet. */
  updateDetails(id: string, details: UnitDetails): Promise<void>;
  /** Daireyi envanterden sil. */
  remove(id: string): Promise<void>;
}

export interface DeviceSession {
  id: string;
  deviceToken: string;
  label: string;
  platform: string | null;
  lastActive: string;
  revoked: boolean;
}

export interface DeviceSessionRegisterInput {
  deviceToken: string;
  label: string;
  platform: string;
}

export interface DeviceSessionsRepository {
  /** Bu kullanıcının cihaz oturumları (en son aktif üstte). */
  list(): Promise<DeviceSession[]>;
  /** Bu cihazı kaydet/güncelle (giriş + açılışta). */
  register(input: DeviceSessionRegisterInput): Promise<void>;
  /** Bu cihazın son aktifliğini güncelle. */
  touch(deviceToken: string): Promise<void>;
  /** Bu cihaz iptal edildi mi (revoked) — kendi kendine çıkış için. */
  isRevoked(deviceToken: string): Promise<boolean>;
  /** Bir cihazı iptal et (o cihaz çevrimiçi olunca çıkış yapar). */
  revoke(id: string): Promise<void>;
  /** Kaydı sil. */
  remove(id: string): Promise<void>;
}

export interface Repositories {
  contracts: ContractRepository;
  payments: PaymentRepository;
  users: UserRepository;
  company: CompanyRepository;
  claims: ClaimsRepository;
  buildingUnits: BuildingUnitsRepository;
  units: UnitsRepository;
  deviceSessions: DeviceSessionsRepository;
}
