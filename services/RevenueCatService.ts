import Purchases from 'react-native-purchases';

export interface MTPackage {
  id: string;
  amount: number;
  price: string;
  bonus?: number;
  popular?: boolean;
  productId: string; // RevenueCat product ID
}

export class RevenueCatService {
  private static instance: RevenueCatService;
  private isInitialized = false;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  private getDummyPackages(): MTPackage[] {
    return [
      { id: 'mt_small', amount: 100, price: '$0.99', productId: 'mafia_v2_100' },
      { id: 'mt_medium', amount: 500, price: '$4.99', bonus: 50, productId: 'mafia_v2_500' },
      { id: 'mt_large', amount: 1200, price: '$9.99', bonus: 200, popular: true, productId: 'mafia_v2_1200' },
      { id: 'mt_xlarge', amount: 2500, price: '$19.99', bonus: 500, productId: 'mafia_v2_2500' },
    ];
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
      if (!apiKey) {
        throw new Error('RevenueCat API key not found');
      }

      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      await Purchases.configure({ apiKey });

      this.isInitialized = true;
      console.log('✅ RevenueCat initialized successfully');
    } catch (error) {
      console.error('❌ RevenueCat initialization failed:', error);
      throw error;
    }
  }

  async getAvailablePackages(): Promise<MTPackage[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Önce offerings ile dene
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        console.log('📦 RAW PACKAGES from RevenueCat:', offerings.current.availablePackages);
        
        // V2 Products - Yeni ID'ler
        const packageMapping: { [key: string]: { id: string; amount: number; price: string; bonus?: number; popular?: boolean } } = {
          'mafia_v2_100': { id: 'mt_small', amount: 100, price: '$0.99' },
          'mafia_v2_500': { id: 'mt_medium', amount: 500, price: '$4.99', bonus: 50 },
          'mafia_v2_1200': { id: 'mt_large', amount: 1200, price: '$9.99', bonus: 200, popular: true },
          'mafia_v2_2500': { id: 'mt_xlarge', amount: 2500, price: '$19.99', bonus: 500 },
        };

        const packages: MTPackage[] = offerings.current.availablePackages
          .map((pkg: any) => {
            const productId = pkg.identifier;
            const mapping = packageMapping[productId];
            
            console.log(`🔍 Processing: ${productId}`);
            console.log(`  - Product price string: ${pkg.product.priceString}`);
            console.log(`  - Product price: ${pkg.product.price}`);
            console.log(`  - Mapping: ${JSON.stringify(mapping)}`);
            
            if (!mapping) {
              console.warn('⚠️ Unknown product:', productId);
              return null;
            }
            
            const finalPackage = {
              ...mapping,
              price: pkg.product.priceString || mapping.price,
              productId: productId,
            };
            
            console.log(`✅ Final package: ${JSON.stringify(finalPackage)}`);
            return finalPackage;
          })
          .filter((pkg: any) => pkg !== null) as MTPackage[];

        console.log('✅ All packages processed:', packages);
        return packages.length > 0 ? packages : this.getDummyPackages();
      } else {
        // Eğer offerings yoksa, dummy packages döndür
        console.log('⚠️ No offerings found, using dummy packages');
        return this.getDummyPackages();
      }
    } catch (error) {
      console.error('❌ Failed to get packages:', error);
      // Fallback to dummy packages
      return this.getDummyPackages();
    }
  }

  async purchasePackage(packageId: string): Promise<{
    success: boolean;
    amount?: number;
    bonus?: number;
    error?: string;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current) {
        throw new Error('No offerings available');
      }

      const targetPackage = offerings.current.availablePackages.find(
        (pkg: any) => pkg.identifier === packageId
      );

      if (!targetPackage) {
        throw new Error('Package not found');
      }

      const { customerInfo } = await Purchases.purchasePackage(targetPackage);

      // Satın alma başarılı
      console.log('✅ Purchase successful:', customerInfo);

      // V2 MT miktarını hesapla
      const packageAmounts: { [key: string]: { amount: number; bonus?: number } } = {
        'mafia_v2_100': { amount: 100 },
        'mafia_v2_500': { amount: 500, bonus: 50 },
        'mafia_v2_1200': { amount: 1200, bonus: 200 },
        'mafia_v2_2500': { amount: 2500, bonus: 500 },
      };

      const packageInfo = packageAmounts[packageId] || { amount: 0 };

      return {
        success: true,
        amount: packageInfo.amount,
        bonus: packageInfo.bonus,
      };
    } catch (error: any) {
      console.error('❌ Purchase failed:', error);
      
      let errorMessage = 'Purchase failed';
      
      if (error.userCancelled) {
        errorMessage = 'Purchase cancelled';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async restorePurchases(): Promise<{
    success: boolean;
    restored?: boolean;
    error?: string;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      console.log('✅ Purchases restored:', customerInfo);

      return {
        success: true,
        restored: true,
      };
    } catch (error: any) {
      console.error('❌ Restore failed:', error);
      
      return {
        success: false,
        error: error.message || 'Restore failed',
      };
    }
  }

  async getCustomerInfo() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      console.error('❌ Failed to get customer info:', error);
      throw error;
    }
  }

  async setUserId(userId: string) {
    try {
      await Purchases.logIn(userId);
      console.log('✅ User logged in to RevenueCat:', userId);
    } catch (error) {
      console.error('❌ Failed to log in user:', error);
    }
  }

  async logout() {
    try {
      await Purchases.logOut();
      console.log('✅ User logged out from RevenueCat');
    } catch (error) {
      console.error('❌ Failed to log out user:', error);
    }
  }
}
