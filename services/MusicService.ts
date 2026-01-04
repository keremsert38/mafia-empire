// Background Music Service using expo-av
// Müzik servisi - arkada düşük sesle çalar, ayarlardan kapatılabilir

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUSIC_ENABLED_KEY = '@music_enabled';
const MUSIC_VOLUME = 0.15; // Düşük ses seviyesi (%15)

class MusicService {
    private static instance: MusicService;
    private sound: Audio.Sound | null = null;
    private isPlaying: boolean = false;
    private isEnabled: boolean = true;

    private constructor() { }

    static getInstance(): MusicService {
        if (!MusicService.instance) {
            MusicService.instance = new MusicService();
        }
        return MusicService.instance;
    }

    async initialize(): Promise<void> {
        try {
            // Kayıtlı ayarı yükle
            const savedEnabled = await AsyncStorage.getItem(MUSIC_ENABLED_KEY);
            this.isEnabled = savedEnabled !== 'false';

            // Audio mode ayarla
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: true,
                staysActiveInBackground: true,
                shouldDuckAndroid: true,
            });

            console.log('🎵 Music service initialized, enabled:', this.isEnabled);
        } catch (error) {
            console.error('Music service init error:', error);
        }
    }

    async loadAndPlay(): Promise<void> {
        if (!this.isEnabled) {
            console.log('🎵 Music disabled, not playing');
            return;
        }

        try {
            // Eğer zaten çalıyorsa, tekrar yükleme
            if (this.sound && this.isPlaying) {
                return;
            }

            // Ses dosyasını yükle
            const audioSource = require('../assets/music/background.mp3');

            if (!audioSource) {
                console.log('🎵 Music file not found, skipping');
                return;
            }

            const { sound } = await Audio.Sound.createAsync(
                audioSource,
                {
                    isLooping: true,
                    volume: MUSIC_VOLUME,
                    shouldPlay: true,
                }
            );

            this.sound = sound;
            this.isPlaying = true;
            console.log('🎵 Background music started');
        } catch (error) {
            console.log('🎵 Music not available:', error);
        }
    }

    async stop(): Promise<void> {
        try {
            if (this.sound) {
                await this.sound.stopAsync();
                await this.sound.unloadAsync();
                this.sound = null;
                this.isPlaying = false;
                console.log('🎵 Music stopped');
            }
        } catch (error) {
            console.error('Failed to stop music:', error);
        }
    }

    async setEnabled(enabled: boolean): Promise<void> {
        this.isEnabled = enabled;
        await AsyncStorage.setItem(MUSIC_ENABLED_KEY, enabled ? 'true' : 'false');

        if (enabled) {
            await this.loadAndPlay();
        } else {
            await this.stop();
        }
    }

    getEnabled(): boolean {
        return this.isEnabled;
    }

    async setVolume(volume: number): Promise<void> {
        if (this.sound) {
            await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
        }
    }
}

export const musicService = MusicService.getInstance();
