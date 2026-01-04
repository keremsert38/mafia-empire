import { Tabs } from 'expo-router';
import { Crown, Map, Users, Settings, Building } from 'lucide-react-native';
import { View, Text } from 'react-native';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { useGameService } from '@/hooks/useGameService';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TabLayout() {
  const { playerStats } = useGameService();
  const { t } = useLanguage();
  const currentXp = playerStats.experience;
  const nextLevelXp = playerStats.experienceToNext;
  const progress = Math.max(0, Math.min(1, nextLevelXp ? currentXp / nextLevelXp : 0));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(0, 0, 0, 0.98)',
          borderTopColor: '#d4af37',
          borderTopWidth: 2,
        },
        tabBarActiveTintColor: '#d4af37',
        tabBarInactiveTintColor: '#666',
        tabBarBackground: () => (
          <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.98)', flex: 1 }} />
        ),
        tabBarLabelStyle: { fontWeight: '600' },
      }}
      sceneContainerStyle={{ backgroundColor: '#000000' }}
      tabBar={(props) => (
        <View>
          {/* XP Bar */}
          <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.98)', paddingHorizontal: 16, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: '#d4af37', fontWeight: '700' }}>XP</Text>
              <Text style={{ color: '#ccc', fontWeight: '600' }}>{currentXp} / {nextLevelXp}</Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#2a2a2a', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#333' }}>
              <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: '#d4af37' }} />
            </View>
          </View>
          {/* Default Tabs */}
          <View style={{ borderTopColor: '#333', borderTopWidth: 1 }}>
            <BottomTabBar {...props} />
          </View>
        </View>
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.home.empireStatus,
          tabBarIcon: ({ size, color }) => (
            <Crown size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="territory"
        options={{
          title: t.territory.title,
          tabBarIcon: ({ size, color }) => (
            <Map size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="businesses"
        options={{
          title: t.businesses.title,
          tabBarIcon: ({ size, color }) => (
            <Building size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: t.home.family,
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.settings.title,
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}