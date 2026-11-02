// =============================================
// Depot Navigator - Depo görevlisi için Bottom Tab navigasyonu
// =============================================

import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Ekranlar
import DashboardScreen from '../screens/shared/DashboardScreen';
import MaterialsScreen from '../screens/shared/MaterialsScreen';
import MaterialFormScreen from '../screens/shared/MaterialFormScreen';
import MaterialDetailScreen from '../screens/shared/MaterialDetailScreen';
import InvoicesScreen from '../screens/depot/InvoicesScreen';
import InvoiceFormScreen from '../screens/depot/InvoiceFormScreen';
import UnitsScreen from '../screens/shared/UnitsScreen';
import ReportsScreen from '../screens/shared/ReportsScreen';

export type DepotTabParamList = {
  DashboardTab: undefined;
  MaterialsTab: undefined;
  InvoicesTab: undefined;
  UnitsTab: undefined;
  ReportsTab: undefined;
};

const Tab = createBottomTabNavigator<DepotTabParamList>();
const Stack = createStackNavigator();

// Malzeme stack navigasyonu
const MaterialsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MaterialsList" component={MaterialsScreen} />
    <Stack.Screen name="MaterialDetail" component={MaterialDetailScreen} />
    <Stack.Screen name="MaterialForm" component={MaterialFormScreen} />
  </Stack.Navigator>
);

// Fatura stack navigasyonu
const InvoicesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="InvoicesList" component={InvoicesScreen} />
    <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} />
  </Stack.Navigator>
);

const DepotNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'DashboardTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'MaterialsTab':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'InvoicesTab':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'UnitsTab':
              iconName = focused ? 'resize' : 'resize-outline';
              break;
            case 'ReportsTab':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ title: 'Ana Sayfa' }}
      />
      <Tab.Screen
        name="MaterialsTab"
        component={MaterialsStack}
        options={{ title: 'Malzemeler' }}
      />
      <Tab.Screen
        name="InvoicesTab"
        component={InvoicesStack}
        options={{ title: 'Faturalar' }}
      />
      <Tab.Screen
        name="UnitsTab"
        component={UnitsScreen}
        options={{ title: 'Birimler' }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{ title: 'Raporlar' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 4,
    paddingBottom: 4,
    height: 60,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
});

export default DepotNavigator;
