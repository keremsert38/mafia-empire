// TutorialOverlay - Yeni oyuncu rehber overlay'i
// İlk ve son adım tam ekran, diğer adımlar kompakt banner

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { X, ChevronRight, SkipForward, Target } from 'lucide-react-native';
import { useTutorial } from '@/contexts/TutorialContext';

export default function TutorialOverlay() {
    const {
        currentStep,
        isVisible,
        steps,
        getCurrentStepData,
        completeStep,
        skipTutorial,
        hideTutorial,
    } = useTutorial();

    if (!isVisible) return null;

    const stepData = getCurrentStepData();
    const progress = ((currentStep + 1) / steps.length) * 100;

    const isLastStep = currentStep === 6;
    const isFirstStep = currentStep === 0;

    // İlk ve son adım tam ekran, diğerleri kompakt banner
    const isFullScreen = isFirstStep || isLastStep;

    // Kompakt Banner (Görev adımları için)
    if (!isFullScreen) {
        return (
            <View style={styles.bannerContainer}>
                <View style={styles.banner}>
                    {/* Progress indicator */}
                    <View style={styles.bannerProgress}>
                        <View style={[styles.bannerProgressFill, { width: `${progress}%` }]} />
                    </View>

                    <View style={styles.bannerContent}>
                        <View style={styles.bannerLeft}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepBadgeText}>{currentStep + 1}/{steps.length}</Text>
                            </View>
                            <View style={styles.bannerTextContainer}>
                                <Text style={styles.bannerTitle}>{stepData.icon} {stepData.title}</Text>
                                <Text style={styles.bannerDescription} numberOfLines={2}>
                                    {stepData.description}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.bannerSkipBtn} onPress={skipTutorial}>
                            <X size={18} color="#999" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    // Tam Ekran Modal (İlk ve son adım için)
    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>
                    {currentStep + 1} / {steps.length}
                </Text>

                {/* Content */}
                <View style={styles.content}>
                    <Text style={styles.icon}>{stepData.icon}</Text>
                    <Text style={styles.title}>{stepData.title}</Text>
                    <Text style={styles.description}>{stepData.description}</Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    {!isLastStep && (
                        <TouchableOpacity style={styles.skipButton} onPress={skipTutorial}>
                            <SkipForward size={16} color="#666" />
                            <Text style={styles.skipText}>Atla</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionButton} onPress={completeStep}>
                        <Text style={styles.actionText}>
                            {isLastStep ? 'Ödülü Al!' : 'Başla'}
                        </Text>
                        <ChevronRight size={18} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Banner Styles (Kompakt mod)
    bannerContainer: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 10,
    },
    banner: {
        backgroundColor: '#1a1a1a',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#d4af37',
        overflow: 'hidden',
        shadowColor: '#d4af37',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    bannerProgress: {
        height: 3,
        backgroundColor: '#333',
    },
    bannerProgressFill: {
        height: '100%',
        backgroundColor: '#d4af37',
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    bannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    stepBadge: {
        backgroundColor: '#d4af37',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        marginRight: 10,
    },
    stepBadgeText: {
        color: '#000',
        fontSize: 11,
        fontWeight: 'bold',
    },
    bannerTextContainer: {
        flex: 1,
    },
    bannerTitle: {
        color: '#d4af37',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    bannerDescription: {
        color: '#aaa',
        fontSize: 12,
        lineHeight: 16,
    },
    bannerSkipBtn: {
        padding: 8,
        marginLeft: 10,
    },

    // Full Screen Styles (İlk ve son adım)
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    container: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        width: '90%',
        padding: 25,
        borderWidth: 2,
        borderColor: '#d4af37',
    },
    progressContainer: {
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#d4af37',
        borderRadius: 2,
    },
    progressText: {
        color: '#666',
        fontSize: 12,
        textAlign: 'right',
        marginBottom: 20,
    },
    content: {
        alignItems: 'center',
        marginBottom: 25,
    },
    icon: {
        fontSize: 50,
        marginBottom: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#d4af37',
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 22,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    skipText: {
        color: '#666',
        marginLeft: 5,
        fontSize: 14,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#d4af37',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        marginLeft: 'auto',
    },
    actionText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 5,
    },
});
