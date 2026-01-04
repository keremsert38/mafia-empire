// Tutorial Context - Yeni oyuncu rehberi state yönetimi

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface TutorialStep {
    id: number;
    title: string;
    description: string;
    target: string; // Hangi aksiyonu yapmalı
    icon: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
    { id: 0, title: 'Hoş Geldin!', description: 'Mafya imparatorluğuna hoş geldin! Şimdi sana temel adımları öğreteceğiz.', target: 'start', icon: '👋' },
    { id: 1, title: 'İlk Para', description: 'Suç işleyerek ilk paramızı kazanalım. Sol üstteki Suç butonuna tıkla!', target: 'crime', icon: '💰' },
    { id: 2, title: 'İlk Soldato', description: 'Ordunu kur! Soldato satın alarak gücünü artır.', target: 'soldier', icon: '⚔️' },
    { id: 3, title: 'İlk Bölge', description: 'Haritada bir bölge ele geçir ve gelir elde etmeye başla!', target: 'region', icon: '🗺️' },
    { id: 4, title: 'İlk İşletme', description: 'İşletme sekmesinden bir işletme satın al.', target: 'business', icon: '🏢' },
    { id: 5, title: 'Aileye Katıl', description: 'Bir aile kur veya mevcut bir aileye katıl!', target: 'family', icon: '👨‍👩‍👧‍👦' },
    { id: 6, title: 'Tamamlandı!', description: 'Harika! Artık oyuna hazırsın. $1,000 ödülün hesabına eklendi!', target: 'complete', icon: '🎉' },
];

interface TutorialContextType {
    currentStep: number;
    isCompleted: boolean;
    isVisible: boolean;
    steps: TutorialStep[];
    getCurrentStepData: () => TutorialStep;
    completeStep: () => Promise<void>;
    skipTutorial: () => Promise<void>;
    checkStepCompletion: (action: string) => Promise<void>;
    hideTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [isCompleted, setIsCompleted] = useState(true); // Başta gizle
    const [isVisible, setIsVisible] = useState(false);

    // Tutorial durumunu yükle
    const loadTutorialState = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('player_stats')
                .select('tutorial_step, tutorial_completed')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Tutorial state load error:', error);
                return;
            }

            if (data) {
                setCurrentStep(data.tutorial_step || 0);
                setIsCompleted(data.tutorial_completed || false);
                setIsVisible(!data.tutorial_completed && data.tutorial_step < 7);
            }
        } catch (error) {
            console.error('Tutorial state error:', error);
        }
    }, [user]);

    useEffect(() => {
        loadTutorialState();
    }, [loadTutorialState]);

    const getCurrentStepData = (): TutorialStep => {
        return TUTORIAL_STEPS[currentStep] || TUTORIAL_STEPS[0];
    };

    const completeStep = async () => {
        if (!user || currentStep >= 6) return;

        const nextStep = currentStep + 1;

        try {
            if (nextStep === 6) {
                // Son adım - tutorial tamamlandı, ödül ver
                const { data, error } = await supabase.rpc('rpc_complete_tutorial');

                if (error) {
                    console.error('Complete tutorial error:', error);
                    return;
                }

                setIsCompleted(true);
                setIsVisible(false);
                setCurrentStep(7);
            } else {
                // Sonraki adıma geç
                await supabase.rpc('rpc_update_tutorial_step', { p_step: nextStep });
                setCurrentStep(nextStep);
            }
        } catch (error) {
            console.error('Complete step error:', error);
        }
    };

    const skipTutorial = async () => {
        if (!user) return;

        try {
            await supabase.rpc('rpc_skip_tutorial');
            setIsCompleted(true);
            setIsVisible(false);
            setCurrentStep(7);
        } catch (error) {
            console.error('Skip tutorial error:', error);
        }
    };

    // Aksiyon tamamlandığında otomatik adım kontrolü
    const checkStepCompletion = async (action: string) => {
        if (isCompleted || !isVisible) return;

        const step = TUTORIAL_STEPS[currentStep];
        if (!step) return;

        // Aksiyon mevcut adımla eşleşiyor mu?
        if (step.target === action) {
            await completeStep();
        }
    };

    const hideTutorial = () => {
        setIsVisible(false);
    };

    return (
        <TutorialContext.Provider value={{
            currentStep,
            isCompleted,
            isVisible,
            steps: TUTORIAL_STEPS,
            getCurrentStepData,
            completeStep,
            skipTutorial,
            checkStepCompletion,
            hideTutorial,
        }}>
            {children}
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const context = useContext(TutorialContext);
    if (!context) {
        throw new Error('useTutorial must be used within TutorialProvider');
    }
    return context;
}
