import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { ShareSheet, type ShareSheetRef } from '@/components/growth/ShareSheet';
import { Button } from '@/components/ui/Button';
import { spacing } from '@/lib/design/spacing';
import { toolCardStyle } from '@/lib/design/toolChrome';
import { quickShare } from '@/lib/growth/quickShare';
import { hapticLight } from '@/lib/haptics';
import { useTheme } from '@/lib/theme';
import { saveToolReportPdf } from '@/lib/tools/toolReport';

interface ToolReportExportProps {
  visible: boolean;
  title: string;
  buildHtml: () => Promise<string>;
  buildShareSummary?: () => string;
}

export function ToolReportExport({
  visible,
  title,
  buildHtml,
  buildShareSummary,
}: ToolReportExportProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const shareSheetRef = useRef<ShareSheetRef>(null);
  const [exporting, setExporting] = useState<'save' | null>(null);

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

  const handleOpenShare = useCallback(() => {
    if (exporting) return;
    const message =
      buildShareSummary?.() ??
      t('tools.export.shareMessage', { title });
    void quickShare(
      {
        title: t('growth.shareTitle'),
        message,
        pdf: {
          buildHtml,
          dialogTitle: title,
        },
      },
      shareSheetRef,
    );
  }, [buildHtml, buildShareSummary, exporting, t, title]);

  if (!visible) return null;

  return (
    <>
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
          onPress={handleOpenShare}
          disabled={exporting !== null}
          style={styles.btn}
          fullWidth={false}
        />
      </View>
      <ShareSheet ref={shareSheetRef} />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: 0, marginBottom: 0, padding: spacing.md },
  btn: { flex: 1 },
});
