import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { radius } from '@/lib/design/radius';
import { spacing } from '@/lib/design/spacing';
import { useTheme } from '@/lib/theme';

export function PostFormSkeleton() {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <Skeleton width="50%" height={28} style={styles.title} />
      <Skeleton width="80%" height={16} />
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[styles.section, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
        >
          <Skeleton width="35%" height={18} />
          <Skeleton width="100%" height={44} borderRadius={radius.md} style={{ marginTop: spacing.md }} />
          <Skeleton width="100%" height={44} borderRadius={radius.md} style={{ marginTop: spacing.sm }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  title: { marginBottom: spacing.sm },
  section: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
});
