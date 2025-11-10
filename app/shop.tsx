import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  ShoppingCart,
  Zap,
  Crown,
  Star,
  CheckCircle,
  Sparkles,
} from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameService } from '@/hooks/useGameService';
import { RevenueCatService, MTPackage } from '@/services/RevenueCatService';

export default function ShopScreen() {
  const { t } = useLanguage();
  const { playerStats, gameService } = useGameService();
  const [mtPackages, setMTPackages] = useState<MTPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      const packages = await RevenueCatService.getInstance().getAvailablePackages();
      console.log('🛒 SHOP - Loaded packages:', packages);
      packages.forEach(pkg => {
        console.log(`📦 ${pkg.productId}: ${pkg.price} (${pkg.amount} MT)`);
      });
      setMTPackages(packages);
    } catch (error) {
      console.error('Failed to load packages:', error);
      // Fallback to V2 dummy packages
      setMTPackages([
        { id: 'mt_small', amount: 100, price: '$0.99', productId: 'mafia_v2_100' },
        { id: 'mt_medium', amount: 500, price: '$4.99', bonus: 50, productId: 'mafia_v2_500' },
        { id: 'mt_large', amount: 1200, price: '$9.99', bonus: 200, popular: true, productId: 'mafia_v2_1200' },
        { id: 'mt_xlarge', amount: 2500, price: '$19.99', bonus: 500, productId: 'mafia_v2_2500' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseMT = async (pkg: MTPackage) => {
    Alert.alert(
      t.shop.mtCoins,
      `${pkg.amount} MT ${pkg.bonus ? `+ ${pkg.bonus} Bonus` : ''}\n${t.shop.price}: ${pkg.price}`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.shop.buy,
          onPress: async () => {
            try {
              setIsPurchasing(pkg.id);
              const result = await RevenueCatService.getInstance().purchasePackage(pkg.productId);
              
              if (result.success && result.amount) {
                // MT Coins'i kullanıcıya ekle
                const addResult = await gameService.addMTCoins(result.amount, result.bonus || 0);
                
                if (addResult.success) {
                  Alert.alert(
                    t.common.success,
                    addResult.message
                  );
                } else {
                  Alert.alert(t.common.error, addResult.message);
                }
                
                // Shop'u yenile
                loadPackages();
              } else {
                Alert.alert(t.common.error, result.error || t.shop.purchaseFailed);
              }
            } catch (error) {
              console.error('Purchase error:', error);
              Alert.alert(t.common.error, t.shop.purchaseFailed);
            } finally {
              setIsPurchasing(null);
            }
          },
        },
      ]
    );
  };


  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t.shop.mtPackages}</Text>
        <View style={styles.mtBalance}>
          <Zap size={20} color="#ffa726" />
          <Text style={styles.mtBalanceText}>{playerStats.mtCoins || 0} MT</Text>
        </View>
      </View>

      {/* MT Packages - Modern 2x2 Grid */}
      <View style={styles.packagesContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>{t.common.loading}...</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {mtPackages.map((pkg) => (
              <TouchableOpacity 
                key={pkg.id} 
                style={[
                  styles.packageCard,
                  pkg.popular && styles.packageCardPopular
                ]}
                onPress={() => handlePurchaseMT(pkg)}
                disabled={isPurchasing === pkg.id}
                activeOpacity={0.8}
              >
                {pkg.popular && (
                  <View style={styles.popularBadge}>
                    <Star size={10} color="#fff" fill="#fff" />
                  </View>
                )}
                
                <Zap size={32} color={pkg.popular ? "#d4af37" : "#ffa726"} />
                
                <Text style={styles.packageAmount}>{pkg.amount}</Text>
                <Text style={styles.mtLabel}>MT</Text>
                
                {pkg.bonus ? (
                  <View style={styles.bonusTag}>
                    <Sparkles size={10} color="#66bb6a" />
                    <Text style={styles.bonusTagText}>+{pkg.bonus}</Text>
                  </View>
                ) : null}
                
                <View style={styles.priceContainer}>
                  <Text style={styles.packagePrice}>{pkg.price}</Text>
                </View>
                
                {isPurchasing === pkg.id && (
                  <View style={styles.loadingOverlay}>
                    <Text style={styles.loadingOverlayText}>...</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          * Tüm ödemeler güvenli ödeme sistemi ile işlenir
        </Text>
        <Text style={styles.footerText}>
          * Satın alımlar anında hesabınıza yansır
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  mtBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffa726',
  },
  mtBalanceText: {
    color: '#ffa726',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  packagesContainer: {
    padding: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  packageCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    position: 'relative',
    minHeight: 160,
    justifyContent: 'space-between',
  },
  packageCardPopular: {
    borderColor: '#d4af37',
    backgroundColor: '#1a1a0a',
  },
  popularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#d4af37',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    lineHeight: 36,
  },
  mtLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
    marginTop: -4,
  },
  bonusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 187, 106, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
    marginTop: 4,
  },
  bonusTagText: {
    color: '#66bb6a',
    fontSize: 11,
    fontWeight: 'bold',
  },
  priceContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    width: '100%',
    alignItems: 'center',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  footer: {
    padding: 20,
    paddingTop: 10,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 4,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    color: '#d4af37',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlayText: {
    color: '#d4af37',
    fontSize: 24,
    fontWeight: 'bold',
  },
});
