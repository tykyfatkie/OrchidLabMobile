import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // ── Header ──────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  unreadBadge: {
    backgroundColor: '#22C55E',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Filter Tabs ─────────────────────────────────────
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#111827',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ── List ────────────────────────────────────────────
  listContent: {
    paddingBottom: 40,
  },

  // ── Section Header ──────────────────────────────────
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.2,
  },

  // ── Notification Item ────────────────────────────────
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingRight: 20,
    backgroundColor: '#FFFFFF',      // đã đọc: nền trắng thuần
  },
  itemRowUnread: {
    backgroundColor: '#F0FDF4',      // chưa đọc: nền xanh lá nhạt rõ ràng
  },

  // Dot indicator
  dotWrapper: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
    flexShrink: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },

  // Icon
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },

  // Content
  itemContent: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',           // chưa đọc: đậm
    color: '#111827',
    lineHeight: 20,
    flex: 1,
  },
  itemTitleRead: {
    fontWeight: '400',           // đã đọc: mảnh hơn
    color: '#6B7280',            // đã đọc: xám nhạt hơn
  },
  itemDate: {
    fontSize: 11,
    color: '#9CA3AF',
    flexShrink: 0,
    marginTop: 2,
  },
  itemDateUnread: {
    color: '#16A34A',            // chưa đọc: giờ màu xanh
    fontWeight: '600',
  },
  itemBody: {
    fontSize: 13,
    color: '#374151',            // chưa đọc: tối hơn
    lineHeight: 19,
  },
  itemBodyRead: {
    color: '#9CA3AF',            // đã đọc: xám nhạt
  },

  // ── Divider ─────────────────────────────────────────
  divider: {
    height: 0.5,
    backgroundColor: '#E5E7EB',
    marginLeft: 82,
    marginRight: 20,
  },

  // ── Misc ────────────────────────────────────────────
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    color: '#9CA3AF',
    fontSize: 15,
  },
});