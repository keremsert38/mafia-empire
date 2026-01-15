import { useState, useEffect } from 'react';
import { gameService } from '@/services/gameService';
import { PlayerStats, Business, Territory, Mission, FamilyMember, ChatMessage, GameEvent, Leaderboard, Crime, Caporegime } from '@/types/game';
import { useAuth } from '@/contexts/AuthContext';

export function useGameService() {
  const { user } = useAuth();
  const [gameServiceInstance] = useState(() => gameService);
  const [playerStats, setPlayerStats] = useState<PlayerStats>(gameServiceInstance.getPlayerStats());
  const [businesses, setBusinesses] = useState<Business[]>(gameServiceInstance.getBusinesses());
  const [territories, setTerritories] = useState<Territory[]>(gameServiceInstance.getTerritories());
  const [missions, setMissions] = useState<Mission[]>(gameServiceInstance.getMissions());
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(gameServiceInstance.getFamilyMembers());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(gameServiceInstance.getChatMessages());
  const [events, setEvents] = useState<GameEvent[]>(gameServiceInstance.getEvents());
  const [crimes, setCrimes] = useState<Crime[]>(gameServiceInstance.getCrimes());
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>(gameServiceInstance.getLeaderboard());
  const [availableCaporegimes, setAvailableCaporegimes] = useState<Caporegime[]>(gameServiceInstance.getAvailableCaporegimes());
  const [activeCrimeTimeRemaining, setActiveCrimeTimeRemaining] = useState<number>(0);

  // Initialize game service for logged in user
  useEffect(() => {
    if (user) {
      console.log('🔥 USER CHANGED IN HOOK:', user.id);
      const username = user.user_metadata?.username || user.email?.split('@')[0] || 'Oyuncu';

      // Async olarak initialize et
      const initializeGame = async () => {
        await gameServiceInstance.initializeForUser(user.id, username);

        // Initialize tamamlandıktan sonra state'leri güncelle
        setPlayerStats(gameServiceInstance.getPlayerStats());
        setBusinesses(gameServiceInstance.getBusinesses());
        setTerritories(gameServiceInstance.getTerritories());
        setMissions(gameServiceInstance.getMissions());
        setFamilyMembers(gameServiceInstance.getFamilyMembers());
        setChatMessages(gameServiceInstance.getChatMessages());
        setEvents(gameServiceInstance.getEvents());
        setCrimes(gameServiceInstance.getCrimes());
        setLeaderboard(gameServiceInstance.getLeaderboard());
        setAvailableCaporegimes(gameServiceInstance.getAvailableCaporegimes());
      };

      initializeGame();
    }
  }, [user, gameServiceInstance]);

  useEffect(() => {
    const updateGameState = () => {
      // Enerjiyi oyun içinde yenile
      gameServiceInstance.regenerateEnergy();
      const newPlayerStats = gameServiceInstance.getPlayerStats();
      setPlayerStats(newPlayerStats);
      setBusinesses(gameServiceInstance.getBusinesses());
      setTerritories(gameServiceInstance.getTerritories());
      setMissions(gameServiceInstance.getMissions());
      setFamilyMembers(gameServiceInstance.getFamilyMembers());
      setChatMessages(gameServiceInstance.getChatMessages());
      setEvents(gameServiceInstance.getEvents());
      setCrimes(gameServiceInstance.getCrimes());
      setLeaderboard(gameServiceInstance.getLeaderboard());
      setAvailableCaporegimes(gameServiceInstance.getAvailableCaporegimes());
      setActiveCrimeTimeRemaining(gameServiceInstance.getActiveCrimeTimeRemaining());
    };

    // Update game state every second
    const interval = setInterval(updateGameState, 1000);

    const handleNewChatMessage = (message: ChatMessage) => {
      // Handle new chat message
    };

    // Event listeners would be added here when implemented

    return () => {
      clearInterval(interval);
      // Cleanup listeners if needed
    };
  }, [gameServiceInstance]);

  const attackRegion = async (regionId: string, soldiersToSend?: number) => {
    const res = await gameServiceInstance.attackTerritory(regionId, soldiersToSend);
    // state'i tazele
    setPlayerStats(gameServiceInstance.getPlayerStats());
    setTerritories(gameServiceInstance.getTerritories());
    return res;
  };

  const claimIncome = async () => {
    const res = await gameServiceInstance.claimPassiveIncome();
    setPlayerStats(gameServiceInstance.getPlayerStats());
    return res;
  };

  const withdrawSoldiers = async (territoryId: string, amount: number) => {
    const res = await gameServiceInstance.withdrawSoldiers(territoryId, amount);
    setPlayerStats(gameServiceInstance.getPlayerStats());
    setTerritories(gameServiceInstance.getTerritories());
    return res;
  };

  return {
    gameService: gameServiceInstance,
    playerStats,
    businesses,
    territories,
    missions,
    familyMembers,
    chatMessages,
    events,
    crimes,
    leaderboard,
    availableCaporegimes,
    activeCrimeTimeRemaining,
    isCommittingCrime: gameServiceInstance.isCommittingCrime(),
    attackRegion,
    claimIncome,
    withdrawSoldiers,
  };
}