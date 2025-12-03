export interface PlayerStats {
  id: string;
  name: string;
  level: number;
  cash: number;
  respect: number;
  reputation: number; // New field replacing influence in UI
  soldiers: number;
  territories: number;
  health: number;
  energy: number;
  experience: number;
  experienceToNext: number;
  strength: number;
  defense: number;
  speed: number;
  intelligence: number;
  charisma: number;
  availablePoints: number;
  rank: 'Capo' | 'Sottocapo' | 'Consigliere' | 'Caporegime' | 'Soldato';
  familyId: string | null;
  familyRole: string | null;
  location: string;
  inventory: any[];
  achievements: any[];
  lastActive: Date;
  joinDate: Date;
  totalEarnings: number;
  battlesWon: number;
  battlesLost: number;
  caporegimes: Caporegime[];
  profileImage?: string;
  passiveIncome: number; // New field for passive income
  lastIncomeCollection: Date; // Track when income was last collected
  mtCoins: number; // MT Coins (premium currency)
}

export interface Business {
  id: string;
  name: string;
  type: 'street' | 'trade' | 'entertainment' | 'technology' | 'finance' | 'media' | 'health' | 'international';
  category: string;
  description: string;
  baseIncome: number;
  currentIncome: number;
  level: number;
  maxLevel: number;
  buildCost: number;
  upgradeCost: number;
  buildTime: number; // dakika cinsinden
  upgradeTime: number; // dakika cinsinden
  isBuilding: boolean;
  isUpgrading: boolean;
  buildStartTime?: number;
  upgradeStartTime?: number;
  requiredLevel: number;
  riskLevel: 'low' | 'medium' | 'high';
  legalStatus: 'legal' | 'illegal';
  defense: number;
  lastIncomeCollection: Date;
  totalEarnings: number;
  efficiency: number; // 0-100 arası verimlilik
  features: BusinessFeature[];
}

export interface BusinessFeature {
  id: string;
  name: string;
  description: string;
  cost: number;
  incomeMultiplier: number;
  efficiencyBonus: number;
  isUnlocked: boolean;
  isActive: boolean;
}

export interface Territory {
  id: string;
  name: string;
  owner: string;
  income: number;
  defense: number;
  soldiers: number;
  status: 'owned' | 'enemy' | 'neutral' | 'attacking';
  attackTime?: number;
  attackProgress?: number;
  assignedCaporegime?: string; // New field for assigned caporegime
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  requirements: {
    minLevel?: number;
    minCash?: number;
    minRespect?: number;
    minTerritories?: number;
    minBusinesses?: number;
    minCaporegimes?: number;
  };
  reward: number;
  respectReward: number;
  completed: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  progress: number;
  maxProgress: number;
  type: 'daily' | 'weekly' | 'achievement';
}

export interface FamilyMember {
  id: string;
  name: string;
  rank: 'Capo' | 'Sottocapo' | 'Consigliere' | 'Caporegime' | 'Soldato';
  level: number;
  contribution: number;
  online: boolean;
  lastSeen: string;
  joinDate: Date;
  superior?: string;
  promotedBy?: string;
  lastActive: Date;
  caporegimes: number;
  totalSoldiers: number;
  power?: number; // New field for member power
  profileImage?: string;
  reputation?: number;
  territories?: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  type: 'normal' | 'system';
}

export interface GameEvent {
  id: string;
  type: 'income' | 'attack' | 'upgrade' | 'mission' | 'family';
  message: string;
  timestamp: Date;
  data?: any;
}

export interface Leaderboard {
  id: string;
  playerName: string;
  rank: string;
  level: number;
  score: number;
  position: number;
  profileImage?: string;
  reputation?: number;
  territories?: number;
}

export interface Crime {
  id: string;
  name: string;
  description: string;
  minReward?: number;
  maxReward?: number;
  experienceReward?: number;
  energyCost: number;
  successRate: number;
  requiredLevel: number;
  cooldown: number;
  duration: number;
  baseReward: number;
  baseXP: number;
  riskLevel?: 'low' | 'medium' | 'high';
  category?: 'street' | 'business' | 'political' | 'international';
  lastUsed?: Date;
}

export interface Caporegime {
  id: string;
  name: string;
  level: number;
  soldiers: number;
  maxSoldiers: number;
  cost: number;
  strength: number;
  isInFamily: boolean;
  familyId?: string;
  earnings: number;
  lastActive: Date;
  assignedTerritory?: string; // New field for territory assignment
}

export interface GameState {
  playerStats: PlayerStats;
  businesses: Business[];
  missions: Mission[];
  chatMessages: ChatMessage[];
  events: GameEvent[];
  familyMembers: FamilyMember[];
  leaderboard: Leaderboard[];
  crimes: Crime[];
  territories: Territory[];
  availableCaporegimes: Caporegime[];
}