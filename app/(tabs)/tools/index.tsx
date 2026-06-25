import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { spacing } from '@/lib/design/spacing';
import { useAnimatedPress } from '@/lib/hooks/useAnimatedPress';
import { TOOL_CARDS } from '@/lib/tools/toolCards';
import { useTheme } from '@/lib/theme';

export default function ToolsHomeScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.md,
        paddingHorizontal: spacing.md,
        paddingBottom: insets.bottom + TAB_BAR_CLEARANCE,
      }}
    >
      <AppText variant="h1" style={styles.title}>
        {t('tools.title')}
      </AppText>
      <View style={styles.grid}>
        {TOOL_CARDS.map((tool) => (
          <ToolCard
            key={tool.key}
            cardKey={tool.key}
            icon={tool.icon}
            imageUri={tool.imageUri}
            title={t(tool.titleKey)}
            description={t(tool.descKey)}
            onPress={() => router.push(tool.route)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function ToolCard({
  cardKey,
  icon,
  imageUri,
  title,
  description,
  onPress,
}: {
  cardKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  imageUri: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const { scale, onPressIn, onPressOut, handlePress } = useAnimatedPress(onPress);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const gradientId = `tool-grad-${cardKey}`;

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut} onPress={handlePress} style={styles.cardWrap}>
      <Animated.View
        style={[styles.card, { transform: [{ scale }] }]}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setLayout({ width, height });
        }}
      >
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        {layout.width > 0 && layout.height > 0 ? (
          <Svg width={layout.width} height={layout.height} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0.12" />
                <Stop offset="0.45" stopColor="#000000" stopOpacity="0.38" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0.84" />
              </LinearGradient>
            </Defs>
            <Rect width={layout.width} height={layout.height} fill={`url(#${gradientId})`} />
          </Svg>
        ) : null}

        <View style={styles.cardContent}>
          <View style={styles.iconBadge}>
            <Ionicons name={icon} size={22} color="#FFFFFF" />
          </View>
          <View style={styles.cardSpacer} />
          <AppText variant="h3" style={styles.cardTitle}>
            {title}
          </AppText>
          <AppText variant="caption" style={styles.cardDescription} numberOfLines={3}>
            {description}
          </AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { marginBottom: spacing.lg },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardWrap: { width: '47%', flexGrow: 1 },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 168,
    backgroundColor: '#1A1A1A',
  },
  cardContent: {
    flex: 1,
    minHeight: 168,
    padding: 14,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.28)',
  },
  cardSpacer: { flex: 1, minHeight: spacing.sm },
  cardTitle: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: 18,
  },
});
