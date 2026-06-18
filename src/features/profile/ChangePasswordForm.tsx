import { useState } from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface ChangePasswordFormProps {
  submitting?: boolean;
  onSubmit: (current: string, next: string) => void;
}

export function ChangePasswordForm({ submitting, onSubmit }: ChangePasswordFormProps) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    if (!current.trim()) return setError('Mevcut şifrenizi girin.');
    if (next.length < 6) return setError('Yeni şifre en az 6 karakter olmalı.');
    if (next !== repeat) return setError('Yeni şifreler eşleşmiyor.');
    onSubmit(current, next);
    setCurrent('');
    setNext('');
    setRepeat('');
  };

  return (
    <View className="gap-3">
      <Input
        label="Mevcut Şifre"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        placeholder="••••••••"
      />
      <Input
        label="Yeni Şifre"
        value={next}
        onChangeText={setNext}
        secureTextEntry
        placeholder="••••••••"
      />
      <Input
        label="Yeni Şifre (Tekrar)"
        value={repeat}
        onChangeText={setRepeat}
        secureTextEntry
        placeholder="••••••••"
        error={error ?? undefined}
      />
      <View className="mt-2">
        <Button
          label="Şifreyi Güncelle"
          variant="secondary"
          onPress={handleSubmit}
          loading={submitting}
        />
      </View>
    </View>
  );
}
