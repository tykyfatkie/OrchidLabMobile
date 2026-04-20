import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 2,
  },
  backArrow: {
    fontSize: 22,
    color: '#15803D',
    fontWeight: '400',
    lineHeight: 24,
    marginTop: -1,
  },
  backText: {
    fontSize: 14,
    color: '#15803D',
    fontWeight: '500',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
  unreadBadge: {
    fontSize: 13,
    color: '#15803D',
    fontWeight: '500',
  },

  // List
  listContent: {
    paddingBottom: 32,
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Notification Item
  itemRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    paddingLeft: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  unreadBar: {
    width: 3,
    backgroundColor: '#22C55E',
    borderRadius: 2,
    marginRight: 14,
    marginVertical: 14,
  },
  unreadBarHidden: {
    backgroundColor: 'transparent',
  },
  itemContent: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 20,
  },
  itemContentRead: {
    opacity: 0.55,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  itemBody: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 6,
  },
  itemDate: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Misc
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