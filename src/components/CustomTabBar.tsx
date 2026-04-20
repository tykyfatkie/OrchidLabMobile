import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ClipboardList, BookOpen, FileText, Sprout, TestTube } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { styles } from '../styles/styles';

const TABS = [
  { id: 'tasks', label: 'Công việc', icon: ClipboardList, route: 'Tasks' },
  { id: 'logs', label: 'Nhật ký TN', icon: BookOpen, route: 'ExperimentLog' },
  { id: 'reports', label: 'Báo cáo', icon: FileText, route: 'Reports' },
  { id: 'batches', label: 'Lô nuôi cấy', icon: Sprout, route: 'Batches' },
  { id: 'samples', label: 'Mẫu', icon: TestTube, route: 'Samples' }, 
];

export const CustomTabBar = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();

  return (
    <View style={styles.tabBarContainer}>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = route.name === tab.route;

        return (
          <TouchableOpacity 
            key={tab.id} 
            style={styles.tabItem} 
            activeOpacity={0.7}
            onPress={() => {
              if (!isActive) {
                navigation.navigate(tab.route);
              }
            }}
          >
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              <Icon 
                size={22} 
                color={isActive ? '#A3F7BF' : '#8A9E92'} 
              />
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};