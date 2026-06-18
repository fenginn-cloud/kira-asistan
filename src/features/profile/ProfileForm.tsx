import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  fullName: z.string().trim().min(1, 'Ad soyad zorunludur'),
  phone: z.string().trim().optional().default(''),
  email: z.string().trim().email('Geçerli bir e-posta girin'),
});

export type ProfileFormValues = z.infer<typeof schema>;

interface ProfileFormProps {
  defaultValues: ProfileFormValues;
  submitting?: boolean;
  onSubmit: (values: ProfileFormValues) => void;
}

export function ProfileForm({ defaultValues, submitting, onSubmit }: ProfileFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(schema), defaultValues });

  return (
    <View className="gap-3">
      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="Ad Soyad"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.fullName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <PhoneInput
            label="Telefon"
            value={value ?? ''}
            onChange={onChange}
            error={errors.phone?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <Input
            label="E-posta"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            keyboardType="email-address"
            error={errors.email?.message}
          />
        )}
      />
      <View className="mt-2">
        <Button label="Bilgileri Kaydet" onPress={handleSubmit(onSubmit)} loading={submitting} />
      </View>
    </View>
  );
}
