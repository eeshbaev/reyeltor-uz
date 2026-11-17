import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { spacing } from '@/lib/design/spacing';

interface PostFormChipRowProps {
  children: React.ReactNode;
  horizontal?: boolean;
}

export function PostFormChipRow({ children, horizontal = false }: PostFormChipRowProps) {
  if (horizontal) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowHorizontal}>
        {children}
      </ScrollView>
    );
  }

  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  rowHorizontal: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
