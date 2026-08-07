import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as XLSX from 'xlsx';

export interface PickedWorkbook {
  workbook: XLSX.WorkBook;
  fileName: string;
}

const EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

/**
 * Yöneticinin cihazından Excel seçtirir ve renk-duyarlı okur (mobil + web).
 * İptal edilirse null döner.
 */
export async function pickWorkbook(): Promise<PickedWorkbook | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: EXCEL_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0]!;
  const fileName = asset.name ?? 'excel.xlsx';

  let workbook: XLSX.WorkBook;
  if (Platform.OS === 'web') {
    const res = await fetch(asset.uri);
    const buf = await res.arrayBuffer();
    workbook = XLSX.read(buf, { type: 'array', cellStyles: true });
  } else {
    const b64 = await new File(asset.uri).base64();
    workbook = XLSX.read(b64, { type: 'base64', cellStyles: true });
  }
  return { workbook, fileName };
}
