
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  required: boolean;
}

export default function EnhancedVerificationScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      const response = await fetch('/api/verification/enhanced-status', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load verification status');

      const data = await response.json();
      
      const steps: VerificationStep[] = [
        {
          id: 'identity',
          title: 'Identity Verification',
          description: 'Verify your identity with government-issued ID',
          status: data.identity?.status || 'pending',
          required: true
        },
        {
          id: 'address',
          title: 'Address Verification',
          description: 'Confirm your residential address',
          status: data.address?.status || 'pending',
          required: true
        },
        {
          id: 'biometric',
          title: 'Biometric Verification',
          description: 'Facial recognition and liveness check',
          status: data.biometric?.status || 'pending',
          required: true
        },
        {
          id: 'income',
          title: 'Income Verification',
          description: 'Verify your source of income',
          status: data.income?.status || 'pending',
          required: false
        },
        {
          id: 'background',
          title: 'Background Check',
          description: 'Criminal background verification',
          status: data.background?.status || 'pending',
          required: false
        }
      ];

      setVerificationSteps(steps);
      
      // Find current step
      const pendingStepIndex = steps.findIndex(step => step.status === 'pending' || step.status === 'in_progress');
      setCurrentStep(pendingStepIndex >= 0 ? pendingStepIndex : steps.length);
      
    } catch (error) {
      console.error('Error loading verification status:', error);
      Alert.alert('Error', 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  };

  const startVerificationStep = async (stepId: string) => {
    try {
      const response = await fetch('/api/verification/start-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ stepId })
      });

      const result = await response.json();

      if (result.success) {
        // Navigate to appropriate verification screen
        switch (stepId) {
          case 'identity':
            navigation.navigate('IdentityVerification' as never);
            break;
          case 'address':
            Alert.alert('Address Verification', 'Please upload a utility bill or bank statement showing your address');
            break;
          case 'biometric':
            navigation.navigate('BiometricSetup' as never);
            break;
          case 'income':
            Alert.alert('Income Verification', 'Please provide salary slips or bank statements');
            break;
          case 'background':
            Alert.alert('Background Check', 'Background check will be initiated automatically');
            break;
        }
      } else {
        Alert.alert('Error', result.message || 'Failed to start verification step');
      }
    } catch (error) {
      console.error('Error starting verification step:', error);
      Alert.alert('Error', 'Failed to start verification step');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '⏳';
      case 'failed': return '❌';
      default: return '⭕';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in_progress': return '#ffc107';
      case 'failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getOverallProgress = () => {
    const completed = verificationSteps.filter(step => step.status === 'completed').length;
    const required = verificationSteps.filter(step => step.required).length;
    return Math.round((completed / verificationSteps.length) * 100);
  };

  const getRequiredProgress = () => {
    const requiredSteps = verificationSteps.filter(step => step.required);
    const completedRequired = requiredSteps.filter(step => step.status === 'completed').length;
    return Math.round((completedRequired / requiredSteps.length) * 100);
  };

  const isVerificationComplete = () => {
    const requiredSteps = verificationSteps.filter(step => step.required);
    return requiredSteps.every(step => step.status === 'completed');
  };

  const renderVerificationStep = (step: VerificationStep, index: number) => {
    const isActive = index === currentStep;
    const canStart = step.status === 'pending' && index <= currentStep;

    return (
      <View key={step.id} style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <View style={styles.stepLine} />
          <View style={[
            styles.stepStatus,
            { backgroundColor: getStatusColor(step.status) }
          ]}>
            <Text style={styles.stepStatusIcon}>
              {getStatusIcon(step.status)}
            </Text>
          </View>
        </View>

        <View style={[
          styles.stepCard,
          isActive && styles.activeStepCard,
          step.status === 'completed' && styles.completedStepCard
        ]}>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>
              {step.title}
              {step.required && <Text style={styles.requiredBadge}> *</Text>}
            </Text>
            <Text style={styles.stepDescription}>{step.description}</Text>
            
            <View style={styles.stepFooter}>
              <Text style={[
                styles.stepStatusText,
                { color: getStatusColor(step.status) }
              ]}>
                {step.status.replace('_', ' ').toUpperCase()}
              </Text>
              
              {canStart && (
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => startVerificationStep(step.id)}
                >
                  <Text style={styles.startButtonText}>
                    {step.status === 'in_progress' ? 'Continue' : 'Start'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading verification status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enhanced Verification</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Progress Overview */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>Verification Progress</Text>
          
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressNumber}>{getOverallProgress()}%</Text>
              <Text style={styles.progressLabel}>Overall</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressNumber}>{getRequiredProgress()}%</Text>
              <Text style={styles.progressLabel}>Required</Text>
            </View>
          </View>

          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressBarFill,
                { width: `${getRequiredProgress()}%` }
              ]} 
            />
          </View>

          {isVerificationComplete() && (
            <View style={styles.completionBadge}>
              <Text style={styles.completionBadgeText}>
                ✅ Verification Complete!
              </Text>
            </View>
          )}
        </View>

        {/* Verification Steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Verification Steps</Text>
          
          {verificationSteps.map((step, index) => renderVerificationStep(step, index))}
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Enhanced Verification Benefits</Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🚀</Text>
              <Text style={styles.benefitText}>Higher transaction limits</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🛡️</Text>
              <Text style={styles.benefitText}>Enhanced security features</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>⭐</Text>
              <Text style={styles.benefitText}>Priority customer support</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💳</Text>
              <Text style={styles.benefitText}>Access to premium features</Text>
            </View>
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityTitle}>🔒 Security & Privacy</Text>
          <Text style={styles.securityText}>
            All verification data is encrypted and stored securely. We comply with data protection regulations and only use your information for verification purposes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 24,
    marginRight: 16,
    color: '#007bff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  progressContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007bff',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  completionBadge: {
    backgroundColor: '#d4edda',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  completionBadgeText: {
    color: '#155724',
    fontWeight: 'bold',
  },
  stepsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepHeader: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 2,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginBottom: 8,
  },
  stepStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepStatusIcon: {
    fontSize: 12,
  },
  stepCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  activeStepCard: {
    borderColor: '#007bff',
    backgroundColor: '#f0f8ff',
  },
  completedStepCard: {
    borderColor: '#28a745',
    backgroundColor: '#f0fff0',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  requiredBadge: {
    color: '#dc3545',
    fontSize: 16,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  stepFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  startButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  startButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  benefitsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
  },
  securityNotice: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1b5e20',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 14,
    color: '#2e7d32',
    lineHeight: 20,
  },
});
