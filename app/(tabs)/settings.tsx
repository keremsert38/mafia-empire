import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { LogOut, User, Globe, Check, HelpCircle, Trash2 } from 'lucide-react-native';
import { useGameService } from '@/hooks/useGameService';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ProfileModal from '@/components/ProfileModal';
import HowToPlayModal from '@/components/HowToPlayModal';

export default function SettingsScreen() {
  const { gameService, playerStats } = useGameService();
  const { signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [howToPlayModalVisible, setHowToPlayModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const performLogout = async () => {
    console.log('🚪 PERFORMING DIRECT LOGOUT');
    try {
      console.log('🚪 CALLING SIGNOUT DIRECTLY');
      await signOut();
      console.log('🚪 SIGNOUT SUCCESS, REDIRECTING');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('🚪 LOGOUT ERROR:', error);
      Alert.alert(t.common.error, t.settings.logoutError);
    }
  };

  const handleLogout = async () => {
    console.log('🚪 LOGOUT BUTTON PRESSED');
    console.log('🚪 SHOWING ALERT DIALOG');

    // Platform kontrolü - Web için confirm, mobil için Alert
    if (Platform.OS === 'web') {
      const confirmed = confirm(t.settings.logoutConfirm);
      if (confirmed) {
        await performLogout();
      }
    } else {
      Alert.alert(
        t.settings.logoutTitle,
        t.settings.logoutConfirm,
        [
          { text: t.common.cancel, style: 'cancel' },
          {
            text: t.settings.logout,
            style: 'destructive',
            onPress: async () => {
              console.log('🚪 LOGOUT CONFIRMED');
              await performLogout();
            }
          },
        ]
      );
      console.log('🚪 ALERT DIALOG SHOWN');
    }
  };

  const handleLanguageSelect = async (lang: 'tr' | 'en') => {
    await setLanguage(lang);
    setLanguageModalVisible(false);
  };

  const handleDeleteAccount = async () => {
    const confirmTitle = language === 'tr' ? 'Hesabı Sil' : 'Delete Account';
    const confirmMessage = language === 'tr'
      ? 'Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz kalıcı olarak silinecektir.'
      : 'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.';
    const confirmButton = language === 'tr' ? 'Evet, Hesabımı Sil' : 'Yes, Delete My Account';

    if (Platform.OS === 'web') {
      const confirmed = confirm(confirmMessage);
      if (confirmed) {
        await performDeleteAccount();
      }
    } else {
      Alert.alert(
        confirmTitle,
        confirmMessage,
        [
          { text: t.common.cancel, style: 'cancel' },
          {
            text: confirmButton,
            style: 'destructive',
            onPress: performDeleteAccount
          },
        ]
      );
    }
  };

  const performDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(t.common.error, language === 'tr' ? 'Kullanıcı bulunamadı!' : 'User not found!');
        setDeleteLoading(false);
        return;
      }

      // RPC ile tüm kullanıcı verilerini sil
      const { data, error: rpcError } = await supabase.rpc('rpc_delete_my_account');

      if (rpcError) {
        console.error('RPC delete error:', rpcError);
        // Fallback: Manuel silme
        await supabase.from('soldier_production_queue').delete().eq('user_id', user.id);
        await supabase.from('chat_blocks').delete().eq('blocker_id', user.id);
        await supabase.from('chat_reports').delete().eq('reporter_id', user.id);
        await supabase.from('chat_messages').delete().eq('user_id', user.id);
        await supabase.from('user_soldiers').delete().eq('user_id', user.id);
        await supabase.from('user_businesses').delete().eq('user_id', user.id);
        await supabase.from('region_state').delete().eq('owner_user_id', user.id);
        await supabase.from('family_members').delete().eq('user_id', user.id);
        await supabase.from('player_stats').delete().eq('id', user.id);
      }

      // Oturumu kapat
      await signOut();

      Alert.alert(
        language === 'tr' ? 'Hesap Silindi' : 'Account Deleted',
        language === 'tr'
          ? 'Hesabınız ve tüm verileriniz başarıyla silindi. Bu hesapla artık giriş yapamazsınız.'
          : 'Your account and all data have been successfully deleted. You can no longer login with this account.',
        [{ text: t.common.ok || 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error) {
      console.error('Delete account error:', error);
      Alert.alert(
        t.common.error,
        language === 'tr' ? 'Hesap silinirken bir hata oluştu.' : 'An error occurred while deleting your account.'
      );
    } finally {
      setDeleteLoading(false);
    }
  };


  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightComponent,
    showArrow = true
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && !rightComponent && (
          <Text style={styles.arrow}>›</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t.settings.title}</Text>
      </View>

      {/* Profil Bölümü */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.profile}</Text>
        <SettingItem
          icon={<User size={20} color="#d4af37" />}
          title={t.settings.profileInfo}
          subtitle={t.settings.profileInfoSubtitle}
          onPress={() => setProfileModalVisible(true)}
        />
      </View>

      {/* Yardım ve Destek */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{language === 'tr' ? 'Yardım' : 'Help'}</Text>
        <SettingItem
          icon={<HelpCircle size={20} color="#4ecdc4" />}
          title={language === 'tr' ? 'Nasıl Oynanır?' : 'How to Play?'}
          subtitle={language === 'tr' ? 'Oyun rehberi ve ipuçları' : 'Game guide and tips'}
          onPress={() => setHowToPlayModalVisible(true)}
        />
      </View>

      {/* Dil ve Bölge */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.language}</Text>
        <SettingItem
          icon={<Globe size={20} color="#66bb6a" />}
          title={t.settings.language}
          subtitle={language === 'tr' ? t.languages.turkish : t.languages.english}
          onPress={() => setLanguageModalVisible(true)}
        />
      </View>

      {/* Hesap */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t.settings.account}</Text>
        <SettingItem
          icon={<LogOut size={20} color="#ff6b6b" />}
          title={t.settings.logout}
          subtitle={t.settings.logoutSubtitle}
          onPress={handleLogout}
        />
        <SettingItem
          icon={<Trash2 size={20} color="#ff4444" />}
          title={language === 'tr' ? 'Hesabı Sil' : 'Delete Account'}
          subtitle={language === 'tr' ? 'Hesabınızı kalıcı olarak silin' : 'Permanently delete your account'}
          onPress={handleDeleteAccount}
        />
      </View>

      {/* Versiyon Bilgisi */}
      <View style={styles.versionInfo}>
        <Text style={styles.versionText}>{t.settings.version}</Text>
        <Text style={styles.versionSubtext}>{t.settings.copyright}</Text>
      </View>

      <ProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
        playerStats={playerStats}
        onUpdateProfile={(updates) => gameService.updateProfile(updates)}
      />

      <HowToPlayModal
        visible={howToPlayModalVisible}
        onClose={() => setHowToPlayModalVisible(false)}
      />

      {/* Dil Seçim Modal */}
      <Modal
        visible={languageModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.languages.selectLanguage}</Text>

            <TouchableOpacity
              style={[styles.languageOption, language === 'tr' && styles.languageOptionSelected]}
              onPress={() => handleLanguageSelect('tr')}
            >
              <Text style={[styles.languageText, language === 'tr' && styles.languageTextSelected]}>
                {t.languages.turkish}
              </Text>
              {language === 'tr' && <Check size={20} color="#d4af37" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.languageOption, language === 'en' && styles.languageOptionSelected]}
              onPress={() => handleLanguageSelect('en')}
            >
              <Text style={[styles.languageText, language === 'en' && styles.languageTextSelected]}>
                {t.languages.english}
              </Text>
              {language === 'en' && <Check size={20} color="#d4af37" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>{t.common.close}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 10,
    marginHorizontal: 20,
  },
  settingItem: {
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    fontSize: 20,
    color: '#666',
    marginLeft: 10,
  },
  versionInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 20,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    borderColor: '#d4af37',
    backgroundColor: '#2a2a1a',
  },
  languageText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  languageTextSelected: {
    color: '#d4af37',
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#d4af37',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});