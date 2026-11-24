import { Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Mail, MessageCircle, ShieldCheck } from 'lucide-react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { LEGAL_LINKS, SUPPORT_EMAIL } from '@/content/legal';
import { SUPPORT_WHATSAPP_DISPLAY, whatsappSupportUrl } from '@/content/support';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { palette } from '@/lib/theme/colors';

/** Destek: WhatsApp, e-posta, yasal metinler. (Profil → Destek) */
export default function SupportScreen() {
  const router = useRouter();
  const entitlement = useEntitlement();
  const isBusiness = entitlement.plan === 'business';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Destek" />
        <Text className="mt-2 text-sm leading-5 text-muted">
          {isBusiness
            ? 'Business üyesi olarak öncelikli canlı destek hattımızdan bize 7/24 yazabilirsiniz.'
            : 'Takıldığınız her konuda bize yazın; en kısa sürede dönüş yaparız.'}
        </Text>

        <ListGroup title="Bize ulaşın">
          <ListRow
            first
            icon={MessageCircle}
            iconColor="#16A34A"
            iconBg="bg-success-soft"
            title={isBusiness ? 'WhatsApp canlı destek · 7/24' : 'WhatsApp destek'}
            subtitle={SUPPORT_WHATSAPP_DISPLAY}
            onPress={() => Linking.openURL(whatsappSupportUrl())}
          />
          <ListRow
            icon={Mail}
            title="E-posta"
            subtitle={SUPPORT_EMAIL}
            onPress={() =>
              Linking.openURL(
                `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Kira Asistan destek')}`
              )
            }
          />
        </ListGroup>

        <ListGroup title="Yasal">
          {LEGAL_LINKS.map((l, i) => (
            <ListRow
              key={l.slug}
              first={i === 0}
              icon={ShieldCheck}
              iconColor={palette.muted}
              iconBg="bg-background"
              title={l.title}
              onPress={() => router.push(`/yasal/${l.slug}` as Href)}
            />
          ))}
        </ListGroup>

        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}
