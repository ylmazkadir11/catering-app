// =============================================
// Admin Navigator - Yönetici için Drawer + Bottom Tab navigasyonu
// Tüm modüllere erişim hakkına sahiptir
// =============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';

// Ekranlar
import DashboardScreen from '../screens/shared/DashboardScreen';
import MaterialsScreen from '../screens/shared/MaterialsScreen';
import MaterialFormScreen from '../screens/shared/MaterialFormScreen';
import MaterialDetailScreen from '../screens/shared/MaterialDetailScreen';
import UnitsScreen from '../screens/shared/UnitsScreen';
import InvoicesScreen from '../screens/depot/InvoicesScreen';
import InvoiceFormScreen from '../screens/depot/InvoiceFormScreen';
import RecipesScreen from '../screens/chef/RecipesScreen';
import RecipeFormScreen from '../screens/chef/RecipeFormScreen';
import MenuPlanningScreen from '../screens/chef/MenuPlanningScreen';
import MenuItemFormScreen from '../screens/chef/MenuItemFormScreen';
import ProductionScreen from '../screens/shared/ProductionScreen';
import ReportsScreen from '../screens/shared/ReportsScreen';
import UsersScreen from '../screens/admin/UsersScreen';
import UserFormScreen from '../screens/admin/UserFormScreen';
import LogsScreen from '../screens/admin/LogsScreen';

// Navigator tipleri
export type AdminTabParamList = {
  DashboardTab: undefined;
  MaterialsTab: undefined;
  ProductionTab: undefined;
  ReportsTab: undefined;
  MoreTab: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// Malzeme stack'i
const MaterialsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MaterialsList" component={MaterialsScreen} />
    <Stack.Screen name="MaterialDetail" component={MaterialDetailScreen} />
    <Stack.Screen name="MaterialForm" component={MaterialFormScreen} />
  </Stack.Navigator>
);

// Fatura stack'i
const InvoicesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="InvoicesList" component={InvoicesScreen} />
    <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} />
  </Stack.Navigator>
);

// Reçete stack'i
const RecipesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RecipesList" component={RecipesScreen} />
    <Stack.Screen name="RecipeForm" component={RecipeFormScreen} />
  </Stack.Navigator>
);

// Menü stack'i
const MenuStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MenuPlanning" component={MenuPlanningScreen} />
    <Stack.Screen name="MenuItemForm" component={MenuItemFormScreen} />
  </Stack.Navigator>
);

// Kullanıcı stack'i
const UsersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="UsersList" component={UsersScreen} />
    <Stack.Screen name="UserForm" component={UserFormScreen} />
  </Stack.Navigator>
);

// Admin Bottom Tab Navigator (Ana 5 sekme)
const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#FF6B35',
      tabBarInactiveTintColor: '#9E9E9E',
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ color, size, focused }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        if (route.name === 'DashboardTab') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'MaterialsTab') iconName = focused ? 'cube' : 'cube-outline';
        else if (route.name === 'ProductionTab') iconName = focused ? 'construct' : 'construct-outline';
        else if (route.name === 'ReportsTab') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
        else if (route.name === 'MoreTab') iconName = focused ? 'menu' : 'menu-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Ana Sayfa' }} />
    <Tab.Screen name="MaterialsTab" component={MaterialsStack} options={{ title: 'Malzemeler' }} />
    <Tab.Screen name="ProductionTab" component={ProductionScreen} options={{ title: 'Üretim' }} />
    <Tab.Screen name="ReportsTab" component={ReportsScreen} options={{ title: 'Raporlar' }} />
    <Tab.Screen name="MoreTab" component={UnitsScreen} options={{ title: 'Diğer' }} />
  </Tab.Navigator>
);

// Admin Drawer Navigator (Tüm modüller)
const AdminNavigator: React.FC = () => (
  <Drawer.Navigator
    screenOptions={{
      headerShown: false,
      drawerActiveTintColor: '#FF6B35',
      drawerInactiveTintColor: '#616161',
      drawerActiveBackgroundColor: '#FFF3EE',
      drawerStyle: { backgroundColor: '#FFFFFF' },
      drawerLabelStyle: { fontSize: 15, fontWeight: '500' },
    }}
  >
    <Drawer.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        title: 'Ana Sayfa',
        drawerIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="Materials"
      component={MaterialsStack}
      options={{
        title: 'Malzemeler',
        drawerIcon: ({ color }) => <Ionicons name="cube-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="Units"
      component={UnitsScreen}
      options={{
        title: 'Birimler',
        drawerIcon: ({ color }) => <Ionicons name="resize-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="Invoices"
      component={InvoicesStack}
      options={{
        title: 'Faturalar',
        drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="Recipes"
      component={RecipesStack}
      options={{
        title: 'Reçeteler',
        drawerIcon: ({ color }) => <Ionicons name="book-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="MenuPlanning"
      component={MenuStack}
      options={{
        title: 'Menü Planlama',
        drawerIcon: ({ color }) => <Ionicons name="calendar-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="Production"
      component={ProductionScreen}
      options={{
        title: 'Üretim',
        drawerIcon: ({ color }) => <Ionicons name="construct-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="Reports"
      component={ReportsScreen}
      options={{
        title: 'Raporlar',
        drawerIcon: ({ color }) => <Ionicons name="bar-chart-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="Users"
      component={UsersStack}
      options={{
        title: 'Kullanıcılar',
        drawerIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} />,
      }}
    />
    <Drawer.Screen
      name="Logs"
      component={LogsScreen}
      options={{
        title: 'Sistem Logları',
        drawerIcon: ({ color }) => <Ionicons name="list-outline" size={22} color={color} />,
      }}
    />
  </Drawer.Navigator>
);

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

export default AdminNavigator;
