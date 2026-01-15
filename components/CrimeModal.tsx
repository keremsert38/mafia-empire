import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { X, Zap, DollarSign, Clock, Lock, Star, Building, Globe, Users, ChevronRight } from 'lucide-react-native';
import { Crime } from '@/types/game';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with gaps

interface CrimeModalProps {
  visible: boolean;
  onClose: () => void;
  crimes: Crime[];
  playerLevel: number;
  activeCrimeTimeRemaining: number;
  isCommittingCrime: boolean;
  onCommitCrime: (crimeId: string) => { success: boolean; message: string; reward?: number; xp?: number };
}

// Crime images removed - using black backgrounds

export default function CrimeModal({ visible, onClose, crimes, playerLevel, activeCrimeTimeRemaining, isCommittingCrime, onCommitCrime }: CrimeModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<'street' | 'business' | 'political' | 'international'>('street');

  console.log('CrimeModal Render:', {
    visible,
    totalCrimes: crimes.length,
    selectedCategory,
    filteredCount: crimes.filter(c => c.category === selectedCategory).length
  });

  const categories = [
    { id: 'street', name: 'Sokak', icon: Users, color: '#ffa726' },
    { id: 'business', name: 'İş', icon: Building, color: '#66bb6a' },
    { id: 'political', name: 'Politik', icon: Star, color: '#ab47bc' },
    { id: 'international', name: 'Global', icon: Globe, color: '#ff6b6b' },
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
      case 'low': return 'DÜŞÜK';
      case 'medium': return 'ORTA';
      case 'high': return 'YÜKSEK';
      default: return 'DÜŞÜK';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}dk`;
    const hours = Math.floor(minutes / 60);
    return `${hours}sa ${minutes % 60}dk`;
  };

  const getCooldownRemaining = (crime: Crime) => {
    if (!crime.lastUsed) return 0;
    const timeSinceLastUse = (Date.now() - crime.lastUsed.getTime()) / 1000;
    return Math.max(0, crime.cooldown - timeSinceLastUse);
  };

  const handleCommitCrime = (crime: Crime) => {
    if (isCommittingCrime) {
      Alert.alert('İş İşleniyor', `Başka bir iş işliyorsunuz! ${activeCrimeTimeRemaining}s kaldı.`);
      return;
    }
    if (playerLevel < crime.requiredLevel) {
      Alert.alert('Seviye Yetersiz', `Bu iş için ${crime.requiredLevel}. seviyeye ulaşmalısınız!`);
      return;
    }
    const cooldownRemaining = getCooldownRemaining(crime);
    if (cooldownRemaining > 0) {
      Alert.alert('Bekleme', `Bu işi ${formatTime(Math.ceil(cooldownRemaining))} sonra tekrar yapabilirsiniz!`);
      return;
    }

    const result = onCommitCrime(crime.id);
    if (result.success) {
      Alert.alert('✓ İş Başlatıldı!', `${crime.name} işleniyor...\n⏱️ ${formatTime(crime.duration)}\n🎯 %${crime.successRate} başarı`);
    }
  };

  const filteredCrimes = crimes.filter(crime => crime.category === selectedCategory);
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>SUÇ İŞLE</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Category Tabs */}
          <View style={styles.categoryTabs}>
            {categories.map(category => {
              const IconComponent = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryTab,
                    isSelected && { backgroundColor: `${category.color}22`, borderColor: category.color }
                  ]}
                  onPress={() => setSelectedCategory(category.id as any)}
                >
                  <IconComponent size={16} color={isSelected ? category.color : '#666'} />
                  <Text style={[styles.categoryTabText, isSelected && { color: category.color }]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Active Crime Notice */}
          {isCommittingCrime && (
            <View style={styles.activeCrimeNotice}>
              <Clock size={18} color="#ffa726" />
              <Text style={styles.activeCrimeText}>İş işleniyor! {activeCrimeTimeRemaining}s kaldı</Text>
            </View>
          )}

          {/* Crimes Grid - 2 columns with image on top */}
          <ScrollView style={styles.crimesList} showsVerticalScrollIndicator={false}>
            <View style={styles.crimesGrid}>
              {filteredCrimes.map(crime => {
                const isLocked = playerLevel < crime.requiredLevel;
                const cooldownRemaining = getCooldownRemaining(crime);
                const isOnCooldown = cooldownRemaining > 0 || isCommittingCrime;
                const levelMultiplier = 1 + (playerLevel - crime.requiredLevel) * 0.1;
                const estimatedReward = Math.floor(crime.baseReward * Math.max(1, levelMultiplier));

                return (
                  <TouchableOpacity
                    key={crime.id}
                    style={[
                      styles.crimeCard,
                      isLocked && styles.lockedCard,
                      isOnCooldown && !isLocked && styles.cooldownCard
                    ]}
                    onPress={() => !isLocked && !isOnCooldown && handleCommitCrime(crime)}
                    disabled={isLocked || isOnCooldown}
                    activeOpacity={0.7}
                  >
                    {/* Top: Crime Image */}
                    <View style={styles.imageSection}>
                      {crime.imageUrl ? (
                        <Image
                          source={{ uri: crime.imageUrl }}
                          style={styles.crimeImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.crimeImagePlaceholder} />
                      )}
                      {/* Risk Badge */}
                      <View style={[styles.riskBadge, { backgroundColor: getRiskColor(crime.riskLevel || 'low') }]}>
                        <Text style={styles.riskText}>{getRiskText(crime.riskLevel || 'low')}</Text>
                      </View>
                      {/* Level Badge */}
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Lv.{crime.requiredLevel}</Text>
                      </View>
                      {/* Lock Overlay */}
                      {isLocked && (
                        <View style={styles.lockOverlay}>
                          <Lock size={32} color="#fff" />
                          <Text style={styles.lockText}>Seviye {crime.requiredLevel}</Text>
                        </View>
                      )}
                    </View>

                    {/* Bottom: Info */}
                    <View style={styles.infoSection}>
                      <Text style={styles.crimeName} numberOfLines={1}>{crime.name}</Text>

                      {/* Stats Row */}
                      <View style={styles.statsRow}>
                        <View style={styles.stat}>
                          <DollarSign size={12} color="#66bb6a" />
                          <Text style={styles.statValue}>${estimatedReward.toLocaleString()}</Text>
                        </View>
                        <View style={styles.stat}>
                          <Zap size={12} color="#e91e63" />
                          <Text style={styles.statValue}>{crime.energyCost}</Text>
                        </View>
                      </View>

                      {/* Duration & Success */}
                      <View style={styles.bottomRow}>
                        <View style={styles.stat}>
                          <Clock size={11} color="#29b6f6" />
                          <Text style={styles.durationText}>{formatTime(crime.duration)}</Text>
                        </View>
                        <Text style={[styles.successRate, { color: getRiskColor(crime.riskLevel || 'low') }]}>
                          %{crime.successRate}
                        </Text>
                      </View>
                    </View>

                    {/* Cooldown Overlay */}
                    {isOnCooldown && !isLocked && (
                      <View style={styles.cooldownOverlay}>
                        <Clock size={28} color="#ffa726" />
                        <Text style={styles.cooldownText}>
                          {isCommittingCrime ? `${activeCrimeTimeRemaining}s` : formatTime(Math.ceil(cooldownRemaining))}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#0d0d0d',
    borderRadius: 20,
    width: '95%',
    height: '88%',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d4af37',
    letterSpacing: 2,
  },
  closeButton: {
    padding: 5,
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryTabText: {
    color: '#666',
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeCrimeNotice: {
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  activeCrimeText: {
    color: '#ffa726',
    fontSize: 13,
    fontWeight: 'bold',
  },
  crimesList: {
    flex: 1,
  },
  crimesGrid: {
    padding: 12,
    gap: 12,
  },
  crimeCard: {
    width: '100%',
    backgroundColor: '#151515',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    overflow: 'hidden',
    marginBottom: 4,
  },
  lockedCard: {
    opacity: 0.6,
  },
  cooldownCard: {
    opacity: 0.7,
  },
  imageSection: {
    width: '100%',
    height: 140, // Banner style
    position: 'relative',
  },
  crimeImage: {
    width: '100%',
    height: '100%',
  },
  crimeImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  riskBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  levelBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  levelText: {
    color: '#d4af37',
    fontSize: 11,
    fontWeight: 'bold',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  infoSection: {
    padding: 12,
  },
  crimeName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
    padding: 8,
    borderRadius: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  durationText: {
    color: '#999',
    fontSize: 12,
  },
  successRate: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cooldownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cooldownText: {
    color: '#ffa726',
    fontSize: 20,
    fontWeight: 'bold',
  },
});