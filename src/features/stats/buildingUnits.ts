/**
 * Bina bazlı TOPLAM daire sayıları ARTIK koda gömülü DEĞİLDİR — her şirkete özel
 * olarak veritabanında (building_units tablosu) tutulur ve kullanıcı "Daire
 * Sayıları" ekranından girer/düzenler. Boş daire = toplam − dolu (aktif sözleşme).
 *
 * Bina listesi kullanıcının kendi sözleşmelerinden + kendi girdiği (DB) değerlerden
 * türetilir. Bu sabit yalnızca geriye dönük uyumluluk için boş bırakılmıştır;
 * BURAYA ŞİRKETE ÖZEL VERİ EKLEMEYİN (aksi halde tüm kullanıcılara sızar).
 */
export const BUILDING_UNITS: { name: string; total: number }[] = [];

