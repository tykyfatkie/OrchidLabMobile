import { StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#1F3D2F',
  white: '#FFFFFF',
  border: '#E5E7EB',
  borderActive: '#1F3D2F',
  placeholder: '#9CA3AF',
  textDark: '#374151',
  textMuted: '#6B7280',

  blue: '#2563EB',
  blueBg: '#DBEAFE',

  green: '#059669',
  greenBg: '#D1FAE5',

  red: '#DC2626',
  redBg: '#FEE2E2',

  amber: '#D97706',
  amberBg: '#FEF3C7',
  amberBorder: '#FDE68A',
  amberHighlight: '#F59E0B',

  filterGray: '#6B7280',
  filterGrayBorder: '#D1D5DB',
};

export const STATUS_FILTERS = [
  { key: '',      label: 'Tất cả',     color: COLORS.primary },
  { key: 'Ready', label: 'Sẵn sàng',  color: COLORS.green },
  { key: 'InUse', label: 'Đang dùng', color: COLORS.blue },
  { key: 'Full',  label: 'Đầy',       color: COLORS.amber },
];

export const METRIC_CARDS = {
  total:  { bg: COLORS.white,   iconColor: COLORS.primary, textColor: COLORS.primary },
  ready:  { bg: COLORS.greenBg, iconColor: COLORS.green,   textColor: COLORS.green },
  inUse:  { bg: COLORS.blueBg,  iconColor: COLORS.blue,    textColor: COLORS.blue },
  full:   { bg: COLORS.amberBg, iconColor: COLORS.amber,   textColor: COLORS.amber },
};

export const batchStyles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 3,
    color: COLORS.primary,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  searchWrapper: { marginBottom: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchBoxDefault: { borderColor: COLORS.border },
  searchBoxActive:  { borderColor: COLORS.borderActive },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.primary,
    paddingVertical: 0,
  },
  filterHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  filterHeaderText: { fontSize: 13, fontWeight: '600', color: COLORS.primary, marginLeft: 6 },
  filterScroll: { marginBottom: 14 },
  filterScrollContent: { paddingRight: 16 },
  chipActive: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginRight: 8, elevation: 3,
  },
  chipInactive: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, marginRight: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1.5, borderColor: COLORS.filterGrayBorder, elevation: 0,
  },
  chipTextActive:   { fontSize: 13, fontWeight: '700', color: COLORS.white },
  chipTextInactive: { fontSize: 13, fontWeight: '500', color: COLORS.textDark },
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2,
  },
  resultCount: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.redBg, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 8,
  },
  clearBtnText: { fontSize: 11, color: COLORS.red, fontWeight: '600', marginLeft: 3 },
  newestBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.amberBg, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    marginBottom: 8, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: COLORS.amberBorder,
  },
  newestBannerText: { fontSize: 11, fontWeight: '700', color: COLORS.amber, marginLeft: 4 },
  newestItemWrapper: {
    borderRadius: 30, borderWidth: 2,
    borderColor: COLORS.amberHighlight,
    shadowColor: COLORS.amberHighlight,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 5, overflow: 'hidden',
  },
  listSeparator: { height: 10 },
  emptyContainer: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },
});