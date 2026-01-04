import Purchases, {
    PurchasesPackage,
    CustomerInfo,
    PurchasesOffering
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// RevenueCat API Keys - Environment Variables'dan oku
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || '';
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || '';

// MT Coin miktarları (product identifier -> MT miktarı)
const MT_COIN_AMOUNTS: Record<string, number> = {
    'mt_100': 100,
    'mt_550': 550,
    'mt_1200': 1200,
    'mt_2500': 2500,
};

class PurchaseService {
    private static instance: PurchaseService;
    private isConfigured = false;
    private currentUserId: string | null = null;

    private constructor() { }

    static getInstance(): PurchaseService {
        if (!PurchaseService.instance) {
            PurchaseService.instance = new PurchaseService();
        }
        return PurchaseService.instance;
    }

    async configure(userId?: string): Promise<void> {
        if (this.isConfigured) return;

        try {
            const apiKey = Platform.OS === 'ios'
                ? REVENUECAT_API_KEY_IOS
                : REVENUECAT_API_KEY_ANDROID;

            if (!apiKey) {
                console.warn('RevenueCat API key not set for this platform');
                return;
            }

            await Purchases.configure({ apiKey });

            if (userId) {
                await Purchases.logIn(userId);
                this.currentUserId = userId;
            }

            this.isConfigured = true;
            console.log('✅ RevenueCat configured successfully');
        } catch (error) {
            console.error('❌ RevenueCat configuration error:', error);
        }
    }

    async setUserId(userId: string): Promise<void> {
        if (!this.isConfigured) {
            await this.configure(userId);
            return;
        }

        try {
            await Purchases.logIn(userId);
            this.currentUserId = userId;
            console.log('✅ RevenueCat user logged in:', userId);
        } catch (error) {
            console.error('❌ RevenueCat login error:', error);
        }
    }

    async getOfferings(): Promise<PurchasesOffering | null> {
        try {
            const offerings = await Purchases.getOfferings();

            if (offerings.current) {
                console.log('✅ Offerings loaded:', offerings.current.identifier);
                return offerings.current;
            }

            console.warn('⚠️ No current offering available');
            return null;
        } catch (error) {
            console.error('❌ Error fetching offerings:', error);
            return null;
        }
    }

    async purchasePackage(pkg: PurchasesPackage): Promise<{
        success: boolean;
        mtCoinsGranted?: number;
        message: string;
    }> {
        try {
            console.log('🛒 Starting purchase for:', pkg.identifier);

            const { customerInfo } = await Purchases.purchasePackage(pkg);

            // Satın alma başarılı - MT Coin miktarını belirle
            const productId = pkg.product.identifier;
            const mtAmount = MT_COIN_AMOUNTS[productId] || 0;

            if (mtAmount > 0 && this.currentUserId) {
                // Supabase'de MT Coin ekle
                const result = await this.grantMTCoins(this.currentUserId, mtAmount, productId);

                if (result.success) {
                    return {
                        success: true,
                        mtCoinsGranted: mtAmount,
                        message: `🎉 ${mtAmount} MT Coin hesabınıza eklendi!`,
                    };
                } else {
                    return {
                        success: false,
                        message: 'Satın alma başarılı ama MT Coin eklenirken hata oluştu. Destek ile iletişime geçin.',
                    };
                }
            }

            return {
                success: true,
                mtCoinsGranted: mtAmount,
                message: 'Satın alma tamamlandı!',
            };
        } catch (error: any) {
            console.error('❌ Purchase error:', error);

            // Kullanıcı iptal ettiyse
            if (error.userCancelled) {
                return {
                    success: false,
                    message: 'Satın alma iptal edildi.',
                };
            }

            return {
                success: false,
                message: error.message || 'Satın alma sırasında bir hata oluştu.',
            };
        }
    }

    private async grantMTCoins(
        userId: string,
        amount: number,
        productId: string
    ): Promise<{ success: boolean }> {
        try {
            const { data, error } = await supabase.rpc('rpc_grant_mt_coins', {
                p_user_id: userId,
                p_amount: amount,
                p_product_id: productId,
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('❌ Grant MT coins error:', error);
            return { success: false };
        }
    }

    async restorePurchases(): Promise<CustomerInfo | null> {
        try {
            const customerInfo = await Purchases.restorePurchases();
            console.log('✅ Purchases restored');
            return customerInfo;
        } catch (error) {
            console.error('❌ Restore purchases error:', error);
            return null;
        }
    }
}

export default PurchaseService.getInstance();
