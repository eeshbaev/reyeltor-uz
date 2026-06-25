import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { toolCardStyle } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { hapticLight } from '@/lib/haptics';
import { saveToolReportPdf, shareToolReport } from '@/lib/tools/toolReport';
import { useTheme } from '@/lib/theme';

interface ToolReportExportProps {
  visible: boolean;
  title: string;
  buildHtml: () => Promise<string>;
}

export function ToolReportExport({ visible, title, buildHtml }: ToolReportExportProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [exporting, setExporting] = useState<'save' | 'share' | null>(null);

  const handleSave = useCallback(async () => {
    if (exporting) return;
    hapticLight();
    setExporting('save');
    try {
      const html = await buildHtml();
      await saveToolReportPdf(html, t('tools.export.savePdf'));
    } finally {
      setExporting(null);
    }
  }, [buildHtml, exporting, t]);

  const handleShare = useCallback(async () => {
    if (exporting) return;
    hapticLight();
    setExporting('share');
    try {
      const html = await buildHtml();
      await shareToolReport(html, title, t('tools.export.shareMessage', { title }));
    } finally {
      setExporting(null);
    }
  }, [buildHtml, exporting, title, t]);

  if (!visible) return null;

  return (
    <View style={[toolCardStyle(theme), styles.row]}>
      <Button
        label={t('tools.export.savePdf')}
        variant="secondary"
        onPress={handleSave}
        loading={exporting === 'save'}
        disabled={exporting !== null}
        style={styles.btn}
        fullWidth={false}
      />
      <Button
        label={t('tools.export.shareReport')}
        onPress={handleShare}
        loading={exporting === 'share'}
        disabled={exporting !== null}
        style={styles.btn}
        fullWidth={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: 0, marginBottom: 0, padding: spacing.md },
  btn: { flex: 1 },
});
