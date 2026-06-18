import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';

interface DateFieldProps {
  label?: string;
  /** ISO yyyy-MM-dd, or '' when empty. */
  value: string;
  onChange: (iso: string) => void;
  error?: string;
  optional?: boolean;
  minimumDate?: Date;
}

/**
 * Tap-to-pick date field. No free-text entry — the OS date picker guarantees a
 * valid gün/ay/yıl value. Stores ISO `yyyy-MM-dd`.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  optional,
  minimumDate,
}: DateFieldProps) {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState<Date>(new Date());

  const selected = value ? parseISO(value) : null;
  const display = selected
    ? format(selected, 'dd MMMM yyyy', { locale: tr })
    : 'Tarih seçin';

  const open = () => {
    setTemp(selected ?? new Date());
    setShow(true);
  };

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'ios') {
      if (date) setTemp(date);
      return;
    }
    // Android + web: dialog closes on selection.
    setShow(false);
    const picked = event.type ? event.type === 'set' : true;
    if (picked && date) onChange(format(date, 'yyyy-MM-dd'));
  };

  const confirmIOS = () => {
    onChange(format(temp, 'yyyy-MM-dd'));
    setShow(false);
  };

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-sm font-medium text-muted">{label}</Text>
      ) : null}

      <Pressable
        onPress={open}
        className={`h-14 flex-row items-center justify-between rounded-2xl border bg-surface px-4 ${
          error ? 'border-danger' : 'border-border'
        }`}
      >
        <Text className={`text-base ${selected ? 'text-[#0B1220]' : 'text-[#9CA3AF]'}`}>
          {display}
        </Text>
        <View className="flex-row items-center gap-3">
          {selected && optional ? (
            <Pressable onPress={() => onChange('')} hitSlop={8}>
              <X size={16} color="#9CA3AF" />
            </Pressable>
          ) : null}
          <Calendar size={18} color="#6B7280" />
        </View>
      </Pressable>

      {error ? <Text className="text-xs text-danger">{error}</Text> : null}

      {/* Android / web inline dialog */}
      {show && Platform.OS !== 'ios' ? (
        <DateTimePicker
          value={temp}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={onPickerChange}
        />
      ) : null}

      {/* iOS bottom-sheet with confirm */}
      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-surface p-4 pb-8">
              <View className="mb-1 flex-row items-center justify-between px-1">
                <Pressable onPress={() => setShow(false)} hitSlop={8}>
                  <Text className="text-base text-muted">Vazgeç</Text>
                </Pressable>
                <Text className="text-base font-bold text-[#0B1220]">Tarih Seç</Text>
                <Pressable onPress={confirmIOS} hitSlop={8}>
                  <Text className="text-base font-semibold text-primary-700">Tamam</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={temp}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                onChange={onPickerChange}
                themeVariant="light"
                locale="tr-TR"
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
