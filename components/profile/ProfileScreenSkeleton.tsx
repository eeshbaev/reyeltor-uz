import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export function ProfileScreenSkeleton() {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <Skeleton width={88} height={88} borderRadius={44} style={styles.avatar} />
      <Skeleton width="55%" height={24} style={styles.line} />
      <Skeleton width="70%" height={16} />
      <View style={[styles.card, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
        <Skeleton width="40%" height={18} />
        <Skeleton width="100%" height={48} style={{ marginTop: spacing.md }} />
      </View>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} width="100%" height={52} borderRadius={radius.lg} style={{ marginBottom: spacing.sm }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: spacing.lg },
  avatar: { marginBottom: spacing.md },
  line: { marginBottom: spacing.sm },
  card: {
    width: '100%',
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
