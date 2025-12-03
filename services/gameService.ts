import { supabase } from '@/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { PlayerStats, Business, Territory, Mission, FamilyMember, ChatMessage, GameEvent, Leaderboard, Crime, Caporegime } from '@/types/game';

class GameService {
  private currentUserId: string | null = null;
  private currentUsername: string = 'Oyuncu';
  private playerStats: PlayerStats;
  private businesses: Business[] = [];
  private territories: Territory[] = [];
  private missions: Mission[] = [];
  private familyMembers: FamilyMember[] = [];
  private chatMessages: ChatMessage[] = [];
  private events: GameEvent[] = [];
  private crimes: Crime[] = [];
  private leaderboard: Leaderboard[] = [];
  private availableCaporegimes: Caporegime[] = [];
  private activeCrime: { crimeId: string; endTime: number } | null = null;
  private lastEnergyRegenAt: number = Date.now();

  constructor() {
    this.playerStats = this.getDefaultPlayerStats();
    this.initializeGameData();
  }

  // Kullanıcı için oyunu başlat
  async initializeForUser(userId: string, username: string) {
    console.log('🔥 INITIALIZING GAME FOR USER:', { userId, username });
    this.currentUserId = userId;
    this.currentUsername = username;

    try {
      // Kullanıcıya ait temel kayıtları garanti altına al
      await this.ensureUserInitialized();

      // Supabase'den player stats'ları yükle
      await this.loadPlayerStatsFromSupabase();
      console.log('✅ Player stats loaded from Supabase');

      // Asker sayısını Supabase'den çek
      await this.refreshSoldiersFromSupabase();

      // Harita/region verilerini yükle
      await this.loadRegionsFromSupabase();

      // İşletme verilerini yükle
      await this.loadBusinessesFromSupabase();

      // İşletme durumlarını kontrol et
      await this.checkBusinessStatuses();
    } catch (error) {
      console.error('❌ Error loading player stats:', error);
      // Hata durumunda default stats kullan
      this.playerStats = this.getDefaultPlayerStats();
      this.playerStats.id = userId;
      this.playerStats.name = username;
      // İlk kez kaydet
      await this.savePlayerStatsToSupabase();
    }
  }

  // Supabase'den player stats yükle
  private async loadPlayerStatsFromSupabase() {
    if (!this.currentUserId) {
      console.log('❌ No user ID, cannot load stats');
      return;
    }

    console.log('🔄 Loading player stats from Supabase for user:', this.currentUserId);

    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('id', this.currentUserId)
      .single();

    if (error) {
      console.error('❌ Error loading player stats:', error);
      throw error;
    }

    if (data) {
      console.log('✅ Player stats loaded:', data);
      // Supabase verisini PlayerStats formatına çevir
      this.playerStats = {
        id: data.id,
        name: data.username,
        level: data.level || 1,
        cash: data.cash || 0,


        respect: data.respect || 0,
        reputation: data.reputation || 0,
        soldiers: data.soldiers || 0,
        territories: data.territories || 0,
        health: 100,
        energy: data.energy || 100,
        experience: data.experience || 0,
        experienceToNext: data.experience_to_next || 100,
        strength: data.strength || 10,
        defense: data.defense || 10,
        speed: data.speed || 10,
        intelligence: data.intelligence || 10,
        charisma: data.charisma || 10,
        availablePoints: data.available_points || 0,
        rank: data.rank as any || 'Soldato',
        familyId: data.family_id || null,
        familyRole: null,
        location: data.location || 'Şehir Merkezi',
        inventory: [],
        achievements: [],
        lastActive: new Date(data.last_active || Date.now()),
        joinDate: new Date(data.join_date || Date.now()),
        totalEarnings: Number(data.total_earnings) || 0,
        battlesWon: data.battles_won || 0,
        battlesLost: data.battles_lost || 0,
        caporegimes: [],
        profileImage: data.profile_image,
        passiveIncome: 0,
        lastIncomeCollection: new Date(),
        mtCoins: data.mt_coins || 0,
      };
      console.log('✅ Player stats converted:', this.playerStats);
    }
  }

  // Player stats'ları Supabase'e kaydet
  private async savePlayerStatsToSupabase() {
    if (!this.currentUserId) {
      console.log('❌ No user ID, cannot save stats');
      return;
    }

    console.log('💾 Saving player stats to Supabase:', {
      id: this.currentUserId,
      cash: this.playerStats.cash,
      soldiers: this.playerStats.soldiers,
      level: this.playerStats.level,
      experience: this.playerStats.experience
    });

    try {
      const { error } = await supabase
        .from('player_stats')
        .upsert({
          id: this.currentUserId,
          username: this.playerStats.name,
          level: this.playerStats.level,
          cash: this.playerStats.cash,
          energy: this.playerStats.energy,
          soldiers: this.playerStats.soldiers,
          respect: this.playerStats.respect,
          reputation: this.playerStats.reputation,
          experience: this.playerStats.experience,
          experience_to_next: this.playerStats.experienceToNext,
          strength: this.playerStats.strength,
          defense: this.playerStats.defense,
          speed: this.playerStats.speed,
          intelligence: this.playerStats.intelligence,
          charisma: this.playerStats.charisma,
          available_points: this.playerStats.availablePoints,
          rank: this.playerStats.rank,
          territories: this.playerStats.territories,
          total_earnings: this.playerStats.totalEarnings,
          battles_won: this.playerStats.battlesWon,
          battles_lost: this.playerStats.battlesLost,

          profile_image: this.playerStats.profileImage,
          location: this.playerStats.location,
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error saving player stats:', error);
        throw error;
      }

      console.log('✅ Player stats saved successfully');
    } catch (error) {
      console.error('❌ Failed to save player stats:', error);
    }
  }

  // Supabase: kullanıcının initial tablolarını oluşturur
  private async ensureUserInitialized() {
    const { error } = await supabase.rpc('ensure_user_initialized');
    if (error) {
      console.warn('ensure_user_initialized error (devam ediyorum):', error.message);
    }
  }

  // Supabase: user_soldiers tablosundan asker sayısını güncelle
  private async refreshSoldiersFromSupabase() {
    if (!this.currentUserId) return;
    const { data, error } = await supabase
      .from('user_soldiers')
      .select('soldiers')
      .eq('user_id', this.currentUserId)
      .single();
    if (!error && data) {
      this.playerStats.soldiers = data.soldiers ?? 0;
    }
  }

  // Supabase: işletmeleri yükle
  private async loadBusinessesFromSupabase() {
    console.log('🔄 Loading businesses from Supabase...');

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('required_level', { ascending: true });

    if (error) {
      console.error('❌ loadBusinesses error:', error);
      return;
    }

    console.log('🔄 Businesses query result:', { data, error });

    if (data) {
      // Supabase'den gelen işletmeleri mevcut işletmelerle birleştir
      this.businesses = data.map((b: any) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        category: b.category,
        description: b.description,
        baseIncome: Number(b.base_income),
        currentIncome: Number(b.base_income),
        level: 0, // Başlangıçta sahip değil
        maxLevel: b.max_level,
        buildCost: Number(b.build_cost),
        upgradeCost: Number(b.upgrade_cost),
        buildTime: b.build_time,
        upgradeTime: b.upgrade_time,
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: b.required_level,
        riskLevel: b.risk_level,
        legalStatus: b.legal_status,
        defense: b.defense,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      }));
    }

    // Kullanıcının sahip olduğu işletmeleri yükle
    await this.loadUserBusinessesFromSupabase();

    console.log('✅ Loaded businesses:', this.businesses);
  }

  // Supabase: kullanıcının sahip olduğu işletmeleri yükle
  private async loadUserBusinessesFromSupabase() {
    if (!this.currentUserId) return;

    console.log('🔄 Loading user businesses from Supabase...');

    const { data, error } = await supabase
      .from('user_businesses')
      .select(`
        business_id,
        level,
        current_income,
        is_building,
        is_upgrading,
        build_start_time,
        upgrade_start_time,
        last_income_collection,
        total_earnings,
        efficiency
      `)
      .eq('user_id', this.currentUserId);

    if (error) {
      console.error('❌ loadUserBusinesses error:', error);
      return;
    }

    console.log('🔄 User businesses query result:', { data, error });

    if (data) {
      // Kullanıcının sahip olduğu işletmeleri güncelle
      for (const userBusiness of data) {
        const business = this.businesses.find(b => b.id === userBusiness.business_id);
        if (business) {
          business.level = userBusiness.level;
          business.currentIncome = Number(userBusiness.current_income);
          business.isBuilding = userBusiness.is_building;
          business.isUpgrading = userBusiness.is_upgrading;
          business.buildStartTime = userBusiness.build_start_time ? new Date(userBusiness.build_start_time).getTime() : undefined;
          business.upgradeStartTime = userBusiness.upgrade_start_time ? new Date(userBusiness.upgrade_start_time).getTime() : undefined;
          business.lastIncomeCollection = new Date(userBusiness.last_income_collection);
          business.totalEarnings = Number(userBusiness.total_earnings);
          business.efficiency = userBusiness.efficiency;

          // Gelir hesaplama (seviye çarpanı) - her seviye %50 artış
          const incomeMultiplier = 1 + (business.level - 1) * 0.5;
          business.currentIncome = Math.floor(business.baseIncome * incomeMultiplier);

          // Upgrade maliyeti hesaplama - her seviye için 1.5x artar
          // businesses tablosundan base upgrade_cost alıyoruz
          const baseBusiness = this.businesses.find(b => b.id === userBusiness.business_id);
          if (baseBusiness) {
            business.upgradeCost = Math.floor(baseBusiness.buildCost * 2 * Math.pow(1.5, business.level - 1));
          }
        }
      }
    }

    console.log('✅ Loaded user businesses');
  }

  // İşletme durumlarını kontrol et ve güncelle
  private async checkBusinessStatuses() {
    if (!this.currentUserId) return;

    for (const business of this.businesses) {
      if (business.level > 0) {
        const { data, error } = await supabase.rpc('rpc_check_business_status', {
          p_business_id: business.id
        });

        if (!error && data && data.length > 0) {
          const status = data[0];

          // İnşaat durumu güncelle
          if (business.isBuilding && !status.is_building) {
            business.isBuilding = false;
            business.buildStartTime = undefined;
            console.log('🏢 Building completed:', business.name);
          }

          // Geliştirme durumu güncelle
          if (business.isUpgrading && !status.is_upgrading) {
            business.isUpgrading = false;
            business.upgradeStartTime = undefined;
            business.level += 1;

            // Yeni geliri hesapla
            const incomeMultiplier = 1 + (business.level - 1) * 0.5;
            business.currentIncome = Math.floor(business.baseIncome * incomeMultiplier);

            console.log('🏢 Upgrade completed:', business.name, 'New level:', business.level);
          }
        }
      }
    }
  }

  // Supabase: bölgeleri ve durumlarını yükle
  private async loadRegionsFromSupabase() {
    console.log('🔄 Loading regions from Supabase...');

    const [regionsRes, stateRes] = await Promise.all([
      supabase.from('regions').select('id,name,description,base_income_per_min'),
      supabase.from('region_state').select(`
        region_id,
        owner_user_id,
        defender_soldiers
      `),
    ]);

    console.log('🔄 Regions query result:', regionsRes);
    console.log('🔄 Region state query result:', stateRes);

    if (regionsRes.error) {
      console.error('❌ loadRegions error:', regionsRes.error);
      return;
    }
    if (stateRes.error) {
      console.error('❌ loadRegionState error:', stateRes.error);
      return;
    }

    const stateByRegion: Record<string, {
      owner_user_id: string | null;
      defender_soldiers: number;
      owner_name?: string;
    }> = {};

    // Owner bilgilerini almak için ayrı sorgu
    const ownerIds = [...new Set((stateRes.data ?? []).map(s => s.owner_user_id).filter(Boolean))];
    let owners: Record<string, { username: string; email: string }> = {};

    if (ownerIds.length > 0) {
      const { data: ownerData } = await supabase
        .from('player_stats')
        .select('id, username')
        .in('id', ownerIds);

      if (ownerData) {
        owners = ownerData.reduce((acc, owner) => {
          acc[owner.id] = { username: owner.username, email: '' };
          return acc;
        }, {} as Record<string, { username: string; email: string }>);
      }
    }

    for (const s of stateRes.data ?? []) {
      const owner = owners[s.owner_user_id];
      stateByRegion[s.region_id] = {
        owner_user_id: s.owner_user_id ?? null,
        defender_soldiers: s.defender_soldiers ?? 0,
        owner_name: owner?.username || undefined,
      };
    }

    // Uygulama Territory tipine dönüştür
    this.territories = (regionsRes.data ?? []).map((r: any) => {
      const st = stateByRegion[r.id] ?? { owner_user_id: null, defender_soldiers: 0 };
      const ownedByUser = !!this.currentUserId && st.owner_user_id === this.currentUserId;
      const status = ownedByUser ? 'owned' : (st.owner_user_id ? 'enemy' : 'neutral');
      const ownerName = st.owner_name || (ownedByUser ? 'Siz' : (st.owner_user_id ? 'Rakip' : 'Boş'));
      return {
        id: r.id as string,
        name: r.name as string,
        owner: ownerName,
        income: Number(r.base_income_per_min) * 60, // app UI saatlik gösteriyor
        defense: st.defender_soldiers,
        soldiers: st.defender_soldiers,
        status,
      };
    });

    console.log('✅ Loaded territories:', this.territories);
  }

  // Bölgeye saldır (Supabase RPC)
  async attackTerritory(territoryId: string, soldiersToSend?: number): Promise<{ success: boolean; message: string }> {
    // Mevcut territory'yi bul
    const t = this.territories.find(tt => tt.id === territoryId);
    if (!t) {
      return { success: false, message: 'Bölge bulunamadı.' };
    }
    if (t.status === 'owned') {
      return { success: false, message: 'Kendi bölgenize saldıramazsınız.' };
    }

    // Eğer asker sayısı verilmediyse, savunmacının asker sayısı kadar gönder
    let attackersToSend = soldiersToSend || Math.max(1, Math.min(this.playerStats.soldiers, t.soldiers));

    // Maksimum asker sayısı kontrolü
    if (attackersToSend > this.playerStats.soldiers) {
      return { success: false, message: `Yetersiz asker! Sadece ${this.playerStats.soldiers} askeriniz var.` };
    }

    if (attackersToSend < 1) {
      return { success: false, message: 'En az 1 asker göndermelisiniz!' };
    }

    const { data, error } = await supabase.rpc('rpc_attack_region', {
      p_region_id: territoryId,
      p_attackers_to_send: attackersToSend,
    });
    if (error) {
      return { success: false, message: `Saldırı hatası: ${error.message}` };
    }

    // Asker sayısını ve haritayı yenile
    await Promise.all([
      this.refreshSoldiersFromSupabase(),
      this.loadRegionsFromSupabase(),
      this.loadPlayerStatsFromSupabase(),
    ]);

    const success = !!data?.[0]?.success;
    return {
      success,
      message: data?.[0]?.message || (success ? 'Bölge ele geçirildi!' : 'Saldırı yapıldı, savunma düşürüldü.'),
    };
  }

  // Pasif geliri talep et (Supabase RPC)
  async claimPassiveIncome(): Promise<{ success: boolean; message: string; amount?: number }> {
    const { data, error } = await supabase.rpc('rpc_claim_income');
    if (error) {
      return { success: false, message: `Gelir talep hatası: ${error.message}` };
    }
    const claimed = Number(data?.[0]?.total_claimed ?? 0);
    if (claimed > 0) {
      this.playerStats.cash += claimed;
      this.playerStats.totalEarnings += claimed;
      await this.savePlayerStatsToSupabase();
    }
    return { success: true, message: `Gelir alındı: $${claimed.toLocaleString()}`, amount: claimed };
  }

  // Bölgeye asker yerleştir (Supabase RPC)
  async reinforceTerritory(territoryId: string, soldiersToSend: number): Promise<{ success: boolean; message: string }> {
    // Mevcut territory'yi bul
    const t = this.territories.find(tt => tt.id === territoryId);
    if (!t) {
      return { success: false, message: 'Bölge bulunamadı.' };
    }
    if (t.status !== 'owned') {
      return { success: false, message: 'Sadece kendi bölgelerinize asker yerleştirebilirsiniz.' };
    }

    // Maksimum asker sayısı kontrolü
    if (soldiersToSend > this.playerStats.soldiers) {
      return { success: false, message: `Yetersiz asker! Sadece ${this.playerStats.soldiers} askeriniz var.` };
    }

    if (soldiersToSend < 1) {
      return { success: false, message: 'En az 1 asker yerleştirmelisiniz!' };
    }

    const { data, error } = await supabase.rpc('rpc_reinforce_region', {
      p_region_id: territoryId,
      p_soldiers_to_send: soldiersToSend,
      p_player_level: this.playerStats.level,
    });
    if (error) {
      return { success: false, message: `Asker yerleştirme hatası: ${error.message}` };
    }

    // Asker sayısını ve haritayı yenile
    await Promise.all([
      this.refreshSoldiersFromSupabase(),
      this.loadRegionsFromSupabase(),
      this.loadPlayerStatsFromSupabase(),
    ]);

    const success = !!data?.[0]?.success;
    return {
      success,
      message: data?.[0]?.message || (success ? 'Askerler başarıyla yerleştirildi!' : 'Asker yerleştirme başarısız.'),
    };
  }

  private getDefaultPlayerStats(): PlayerStats {
    return {
      id: this.currentUserId || 'default',
      name: this.currentUsername,
      level: 1,
      cash: 1000,
      respect: 0,
      reputation: 0,
      soldiers: 0,
      territories: 0,
      health: 100,
      energy: 100,
      experience: 0,
      experienceToNext: 100,
      strength: 10,
      defense: 10,
      speed: 10,
      intelligence: 10,
      charisma: 10,
      availablePoints: 0,
      rank: 'Soldato',
      familyId: null,
      familyRole: null,
      location: 'Şehir Merkezi',
      inventory: [],
      achievements: [],
      lastActive: new Date(),
      joinDate: new Date(),
      totalEarnings: 0,
      battlesWon: 0,
      battlesLost: 0,
      caporegimes: [],
      profileImage: undefined,
      passiveIncome: 0,
      lastIncomeCollection: new Date(),
      mtCoins: 0,
    };
  }

  // Soldato işe alma
  async hireSoldiers(count: number): Promise<{ success: boolean; message: string }> {
    console.log('🔥 HIRE SOLDIERS CALLED:', { count, currentCash: this.playerStats.cash, currentSoldiers: this.playerStats.soldiers });

    const baseCost = 100;
    const levelMultiplier = 1 + (this.playerStats.level * 0.1);
    const totalCost = Math.floor(baseCost * count * levelMultiplier);

    const maxSoldiers = this.playerStats.level * 5;
    const availableSlots = maxSoldiers - this.playerStats.soldiers;

    console.log('🔥 HIRE CALCULATION:', { totalCost, maxSoldiers, availableSlots });

    if (this.playerStats.cash < totalCost) {
      return { success: false, message: `Yetersiz para! ${count} soldato için $${totalCost.toLocaleString()} gerekli.` };
    }

    if (count > availableSlots) {
      return { success: false, message: `Yetersiz slot! Maksimum ${availableSlots} soldato alabilirsiniz.` };
    }

    // Para düş ve soldato ekle
    this.playerStats.cash -= totalCost;
    this.playerStats.soldiers += count;

    // Soldato gücünü hesapla ve ekle (her soldato 2 güç puanı)
    const soldierPower = count * 2;
    this.playerStats.strength += soldierPower;

    console.log('🔥 AFTER HIRE:', { newCash: this.playerStats.cash, newSoldiers: this.playerStats.soldiers });

    // Hem player_stats hem de user_soldiers tablosunu güncelle
    await Promise.all([
      this.savePlayerStatsToSupabase(),
      this.saveSoldiersToSupabase()
    ]);

    return {
      success: true,
      message: `${count} soldato başarıyla işe alındı! $${totalCost.toLocaleString()} ödendi. +${soldierPower} güç kazandınız!`
    };
  }

  // Supabase: user_soldiers tablosuna asker sayısını kaydet
  private async saveSoldiersToSupabase() {
    if (!this.currentUserId) {
      console.log('❌ No user ID, cannot save soldiers');
      return;
    }

    console.log('💾 Saving soldiers to user_soldiers table:', {
      user_id: this.currentUserId,
      soldiers: this.playerStats.soldiers
    });

    try {
      const { error } = await supabase
        .from('user_soldiers')
        .upsert({
          user_id: this.currentUserId,
          soldiers: this.playerStats.soldiers,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error saving soldiers:', error);
        throw error;
      }

      console.log('✅ Soldiers saved successfully');
    } catch (error) {
      console.error('❌ Failed to save soldiers:', error);
    }
  }

  // MT Coins ekleme (satın alma sonrası)
  async addMTCoins(amount: number, bonus: number = 0): Promise<{ success: boolean; message: string }> {
    const totalAmount = amount + bonus;
    console.log('💎 ADDING MT COINS:', { amount, bonus, totalAmount });

    this.playerStats.mtCoins += totalAmount;

    // Supabase'e kaydet
    await this.saveMTCoinsToSupabase();

    let message = `${totalAmount} MT Coin hesabınıza eklendi!`;
    if (bonus > 0) {
      message = `${amount} MT Coin + ${bonus} Bonus = ${totalAmount} MT Coin hesabınıza eklendi!`;
    }

    return { success: true, message };
  }

  // MT Coins harcama
  async spendMTCoins(amount: number, reason: string): Promise<{ success: boolean; message: string }> {
    console.log('💎 SPENDING MT COINS:', { amount, reason, currentBalance: this.playerStats.mtCoins });

    if (this.playerStats.mtCoins < amount) {
      return { success: false, message: 'Yetersiz MT Coin!' };
    }

    this.playerStats.mtCoins -= amount;

    // Supabase'e kaydet
    await this.saveMTCoinsToSupabase();

    return { success: true, message: `${amount} MT Coin harcandı (${reason})` };
  }

  // MT Coins'i Supabase'e kaydet
  private async saveMTCoinsToSupabase() {
    if (!this.currentUserId) {
      console.log('❌ No user ID, cannot save MT Coins');
      return;
    }

    console.log('💾 Saving MT Coins to Supabase:', {
      user_id: this.currentUserId,
      mt_coins: this.playerStats.mtCoins
    });

    try {
      const { error } = await supabase
        .from('player_stats')
        .update({ mt_coins: this.playerStats.mtCoins })
        .eq('id', this.currentUserId);

      if (error) {
        console.error('❌ Error saving MT Coins:', error);
        throw error;
      }

      console.log('✅ MT Coins saved successfully');
    } catch (error) {
      console.error('❌ Failed to save MT Coins:', error);
    }
  }

  // Profil Fotoğrafı Yükleme
  async uploadProfilePhoto(imageUri: string): Promise<{ success: boolean; message: string; url?: string }> {
    if (!this.currentUserId) {
      return { success: false, message: 'Kullanıcı kimliği bulunamadı!' };
    }

    try {
      console.log('📸 Uploading profile photo...');

      // Read file as Base64 using Expo FileSystem
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Convert Base64 to ArrayBuffer
      const arrayBuffer = decode(base64);

      // Dosya adı oluştur
      const fileExt = 'jpg';
      const fileName = `${this.currentUserId}/${Date.now()}.${fileExt}`;

      // Supabase Storage'a yükle (ArrayBuffer kullanarak)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw uploadError;
      }

      // Public URL al
      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('✅ Photo uploaded, URL:', publicUrl);

      // player_stats'ı güncelle
      const { error: updateError } = await supabase
        .from('player_stats')
        .update({ profile_image: publicUrl })
        .eq('id', this.currentUserId);

      if (updateError) {
        console.error('❌ Update error:', updateError);
        throw updateError;
      }

      // Local state güncelle
      this.playerStats.profileImage = publicUrl;

      console.log('✅ Profile photo updated successfully');
      return { success: true, message: 'Profil fotoğrafı başarıyla güncellendi!', url: publicUrl };
    } catch (error: any) {
      console.error('❌ Profile photo upload failed:', error);
      return { success: false, message: error.message || 'Fotoğraf yüklenemedi!' };
    }
  }

  // Suç işleme
  commitCrime(crimeId: string): { success: boolean; message: string; reward?: number; xp?: number } {
    console.log('🔥 COMMIT CRIME CALLED:', crimeId);

    if (this.activeCrime) {
      return { success: false, message: 'Zaten bir suç işliyorsunuz!' };
    }

    const crime = this.crimes.find(c => c.id === crimeId);
    if (!crime) {
      return { success: false, message: 'Suç bulunamadı!' };
    }

    if (this.playerStats.level < crime.requiredLevel) {
      return { success: false, message: `Bu suç için ${crime.requiredLevel}. seviyeye ulaşmalısınız!` };
    }

    if (this.playerStats.energy < crime.energyCost) {
      return { success: false, message: `Bu suç için ${crime.energyCost} enerji gerekli!` };
    }

    // Suçu başlat
    this.activeCrime = {
      crimeId: crime.id,
      endTime: Date.now() + (crime.duration * 1000)
    };

    // Enerji düş
    this.playerStats.energy -= crime.energyCost;

    console.log('🔥 CRIME STARTED:', this.activeCrime);

    // Suç tamamlandığında ödül ver
    setTimeout(() => {
      this.completeCrime(crime);
    }, crime.duration * 1000);

    // Supabase'e kaydet
    this.savePlayerStatsToSupabase();

    return {
      success: true,
      message: `${crime.name} suçu başlatıldı! ${crime.duration} saniye sürecek.`
    };
  }

  private completeCrime(crime: Crime) {
    console.log('🔥 COMPLETING CRIME:', crime.name);

    // Başarı oranını kontrol et
    const success = Math.random() * 100 <= crime.successRate;

    if (success) {
      // Ödül hesapla
      const levelMultiplier = 1 + (this.playerStats.level - crime.requiredLevel) * 0.1;
      const reward = Math.floor(crime.baseReward * Math.max(1, levelMultiplier));
      const xp = Math.floor(crime.baseXP * Math.max(1, levelMultiplier));

      // Ödülleri ver
      this.playerStats.cash += reward;
      this.playerStats.experience += xp;
      this.playerStats.totalEarnings += reward;

      // Level kontrolü
      this.checkLevelUp();

      console.log('🔥 CRIME SUCCESS:', { reward, xp, newCash: this.playerStats.cash });

      // Olay bildirimi
      this.events.unshift({
        id: `crime_${Date.now()}`,
        type: 'mission',
        message: `${crime.name} tamamlandı! +$${reward.toLocaleString()} | +${xp} XP`,
        timestamp: new Date()
      });

      // Suçu temizle ve cooldown ayarla
      this.activeCrime = null;
      crime.lastUsed = new Date();

      // Supabase'e kaydet
      this.savePlayerStatsToSupabase();

      // Bildirim gönder (UI için)
      // Note: This return statement will not affect the caller of completeCrime as it's called via setTimeout.
      // If you intend to get a result, completeCrime should be called synchronously or refactored.
      return { success: true, message: `+$${reward.toLocaleString()} | +${xp} XP`, reward, xp };
    } else {
      console.log('🔥 CRIME FAILED');

      this.events.unshift({
        id: `crime_${Date.now()}`,
        type: 'mission',
        message: `${crime.name} başarısız oldu!`,
        timestamp: new Date()
      });

      // Suçu temizle
      this.activeCrime = null;

      // Cooldown ayarla
      crime.lastUsed = new Date();

      // Supabase'e kaydet
      this.savePlayerStatsToSupabase();

      return { success: false, message: 'Suç başarısız oldu!' };
    }
  }

  // Aile Malikanesine Saldır
  async attackMansion(targetFamilyId: string, soldiersToSend: number): Promise<{ success: boolean; message: string; loot?: number }> {
    console.log('🔥 ATTACK MANSION:', { targetFamilyId, soldiersToSend });

    if (!this.playerStats.familyId) {
      return { success: false, message: 'Bir aileye üye olmadan saldıramazsınız!' };
    }

    if (this.playerStats.familyId === targetFamilyId) {
      return { success: false, message: 'Kendi ailenize saldıramazsınız!' };
    }

    if (soldiersToSend > this.playerStats.soldiers) {
      return { success: false, message: `Yetersiz asker! ${this.playerStats.soldiers} askeriniz var.` };
    }

    try {
      const { data, error } = await supabase.rpc('attack_family_mansion', {
        p_target_family_id: targetFamilyId,
        p_attacking_soldiers: soldiersToSend
      });

      if (error) throw error;

      // Player stats'ı güncelle (RPC zaten güncelledi ama client state'i yenilemek iyi olur)
      await this.loadPlayerStatsFromSupabase();
      await this.refreshSoldiersFromSupabase();

      return {
        success: data.success,
        message: data.message,
        loot: data.loot
      };

    } catch (error: any) {
      console.error('❌ Attack error:', error);
      return { success: false, message: error.message || 'Saldırı sırasında hata oluştu.' };
    }
  }

  // Oyuncuya Saldırı - Supabase RPC kullanarak
  async attackPlayer(targetId: string, targetName: string, soldiersToSend: number): Promise<{ success: boolean; message: string; cashStolen?: number; soldiersLost?: number }> {
    console.log('🔥 ATTACK PLAYER:', { targetId, targetName, soldiersToSend });

    try {
      // Supabase RPC fonksiyonunu çağır - tüm business logic database'de
      const { data, error } = await supabase.rpc('rpc_attack_player', {
        p_target_player_id: targetId,
        p_soldiers_to_send: soldiersToSend
      });

      if (error) {
        console.error('❌ RPC Attack error:', error);
        return { success: false, message: error.message || 'Saldırı başarısız!' };
      }

      console.log('✅ Attack RPC result:', data);

      // Client-side state'i güncelle
      await this.loadPlayerStatsFromSupabase();
      await this.refreshSoldiersFromSupabase();

      return {
        success: data.success,
        message: data.message,
        cashStolen: data.cashStolen || 0,
        soldiersLost: data.soldiersLost || 0
      };

    } catch (error: any) {
      console.error('❌ Attack error:', error);
      return { success: false, message: error.message || 'Saldırı sırasında hata oluştu.' };
    }
  }

  // Enerji yenileme: her 30 saniyede +1, maksimum 100
  regenerateEnergy() {
    const now = Date.now();
    const elapsedMs = now - this.lastEnergyRegenAt;
    if (this.playerStats.energy >= 100) {
      this.lastEnergyRegenAt = now;
      return;
    }
    const regenIntervalMs = 30000; // 30s per energy
    if (elapsedMs >= regenIntervalMs) {
      const points = Math.floor(elapsedMs / regenIntervalMs);
      const newEnergy = Math.min(100, this.playerStats.energy + points);
      if (newEnergy !== this.playerStats.energy) {
        this.playerStats.energy = newEnergy;
        // Kaydı çok sık yapmamak için sadece değişince kaydediyoruz
        this.savePlayerStatsToSupabase();
      }
      this.lastEnergyRegenAt = now - (elapsedMs % regenIntervalMs);
    }
  }

  // Level atlama kontrolü
  private checkLevelUp() {
    while (this.playerStats.experience >= this.playerStats.experienceToNext) {
      this.playerStats.experience -= this.playerStats.experienceToNext;
      this.playerStats.level++;
      this.playerStats.experienceToNext = Math.floor(this.playerStats.experienceToNext * 1.5);
      this.playerStats.availablePoints += 5;

      console.log('🔥 LEVEL UP!', { newLevel: this.playerStats.level });
    }
  }

  // Gelir toplama
  collectAccumulatedIncome(amount: number): { success: boolean; message: string } {
    console.log('🔥 COLLECT INCOME:', amount);

    this.playerStats.cash += amount;
    this.playerStats.totalEarnings += amount;

    // Supabase'e kaydet
    this.savePlayerStatsToSupabase();

    return {
      success: true,
      message: `$${amount.toLocaleString()} gelir toplandı!`
    };
  }

  // Profil güncelleme
  updateProfile(updates: Partial<PlayerStats>): { success: boolean; message: string } {
    console.log('🔥 UPDATE PROFILE:', updates);

    if (updates.name) {
      this.playerStats.name = updates.name;
    }
    if (updates.profileImage) {
      this.playerStats.profileImage = updates.profileImage;
    }

    // Supabase'e kaydet
    this.savePlayerStatsToSupabase();

    return { success: true, message: 'Profil başarıyla güncellendi!' };
  }

  // Getter metodları
  getPlayerStats(): PlayerStats {
    return { ...this.playerStats };
  }

  getBusinesses(): Business[] {
    return [...this.businesses];
  }

  getTerritories(): Territory[] {
    return [...this.territories];
  }

  getMissions(): Mission[] {
    return [...this.missions];
  }

  getFamilyMembers(): FamilyMember[] {
    return [...this.familyMembers];
  }

  getChatMessages(): ChatMessage[] {
    return [...this.chatMessages];
  }

  getEvents(): GameEvent[] {
    return [...this.events];
  }

  getCrimes(): Crime[] {
    return [...this.crimes];
  }

  getLeaderboard(): Leaderboard[] {
    return [...this.leaderboard];
  }

  getAvailableCaporegimes(): Caporegime[] {
    return [...this.availableCaporegimes];
  }

  isCommittingCrime(): boolean {
    return this.activeCrime !== null;
  }

  getActiveCrimeTimeRemaining(): number {
    if (!this.activeCrime) return 0;
    const remaining = Math.max(0, this.activeCrime.endTime - Date.now());
    return Math.ceil(remaining / 1000);
  }

  // Oyun verilerini başlat
  private initializeGameData() {
    // Suçları başlat
    this.crimes = [
      // Sokak Suçları (Level 1-10)
      {
        id: 'street_1',
        name: 'Duvara Grafiti Yapma',
        description: 'Çete sembolünü duvara çiz.',
        energyCost: 5,
        duration: 60,
        successRate: 95,
        baseReward: 50,
        baseXP: 5,
        requiredLevel: 1,
        cooldown: 300,
        category: 'street',
        riskLevel: 'low'
      },
      {
        id: 'street_2',
        name: 'Cep Telefonu Çalma',
        description: 'Kalabalık bir yerde telefon çal.',
        energyCost: 10,
        duration: 120,
        successRate: 85,
        baseReward: 150,
        baseXP: 8,
        requiredLevel: 2,
        cooldown: 600,
        category: 'street',
        riskLevel: 'low'
      },
      {
        id: 'street_3',
        name: 'Market Soygunu',
        description: 'Küçük bir marketi soy.',
        energyCost: 15,
        duration: 180,
        successRate: 75,
        baseReward: 350,
        baseXP: 12,
        requiredLevel: 4,
        cooldown: 900,
        category: 'street',
        riskLevel: 'medium'
      },
      {
        id: 'street_4',
        name: 'Araba Çalma',
        description: 'Park halindeki bir arabayı çal.',
        energyCost: 20,
        duration: 300,
        successRate: 65,
        baseReward: 800,
        baseXP: 18,
        requiredLevel: 6,
        cooldown: 1200,
        category: 'street',
        riskLevel: 'medium'
      },
      {
        id: 'street_5',
        name: 'Evden Hırsızlık',
        description: 'Boş bir eve gir ve değerli eşyaları çal.',
        energyCost: 25,
        duration: 480,
        successRate: 55,
        baseReward: 1500,
        baseXP: 25,
        requiredLevel: 8,
        cooldown: 1800,
        category: 'street',
        riskLevel: 'high'
      },

      // İş Suçları (Level 10-20)
      {
        id: 'business_1',
        name: 'Sahte Evrak',
        description: 'Sahte kimlik ve belgeler hazırla.',
        energyCost: 30,
        duration: 600,
        successRate: 70,
        baseReward: 2000,
        baseXP: 35,
        requiredLevel: 10,
        cooldown: 2400,
        category: 'business',
        riskLevel: 'medium'
      },
      {
        id: 'business_2',
        name: 'Kaçak Mal Ticareti',
        description: 'Kaçak malları sat.',
        energyCost: 35,
        duration: 720,
        successRate: 60,
        baseReward: 3500,
        baseXP: 45,
        requiredLevel: 12,
        cooldown: 3000,
        category: 'business',
        riskLevel: 'medium'
      },
      {
        id: 'business_3',
        name: 'Kara Para Aklama',
        description: 'Kirli parayı temiz göster.',
        energyCost: 40,
        duration: 900,
        successRate: 50,
        baseReward: 5000,
        baseXP: 60,
        requiredLevel: 15,
        cooldown: 3600,
        category: 'business',
        riskLevel: 'high'
      },
      {
        id: 'business_4',
        name: 'Kumarhane İşletme',
        description: 'Yasadışı kumarhane aç.',
        energyCost: 45,
        duration: 1200,
        successRate: 45,
        baseReward: 7500,
        baseXP: 80,
        requiredLevel: 17,
        cooldown: 4200,
        category: 'business',
        riskLevel: 'high'
      },
      {
        id: 'business_5',
        name: 'Banka Soygunu',
        description: 'Büyük bir banka soy.',
        energyCost: 50,
        duration: 1800,
        successRate: 35,
        baseReward: 12000,
        baseXP: 100,
        requiredLevel: 20,
        cooldown: 5400,
        category: 'business',
        riskLevel: 'high'
      },

      // Politik Suçlar (Level 20-30)
      {
        id: 'political_1',
        name: 'Belediye Rüşveti',
        description: 'Belediye görevlilerine rüşvet ver.',
        energyCost: 55,
        duration: 2400,
        successRate: 60,
        baseReward: 15000,
        baseXP: 120,
        requiredLevel: 22,
        cooldown: 6000,
        category: 'political',
        riskLevel: 'high'
      },
      {
        id: 'political_2',
        name: 'Seçim Manipülasyonu',
        description: 'Yerel seçimleri manipüle et.',
        energyCost: 60,
        duration: 3000,
        successRate: 50,
        baseReward: 20000,
        baseXP: 150,
        requiredLevel: 24,
        cooldown: 7200,
        category: 'political',
        riskLevel: 'high'
      },
      {
        id: 'political_3',
        name: 'Yargıç Satın Alma',
        description: 'Bir yargıcı satın al.',
        energyCost: 65,
        duration: 3600,
        successRate: 45,
        baseReward: 25000,
        baseXP: 180,
        requiredLevel: 26,
        cooldown: 9000,
        category: 'political',
        riskLevel: 'high'
      },
      {
        id: 'political_4',
        name: 'Polis Şefi Tehdidi',
        description: 'Polis şefini tehdit et.',
        energyCost: 70,
        duration: 4200,
        successRate: 40,
        baseReward: 30000,
        baseXP: 220,
        requiredLevel: 28,
        cooldown: 10800,
        category: 'political',
        riskLevel: 'high'
      },
      {
        id: 'political_5',
        name: 'Milletvekili Kontrolü',
        description: 'Bir milletvekilini kontrol altına al.',
        energyCost: 75,
        duration: 5400,
        successRate: 30,
        baseReward: 40000,
        baseXP: 250,
        requiredLevel: 30,
        cooldown: 14400,
        category: 'political',
        riskLevel: 'high'
      },

      // Uluslararası Suçlar (Level 30+)
      {
        id: 'international_1',
        name: 'Silah Kaçakçılığı',
        description: 'Uluslararası silah kaçakçılığı yap.',
        energyCost: 80,
        duration: 6000,
        successRate: 50,
        baseReward: 50000,
        baseXP: 300,
        requiredLevel: 32,
        cooldown: 18000,
        category: 'international',
        riskLevel: 'high'
      },
      {
        id: 'international_2',
        name: 'Uyuşturucu Karteli',
        description: 'Uyuşturucu kartelini yönet.',
        energyCost: 85,
        duration: 7200,
        successRate: 45,
        baseReward: 65000,
        baseXP: 350,
        requiredLevel: 34,
        cooldown: 21600,
        category: 'international',
        riskLevel: 'high'
      },
      {
        id: 'international_3',
        name: 'İnsan Kaçakçılığı',
        description: 'İnsan kaçakçılığı ağını işlet.',
        energyCost: 90,
        duration: 9000,
        successRate: 40,
        baseReward: 80000,
        baseXP: 400,
        requiredLevel: 36,
        cooldown: 25200,
        category: 'international',
        riskLevel: 'high'
      },
      {
        id: 'international_4',
        name: 'Siber Saldırı',
        description: 'Uluslararası bankalara siber saldırı düzenle.',
        energyCost: 95,
        duration: 10800,
        successRate: 35,
        baseReward: 100000,
        baseXP: 500,
        requiredLevel: 38,
        cooldown: 28800,
        category: 'international',
        riskLevel: 'high'
      },
      {
        id: 'international_5',
        name: 'Küresel İmparatorluk',
        description: 'Global suç imparatorluğunu yönet.',
        energyCost: 100,
        duration: 14400,
        successRate: 25,
        baseReward: 150000,
        baseXP: 600,
        requiredLevel: 40,
        cooldown: 36000,
        category: 'international',
        riskLevel: 'high'
      }
    ];



    // Diğer oyun verilerini başlat
    this.initializeBusinesses();
    this.initializeTerritories();
    this.initializeMissions();
    this.initializeFamilyMembers();
    this.initializeLeaderboard();
    this.initializeAvailableCaporegimes();
  }

  private initializeBusinesses() {
    this.businesses = [
      // Sokak İşletmeleri
      {
        id: 'small_shop',
        name: 'Küçük Dükkan',
        type: 'street',
        category: 'Sokak İşletmeleri',
        description: 'Basit bir dükkan işletmek',
        baseIncome: 50,
        currentIncome: 50,
        level: 1,
        maxLevel: 10,
        buildCost: 1000,
        upgradeCost: 2000,
        buildTime: 120, // 2 saat
        upgradeTime: 180, // 3 saat
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: 1,
        riskLevel: 'low',
        legalStatus: 'legal',
        defense: 5,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      },
      {
        id: 'gambling_den',
        name: 'Kumarhane',
        type: 'street',
        category: 'Sokak İşletmeleri',
        description: 'Gizli kumar oyunları',
        baseIncome: 120,
        currentIncome: 120,
        level: 1,
        maxLevel: 10,
        buildCost: 5000,
        upgradeCost: 10000,
        buildTime: 240, // 4 saat
        upgradeTime: 360, // 6 saat
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: 3,
        riskLevel: 'medium',
        legalStatus: 'illegal',
        defense: 15,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      },

      // Ticaret İşletmeleri
      {
        id: 'transport_company',
        name: 'Nakliye Şirketi',
        type: 'trade',
        category: 'Ticaret İşletmeleri',
        description: 'Kargo ve nakliye hizmetleri',
        baseIncome: 200,
        currentIncome: 200,
        level: 1,
        maxLevel: 10,
        buildCost: 15000,
        upgradeCost: 30000,
        buildTime: 360, // 6 saat
        upgradeTime: 540, // 9 saat
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: 5,
        riskLevel: 'low',
        legalStatus: 'legal',
        defense: 10,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      },
      {
        id: 'import_company',
        name: 'İthalat Firması',
        type: 'trade',
        category: 'Ticaret İşletmeleri',
        description: 'Uluslararası ticaret',
        baseIncome: 300,
        currentIncome: 300,
        level: 1,
        maxLevel: 10,
        buildCost: 25000,
        upgradeCost: 50000,
        buildTime: 480, // 8 saat
        upgradeTime: 720, // 12 saat
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: 7,
        riskLevel: 'medium',
        legalStatus: 'legal',
        defense: 20,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      },

      // Eğlence İşletmeleri
      {
        id: 'nightclub',
        name: 'Gece Kulübü',
        type: 'entertainment',
        category: 'Eğlence İşletmeleri',
        description: 'Gece eğlence merkezi',
        baseIncome: 600,
        currentIncome: 600,
        level: 1,
        maxLevel: 10,
        buildCost: 50000,
        upgradeCost: 100000,
        buildTime: 480, // 8 saat
        upgradeTime: 720, // 12 saat
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: 8,
        riskLevel: 'medium',
        legalStatus: 'legal',
        defense: 25,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      },
      {
        id: 'casino',
        name: 'Casino',
        type: 'entertainment',
        category: 'Eğlence İşletmeleri',
        description: 'Lüks kumar salonu',
        baseIncome: 800,
        currentIncome: 800,
        level: 1,
        maxLevel: 10,
        buildCost: 100000,
        upgradeCost: 200000,
        buildTime: 720, // 12 saat
        upgradeTime: 1080, // 18 saat
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: 10,
        riskLevel: 'high',
        legalStatus: 'illegal',
        defense: 50,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      },

      // Teknoloji İşletmeleri
      {
        id: 'software_company',
        name: 'Yazılım Şirketi',
        type: 'technology',
        category: 'Teknoloji İşletmeleri',
        description: 'Yazılım geliştirme ve teknoloji',
        baseIncome: 1000,
        currentIncome: 1000,
        level: 1,
        maxLevel: 10,
        buildCost: 200000,
        upgradeCost: 400000,
        buildTime: 960, // 16 saat
        upgradeTime: 1440, // 24 saat
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: 12,
        riskLevel: 'low',
        legalStatus: 'legal',
        defense: 30,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      },

      // Finans İşletmeleri
      {
        id: 'private_bank',
        name: 'Özel Banka',
        type: 'finance',
        category: 'Finans İşletmeleri',
        description: 'Özel bankacılık hizmetleri',
        baseIncome: 2000,
        currentIncome: 2000,
        level: 1,
        maxLevel: 10,
        buildCost: 500000,
        upgradeCost: 1000000,
        buildTime: 1200, // 20 saat
        upgradeTime: 1800, // 30 saat
        isBuilding: false,
        isUpgrading: false,
        requiredLevel: 15,
        riskLevel: 'medium',
        legalStatus: 'legal',
        defense: 100,
        lastIncomeCollection: new Date(),
        totalEarnings: 0,
        efficiency: 100,
        features: []
      }
    ];
  }

  private initializeTerritories() {
    this.territories = [
      {
        id: 'downtown',
        name: 'Şehir Merkezi',
        owner: 'Oyuncu',
        income: 200,
        defense: 50,
        soldiers: 10,
        status: 'owned',
      },
      {
        id: 'docks',
        name: 'Liman Bölgesi',
        owner: 'Düşman',
        income: 300,
        defense: 75,
        soldiers: 15,
        status: 'enemy',
      },
    ];
  }

  private initializeMissions() {
    this.missions = [
      {
        id: 'first_crime',
        title: 'İlk Suç',
        description: 'İlk suçunuzu işleyin',
        requirements: { minLevel: 1 },
        reward: 500,
        respectReward: 10,
        completed: false,
        difficulty: 'easy',
        progress: 0,
        maxProgress: 1,
        type: 'daily',
      },
    ];
  }

  private initializeFamilyMembers() {
    this.familyMembers = [
      {
        id: 'player',
        name: this.currentUsername,
        rank: 'Capo',
        level: 1,
        contribution: 0,
        online: true,
        lastSeen: 'Şimdi',
        joinDate: new Date(),
        lastActive: new Date(),
        caporegimes: 0,
        totalSoldiers: 0,
      },
    ];
  }

  private initializeLeaderboard() {
    this.leaderboard = [
      {
        id: 'player',
        playerName: this.currentUsername,
        rank: 'Soldato',
        level: 1,
        score: 0,
        position: 1,
      },
    ];
  }

  private initializeAvailableCaporegimes() {
    this.availableCaporegimes = [
      {
        id: 'cap_1',
        name: 'Marco Rossi',
        level: 3,
        soldiers: 5,
        maxSoldiers: 10,
        cost: 5000,
        strength: 25,
        isInFamily: false,
        earnings: 0,
        lastActive: new Date(),
      },
    ];
  }

  // İşletme metodları
  async buildBusiness(businessId: string): Promise<{ success: boolean; message: string }> {
    console.log('🏢 BUILD BUSINESS CALLED:', businessId);

    const { data, error } = await supabase.rpc('rpc_build_business', {
      p_business_id: businessId
    });

    if (error) {
      console.error('❌ buildBusiness error:', error);
      return { success: false, message: `İnşaat hatası: ${error.message}` };
    }

    const result = data?.[0];
    if (result?.success) {
      // Başarılı ise işletmeleri yeniden yükle
      await this.loadBusinessesFromSupabase();
      await this.loadPlayerStatsFromSupabase();
    }

    return {
      success: result?.success || false,
      message: result?.message || 'Bilinmeyen hata'
    };
  }

  private completeBuilding(businessId: string) {
    console.log('🏢 COMPLETING BUILDING:', businessId);

    const business = this.businesses.find(b => b.id === businessId);
    if (!business) return;

    business.isBuilding = false;
    business.buildStartTime = undefined;
    business.lastIncomeCollection = new Date();

    console.log('🏢 BUILDING COMPLETED:', business.name);

    // Olay bildirimi
    this.events.unshift({
      id: `building_${Date.now()}`,
      type: 'upgrade',
      message: `${business.name} inşaatı tamamlandı! Artık gelir üretiyor.`,
      timestamp: new Date(),
      data: { businessId: business.id, businessName: business.name },
    });

    // Supabase'e kaydet
    this.savePlayerStatsToSupabase();
  }

  async upgradeBusiness(businessId: string): Promise<{ success: boolean; message: string }> {
    console.log('🏢 UPGRADE BUSINESS CALLED:', businessId);

    const { data, error } = await supabase.rpc('rpc_upgrade_business', {
      p_business_id: businessId
    });

    if (error) {
      console.error('❌ upgradeBusiness error:', error);
      return { success: false, message: `Geliştirme hatası: ${error.message}` };
    }

    const result = data?.[0];
    if (result?.success) {
      // Başarılı ise işletmeleri yeniden yükle
      await this.loadBusinessesFromSupabase();
      await this.loadPlayerStatsFromSupabase();
    }

    return {
      success: result?.success || false,
      message: result?.message || 'Bilinmeyen hata'
    };
  }

  private completeUpgrade(businessId: string) {
    console.log('🏢 COMPLETING UPGRADE:', businessId);

    const business = this.businesses.find(b => b.id === businessId);
    if (!business) return;

    business.isUpgrading = false;
    business.upgradeStartTime = undefined;
    business.level++;

    // Geliri artır (seviye çarpanı)
    const incomeMultiplier = 1 + (business.level - 1) * 0.5; // Her seviye %50 artış
    business.currentIncome = Math.floor(business.baseIncome * incomeMultiplier);

    // Sonraki seviye için maliyeti artır
    business.upgradeCost = Math.floor(business.upgradeCost * 1.5);

    console.log('🏢 UPGRADE COMPLETED:', business.name, 'New Level:', business.level, 'New Income:', business.currentIncome);

    // Olay bildirimi
    this.events.unshift({
      id: `upgrade_${Date.now()}`,
      type: 'upgrade',
      message: `${business.name} ${business.level}. seviyeye yükseltildi! Yeni gelir: $${business.currentIncome.toLocaleString()}/saat`,
      timestamp: new Date(),
      data: { businessId: business.id, businessName: business.name, newLevel: business.level },
    });

    // Supabase'e kaydet
    this.savePlayerStatsToSupabase();
  }



  // MT Coin ile inşaatı hızlandır
  async finishBuildingWithMT(businessId: string): Promise<{ success: boolean; message: string }> {
    console.log('💎 FINISH BUILDING WITH MT:', businessId);

    const business = this.businesses.find(b => b.id === businessId);
    if (!business) {
      return { success: false, message: 'İşletme bulunamadı!' };
    }

    if (!business.isBuilding) {
      return { success: false, message: 'İşletme zaten inşa edilmiş!' };
    }

    // MT Coin maliyeti: İnşaat süresine göre (her 10 dakika = 1 MT)
    const mtCost = Math.ceil(business.buildTime / 10);

    // MT Coin kontrolü
    const spendResult = await this.spendMTCoins(mtCost, 'İnşaat Hızlandırma');
    if (!spendResult.success) {
      return spendResult;
    }

    // İnşaatı tamamla
    business.isBuilding = false;
    business.buildStartTime = undefined;

    // Supabase'de tamamla
    const { error } = await supabase
      .from('user_businesses')
      .update({
        is_building: false,
        build_start_time: null
      })
      .eq('user_id', this.currentUserId)
      .eq('business_id', businessId);

    if (error) {
      console.error('❌ Error finishing building:', error);
      return { success: false, message: 'İnşaat tamamlanamadı!' };
    }

    await this.loadBusinessesFromSupabase();

    return { success: true, message: `${business.name} inşaatı ${mtCost} MT ile tamamlandı!` };
  }

  // MT Coin ile yükseltmeyi hızlandır
  async finishUpgradeWithMT(businessId: string): Promise<{ success: boolean; message: string }> {
    console.log('💎 FINISH UPGRADE WITH MT:', businessId);

    const business = this.businesses.find(b => b.id === businessId);
    if (!business) {
      return { success: false, message: 'İşletme bulunamadı!' };
    }

    if (!business.isUpgrading) {
      return { success: false, message: 'İşletme zaten geliştirilmiş!' };
    }

    // MT Coin maliyeti: Yükseltme süresine göre (her 10 dakika = 1 MT)
    const mtCost = Math.ceil(business.upgradeTime / 10);

    // MT Coin kontrolü
    const spendResult = await this.spendMTCoins(mtCost, 'Yükseltme Hızlandırma');
    if (!spendResult.success) {
      return spendResult;
    }

    // Yükseltmeyi tamamla
    const { error } = await supabase.rpc('rpc_complete_upgrade', {
      p_business_id: businessId
    });

    if (error) {
      console.error('❌ Error finishing upgrade:', error);
      return { success: false, message: 'Yükseltme tamamlanamadı!' };
    }

    await this.loadBusinessesFromSupabase();
    await this.loadPlayerStatsFromSupabase();

    return { success: true, message: `${business.name} yükseltmesi ${mtCost} MT ile tamamlandı!` };
  }

  // İşletme gelirini topla
  async collectBusinessIncome(businessId: string): Promise<{ success: boolean; message: string; amount?: number }> {
    console.log('🏢 COLLECT BUSINESS INCOME:', businessId);

    const { data, error } = await supabase.rpc('rpc_collect_business_income', {
      p_business_id: businessId
    });

    if (error) {
      console.error('❌ collectBusinessIncome error:', error);
      return { success: false, message: `Gelir toplama hatası: ${error.message}` };
    }

    const result = data?.[0];
    if (result?.success) {
      // Başarılı ise verileri yeniden yükle
      await this.loadPlayerStatsFromSupabase();
    }

    return {
      success: result?.success || false,
      message: result?.message || 'Bilinmeyen hata',
      amount: result?.amount || 0
    };
  }

  // Tüm işletme gelirlerini topla
  collectAllBusinessIncome(): { success: boolean; message: string; totalAmount?: number } {
    console.log('🏢 COLLECT ALL BUSINESS INCOME');

    let totalIncome = 0;
    const now = new Date();

    for (const business of this.businesses) {
      if (business.isBuilding) continue;

      const timeDiff = now.getTime() - business.lastIncomeCollection.getTime();
      const hoursPassed = timeDiff / (1000 * 60 * 60);
      const income = Math.floor(business.currentIncome * hoursPassed);

      if (income > 0) {
        totalIncome += income;
        business.totalEarnings += income;
        business.lastIncomeCollection = now;
      }
    }

    if (totalIncome <= 0) {
      return { success: false, message: 'Henüz toplanacak gelir yok!' };
    }

    this.playerStats.cash += totalIncome;
    this.playerStats.totalEarnings += totalIncome;

    console.log('🏢 ALL INCOME COLLECTED:', 'Total:', totalIncome);

    // Supabase'e kaydet
    this.savePlayerStatsToSupabase();

    return {
      success: true,
      message: `Tüm işletme gelirleri toplandı: $${totalIncome.toLocaleString()}`,
      totalAmount: totalIncome
    };
  }





  assignCaporegimeToTerritory(territoryId: string, caporegimeId: string): { success: boolean; message: string } {
    return { success: false, message: 'Caporegime atama henüz mevcut değil.' };
  }

  promoteMember(memberId: string, newRank: string): { success: boolean; message: string } {
    return { success: false, message: 'Üye terfi ettirme henüz mevcut değil.' };
  }

  addFamilyMember(caporegimeId: string): { success: boolean; message: string } {
    return { success: false, message: 'Aile üyesi ekleme henüz mevcut değil.' };
  }

  sendMessage(message: string): { success: boolean; message: string } {
    return { success: false, message: 'Mesaj gönderme henüz mevcut değil.' };
  }

  updatePlayerStats(updates: Partial<PlayerStats>): { success: boolean; message: string } {
    Object.assign(this.playerStats, updates);
    this.savePlayerStatsToSupabase();
    return { success: true, message: 'İstatistikler güncellendi.' };
  }
}

export const gameService = new GameService();