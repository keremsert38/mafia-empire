import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { X, Zap, DollarSign, Clock, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Lock, Star, Building, Globe, Users } from 'lucide-react-native';
import { Crime } from '@/types/game';

interface CrimeModalProps {
  visible: boolean;
  onClose: () => void;
  crimes: Crime[];
  playerLevel: number;
  activeCrimeTimeRemaining: number;
  isCommittingCrime: boolean;
  onCommitCrime: (crimeId: string) => { success: boolean; message: string; reward?: number; xp?: number };
}

export default function CrimeModal({ visible, onClose, crimes, playerLevel, activeCrimeTimeRemaining, isCommittingCrime, onCommitCrime }: CrimeModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'street' | 'business' | 'political' | 'international'>('street');

  const categories = [
    { id: 'street', name: 'Sokak', icon: Users, color: '#ffa726' },
    { id: 'business', name: 'İş Dünyası', icon: Building, color: '#66bb6a' },
    { id: 'political', name: 'Politik', icon: Star, color: '#ab47bc' },
    { id: 'international', name: 'Uluslararası', icon: Globe, color: '#ff6b6b' },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#66bb6a';
      case 'medium': return '#ffa726';
      case 'high': return '#ff6b6b';
      default: return '#999';
    }
  };

  const getRiskText = (risk: string) => {
    switch (risk) {
      case 'low': return 'Düşük Risk';
      case 'medium': return 'Orta Risk';
      case 'high': return 'Yüksek Risk';
      default: return 'Bilinmiyor';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getCooldownRemaining = (crime: Crime) => {
    if (!crime.lastUsed) return 0;
    const timeSinceLastUse = (Date.now() - crime.lastUsed.getTime()) / 1000;
    return Math.max(0, crime.cooldown - timeSinceLastUse);
  };

  const handleCommitCrime = (crime: Crime) => {
    console.log('🔥 HANDLE COMMIT CRIME CALLED:', crime.name);

    if (isCommittingCrime) {
      Alert.alert('İş İşleniyor', `Şu anda başka bir İş işliyorsunuz! ${activeCrimeTimeRemaining} saniye kaldı.`);
      return;
    }

    if (playerLevel < crime.requiredLevel) {
      console.log('❌ Level requirement not met');
      Alert.alert('Seviye Yetersiz', `Bu İş için ${crime.requiredLevel}. seviyeye ulaşmalısınız!`);
      return;
    }

    const cooldownRemaining = getCooldownRemaining(crime);
    if (cooldownRemaining > 0) {
      console.log('❌ Crime on cooldown');
      Alert.alert('Bekleme Süresi', `Bu İşi ${Math.ceil(cooldownRemaining)} saniye sonra tekrar işleyebilirsiniz!`);
      return;
    }

    console.log('✅ All checks passed, showing confirmation dialog');

    // Execute the crime
    console.log('🔥 EXECUTING CRIME:', crime.name);
    try {
      const result = onCommitCrime(crime.id);
      console.log('🔥 CRIME EXECUTION RESULT:', result);

      if (result.success) {
        // Show success alert with details
        Alert.alert(
          '✓ İş Başlatıldı!',
          `${crime.name} işleniyor...\n\n⏱️ Süre: ${formatTime(crime.duration)}\n💵 Tahmini Kazanç: $${Math.floor(crime.baseReward * (1 + (playerLevel - crime.requiredLevel) * 0.1)).toLocaleString()}\n⭐ Tahmini XP: ${crime.baseXP}\n🎯 Başarı Oranı: %${crime.successRate}`,
          [{ text: 'Tamam', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('🔥 CRIME EXECUTION ERROR:', error);
    }
  };

  const filteredCrimes = crimes.filter(crime => crime.category === selectedCategory);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>İŞLER</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryTabs}>
            {categories.map(category => {
              const IconComponent = category.icon;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryTab,
                    selectedCategory === category.id && styles.activeCategoryTab,
                    { borderBottomColor: category.color }
                  ]}
                  onPress={() => setSelectedCategory(category.id as any)}
                >
                  <IconComponent
                    size={16}
                    color={selectedCategory === category.id ? category.color : '#666'}
                  />
                  <Text style={[
                    styles.categoryTabText,
                    selectedCategory === category.id && { color: category.color }
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Crimes List */}
          <ScrollView style={styles.crimesList}>
            {isCommittingCrime && (
              <View style={styles.activeCrimeNotice}>
                <Clock size={20} color="#ffa726" />
                <Text style={styles.activeCrimeText}>
                  Şu anda iş işliyorsunuz! {activeCrimeTimeRemaining} saniye kaldı.
                </Text>
              </View>
            )}

            {filteredCrimes.map(crime => {
              const isLocked = playerLevel < crime.requiredLevel;
              const cooldownRemaining = getCooldownRemaining(crime);
              const isOnCooldown = cooldownRemaining > 0 || isCommittingCrime;
              const levelMultiplier = 1 + (playerLevel - crime.requiredLevel) * 0.1;
              const estimatedReward = Math.floor(crime.baseReward * Math.max(1, levelMultiplier));
              const estimatedXP = Math.floor(crime.baseXP * Math.max(1, levelMultiplier));

              return (
                <View key={crime.id} style={[
                  styles.crimeCard,
                  isLocked && styles.lockedCard,
                  isOnCooldown && styles.cooldownCard
                ]}>
                  <View style={styles.crimeHeader}>
                    <View style={styles.crimeInfo}>
                      <Text style={[styles.crimeName, isLocked && styles.lockedText]}>
                        {crime.name}
                      </Text>
                      <Text style={[styles.crimeDescription, isLocked && styles.lockedText]}>
                        {crime.description}
                      </Text>
                    </View>
                    <View style={styles.crimeLevel}>
                      {isLocked ? (
                        <Lock size={20} color="#666" />
                      ) : isOnCooldown ? (
                        <Clock size={20} color="#ffa726" />
                      ) : (
                        <CheckCircle size={20} color="#66bb6a" />
                      )}
                    </View>
                  </View>

                  <View style={styles.crimeStats}>
                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                        <Clock size={14} color="#ffa726" />
                        <Text style={styles.statText}>{formatTime(crime.duration)}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Zap size={14} color="#e91e63" />
                        <Text style={styles.statText}>{crime.energyCost} enerji</Text>
                      </View>
                    </View>

                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.requirementText}>
                          Gerekli Seviye: {crime.requiredLevel}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={[styles.statText, { color: '#66bb6a' }]}>
                          %{crime.successRate} başarı
                        </Text>
                      </View>
                    </View>
                  </View>

                  {isLocked ? (
                    <View style={styles.lockedButton}>
                      <Lock size={16} color="#666" />
                      <Text style={styles.lockedButtonText}>
                        {crime.requiredLevel}. seviyede açılır
                      </Text>
                    </View>
                  ) : isOnCooldown ? (
                    <View style={styles.cooldownButton}>
                      <Clock size={16} color="#ffa726" />
                      <Text style={styles.cooldownButtonText}>
                        {isCommittingCrime ? `iş işleniyor (${activeCrimeTimeRemaining}s)` : `${Math.ceil(cooldownRemaining)}s kaldı`}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.commitButton}
                      onPress={() => {
                        console.log('🚨 COMMIT BUTTON PRESSED FOR:', crime.name);
                        handleCommitCrime(crime);
                      }}
                    >
                      <Text style={styles.commitButtonText}> Yap </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    width: '98%',
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  closeButton: {
    padding: 5,
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    margin: 15,
    borderRadius: 10,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeCategoryTab: {
    backgroundColor: '#333',
  },
  categoryTabText: {
    color: '#666',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  crimesList: {
    flex: 1,
    padding: 15,
  },
  crimeCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  lockedCard: {
    backgroundColor: '#1a1a1a',
    opacity: 0.6,
  },
  cooldownCard: {
    backgroundColor: '#2a1a1a',
    borderColor: '#ffa726',
  },
  crimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  crimeInfo: {
    flex: 1,
  },
  crimeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  crimeDescription: {
    fontSize: 13,
    color: '#ccc',
    lineHeight: 18,
  },
  lockedText: {
    color: '#666',
  },
  crimeLevel: {
    marginLeft: 10,
  },
  crimeStats: {
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  requirementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requirementText: {
    fontSize: 11,
    color: '#999',
  },
  levelRequirement: {
    fontSize: 11,
    color: '#ffa726',
    fontStyle: 'italic',
    marginTop: 4,
  },
  cooldownText: {
    fontSize: 11,
    color: '#999',
  },
  commitButton: {
    backgroundColor: '#d4af37',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  commitButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  lockedButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  lockedButtonText: {
    color: '#666',
    marginLeft: 5,
    fontSize: 12,
  },
  cooldownButton: {
    backgroundColor: '#3a2a1a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cooldownButtonText: {
    color: '#ffa726',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeCrimeNotice: {
    backgroundColor: '#2a1a1a',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffa726',
  },
  activeCrimeText: {
    color: '#ffa726',
    marginLeft: 10,
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
});