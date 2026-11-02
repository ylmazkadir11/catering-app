// =============================================
// Chef Navigator - Şef için Bottom Tab navigasyonu
// =============================================

import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Ekranlar
import DashboardScreen from '../screens/shared/DashboardScreen';
import RecipesScreen from '../screens/chef/RecipesScreen';
import RecipeFormScreen from '../screens/chef/RecipeFormScreen';
import MenuPlanningScreen from '../screens/chef/MenuPlanningScreen';
import MenuItemFormScreen from '../screens/chef/MenuItemFormScreen';
import ProductionScreen from '../screens/shared/ProductionScreen';
import ReportsScreen from '../screens/shared/ReportsScreen';

export type ChefTabParamList = {
  DashboardTab: undefined;
  RecipesTab: undefined;
  MenuTab: undefined;
  ProductionTab: undefined;
  ReportsTab: undefined;
};

const Tab = createBottomTabNavigator<ChefTabParamList>();
const Stack = createStackNavigator();

// Reçete stack navigasyonu
const RecipesStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="RecipesList" component={RecipesScreen} />
    <Stack.Screen name="RecipeForm" component={RecipeFormScreen} />
  </Stack.Navigator>
);

// Menü stack navigasyonu
const MenuStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MenuPlanning" component={MenuPlanningScreen} />
    <Stack.Screen name="MenuItemForm" component={MenuItemFormScreen} />
  </Stack.Navigator>
);

const ChefNavigator: React.FC = () => {
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
            case 'RecipesTab':
              iconName = focused ? 'book' : 'book-outline';
              break;
            case 'MenuTab':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'ProductionTab':
              iconName = focused ? 'construct' : 'construct-outline';
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
        name="RecipesTab"
        component={RecipesStack}
        options={{ title: 'Reçeteler' }}
      />
      <Tab.Screen
        name="MenuTab"
        component={MenuStack}
        options={{ title: 'Menü' }}
      />
      <Tab.Screen
        name="ProductionTab"
        component={ProductionScreen}
        options={{ title: 'Üretim' }}
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

export default ChefNavigator;
