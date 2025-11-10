import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { X, Camera, Save, User, Calendar, Trophy, DollarSign } from 'lucide-react-native';
import { PlayerStats } from '@/types/game';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  playerStats: PlayerStats;
  onUpdateProfile: (updates: Partial<PlayerStats>) => { success: boolean; message: string };
}

export default function ProfileModal({ visible, onClose, playerStats, onUpdateProfile }: ProfileModalProps) {
  const [name, setName] = useState(playerStats.name);
  const [profileImage, setProfileImage] = useState(playerStats.profileImage || '');

  const handleSave = () => {
    const result = onUpdateProfile({ name, profileImage });
    Alert.alert(
      result.success ? 'Başarılı' : 'Hata',
      result.message,
      [{ text: 'Tamam', onPress: result.success ? onClose : undefined }]
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('tr-TR');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Profil Bilgileri</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Profil Fotoğrafı */}
            <View style={styles.avatarSection}>
              <Image
                source={{ uri: profileImage || 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop' }}
                style={styles.avatar}
              />
              <TouchableOpacity 
                style={styles.cameraButton}
                onPress={() => {
                  Alert.alert(
                    'Profil Fotoğrafı',
                    'Yeni profil fotoğrafı URL\'si girin:',
                    [
                      { text: 'İptal', style: 'cancel' },
                      { 
                        text: 'Varsayılan Kullan', 
                        onPress: () => setProfileImage('https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop')
                      },
                    ]
                  );
                }}
              >
                <Camera size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* İsim Düzenleme */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>Oyuncu Adı</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Oyuncu adınızı girin"
                placeholderTextColor="#666"
                maxLength={20}
              />
            </View>

            {/* İstatistikler */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>İstatistikler</Text>
              
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Trophy size={20} color="#d4af37" />
                  <Text style={styles.statLabel}>Rütbe</Text>
                  <Text style={styles.statValue}>{playerStats.rank}</Text>
                </View>
                <View style={styles.statItem}>
                  <User size={20} color="#4ecdc4" />
                  <Text style={styles.statLabel}>Seviye</Text>
                  <Text style={styles.statValue}>{playerStats.level}</Text>
                </View>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <DollarSign size={20} color="#66bb6a" />
                  <Text style={styles.statLabel}>Toplam Kazanç</Text>
                  <Text style={styles.statValue}>${formatNumber(playerStats.totalEarnings)}</Text>
                </View>
                <View style={styles.statItem}>
                  <Calendar size={20} color="#ffa726" />
                  <Text style={styles.statLabel}>Katılım</Text>
                  <Text style={styles.statValue}>{formatDate(playerStats.joinDate)}</Text>
                </View>
              </View>

              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Trophy size={20} color="#66bb6a" />
                  <Text style={styles.statLabel}>Kazanılan Savaş</Text>
                  <Text style={styles.statValue}>{playerStats.battlesWon}</Text>
                </View>
                <View style={styles.statItem}>
                  <Trophy size={20} color="#ff6b6b" />
                  <Text style={styles.statLabel}>Kaybedilen Savaş</Text>
                  <Text style={styles.statValue}>{playerStats.battlesLost}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Save size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    width: '95%',
    height: '90%',
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  closeButton: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#d4af37',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#d4af37',
    borderRadius: 15,
    padding: 8,
  },
  inputSection: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 3,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  saveButton: {
    backgroundColor: '#d4af37',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
  },
  saveButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});