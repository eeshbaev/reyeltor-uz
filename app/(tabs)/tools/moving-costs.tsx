import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { TAB_BAR_CLEARANCE } from '@/components/navigation/FloatingTabBar';
import { IntegerInput } from '@/components/tools/IntegerInput';
import { MoneyInput } from '@/components/tools/MoneyInput';
import { ToolReportExport } from '@/components/tools/ToolReportExport';
import { ToolCard, ToolField, ToolPill, toolScreenStyles } from '@/components/tools/toolUi';
import { ScrollView } from '@/components/ui/GestureScrollView';
import { toolScreenBackground } from '@/lib/design/toolChrome';
import { spacing } from '@/lib/design/spacing';
import { useFormatPrice } from '@/lib/hooks/useFormatPrice';
import { buildMovingCostsReportHtml } from '@/lib/tools/instrumentReports';
import { calculateMovingCosts, type MovingCostLineItem, type MovingCostParams } from '@/lib/tools/movingCosts';
import { useTheme } from '@/lib/theme';

type RenovationLevel = MovingCostParams['renovationLevel'];

const RENOVATION_LEVELS: RenovationLevel[] = ['none', 'basic', 'medium', 'premium'];

export default function MovingCostsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { formatPrice } = useFormatPrice();

  const [transactionType, setTransactionType] = useState<'rent' | 'buy'>('rent');
  const [propertyPrice, setPropertyPrice] = useState(0);
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [areaM2, setAreaM2] = useState(0);
  const [renovationLevel, setRenovationLevel] = useState<RenovationLevel>('none');
  const [includesFurniture, setIncludesFurniture] = useState(false);
  const [rooms, setRooms] = useState(2);

  const result = useMemo(
    () =>
      calculateMovingCosts({
        transactionType,
        propertyPrice,
        monthlyRent,
        areaM2,
        renovationLevel,
        includesFurniture,
        rooms,
      }),
    [transactionType, propertyPrice, monthlyRent, areaM2, renovationLevel, includesFurniture, rooms],
  );

  const renovationLabel = (level: RenovationLevel) => {
    const key = `tools.movingCosts.renovation${level.charAt(0).toUpperCase()}${level.slice(1)}` as const;
    return t(key);
  };

  const movingItemLabel = useCallback(
    (item: MovingCostLineItem) => {
      if (item.key === 'renovation' && item.renovationLevel) {
        return t('tools.movingCosts.items.renovation', { level: renovationLabel(item.renovationLevel) });
      }
      return t(`tools.movingCosts.items.${item.key}`);
    },
    [t],
  );

  const movingItemNote = useCallback(
    (item: MovingCostLineItem) => t(`tools.movingCosts.notes.${item.noteKey}`, item.noteParams ?? {}),
    [t],
  );

  const canExport =
    transactionType === 'rent' ? monthlyRent > 0 : propertyPrice > 0 && areaM2 > 0;

  const buildReportHtml = useCallback(
    () =>
      buildMovingCostsReportHtml({
        labels: {
          title: t('tools.movingCosts.title'),
          tagline: t('tools.export.reportTagline'),
          generated: t('tools.export.reportGenerated'),
          footer: t('tools.export.reportFooter'),
          transactionType: t('tools.movingCosts.title'),
          monthlyRent: t('tools.rentVsBuy.monthlyRent'),
          price: t('tools.mortgage.price'),
          area: t('tools.movingCosts.area'),
          rooms: t('tools.movingCosts.rooms'),
          renovation: t('tools.movingCosts.renovation'),
          furniture: t('tools.movingCosts.furniture'),
          total: t('tools.movingCosts.total'),
          disclaimer: t('tools.movingCosts.disclaimer'),
          rent: t('tools.movingCosts.rent'),
          buy: t('tools.movingCosts.buy'),
          yes: t('common.yes'),
          no: t('common.no'),
        },
        transactionType,
        monthlyRent,
        propertyPrice,
        areaM2,
        rooms,
        renovationLabel: renovationLabel(renovationLevel),
        includesFurniture,
        formatPrice,
        result,
        itemLabel: movingItemLabel,
        itemNote: movingItemNote,
      }),
    [t, transactionType, monthlyRent, propertyPrice, areaM2, rooms, renovationLevel, includesFurniture, formatPrice, result, movingItemLabel, movingItemNote],
  );

  return (
    <ScrollView
      style={[toolScreenStyles.container, { backgroundColor: toolScreenBackground(theme) }]}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={toolScreenStyles.toggleRow}>
        <ToolPill label={t('tools.movingCosts.rent')} active={transactionType === 'rent'} onPress={() => setTransactionType('rent')} />
        <ToolPill label={t('tools.movingCosts.buy')} active={transactionType === 'buy'} onPress={() => setTransactionType('buy')} />
      </View>

      <ToolCard>
        {transactionType === 'rent' ? (
          <>
            <ToolField label={t('tools.rentVsBuy.monthlyRent')}>
              <MoneyInput value={monthlyRent} onChangeValue={setMonthlyRent} suffix="UZS" />
            </ToolField>
            <ToolField label={t('tools.movingCosts.area')}>
              <IntegerInput value={areaM2} onChangeValue={setAreaM2} suffix="m²" />
              <AppText variant="caption" color="secondary" style={toolScreenStyles.note}>
                {t('tools.movingCosts.areaHint')}
              </AppText>
            </ToolField>
          </>
        ) : (
          <>
            <ToolField label={t('tools.mortgage.price')}>
              <MoneyInput value={propertyPrice} onChangeValue={setPropertyPrice} suffix="UZS" />
            </ToolField>
            <ToolField label={t('tools.movingCosts.area')}>
              <IntegerInput value={areaM2} onChangeValue={setAreaM2} suffix="m²" />
            </ToolField>
          </>
        )}

        <ToolField label={t('tools.movingCosts.rooms')}>
          <IntegerInput
            value={rooms}
            onChangeValue={(value) => setRooms(Math.max(1, Math.round(value || 1)))}
          />
        </ToolField>

        <ToolField label={t('tools.movingCosts.renovation')}>
          <View style={toolScreenStyles.pills}>
            {RENOVATION_LEVELS.map((level) => (
              <ToolPill key={level} label={renovationLabel(level)} active={renovationLevel === level} onPress={() => setRenovationLevel(level)} />
            ))}
          </View>
        </ToolField>

        <View style={toolScreenStyles.switchRow}>
          <AppText variant="body">{t('tools.movingCosts.furniture')}</AppText>
          <Switch value={includesFurniture} onValueChange={setIncludesFurniture} trackColor={{ true: theme.colors.accent }} />
        </View>
      </ToolCard>

      <ToolCard>
        {result.items.map((item) => (
          <View key={item.key} style={toolScreenStyles.itemRow}>
            <View style={toolScreenStyles.itemLeft}>
              <AppText variant="body">{movingItemLabel(item)}</AppText>
              <AppText variant="caption" color="secondary">{movingItemNote(item)}</AppText>
            </View>
            <AppText variant="body">{formatPrice(item.amount)}</AppText>
          </View>
        ))}
        <View style={[toolScreenStyles.totalRow, { borderTopColor: theme.colors.border }]}>
          <AppText variant="h3">{t('tools.movingCosts.total')}</AppText>
          <AppText variant="h3" color="accent">{formatPrice(result.total)}</AppText>
        </View>
      </ToolCard>

      <AppText variant="caption" color="tertiary" style={toolScreenStyles.disclaimer}>
        {t('tools.movingCosts.disclaimer')}
      </AppText>

      <ToolReportExport
        visible={canExport && result.total > 0}
        title={t('tools.movingCosts.title')}
        buildHtml={buildReportHtml}
      />
    </ScrollView>
  );
}
