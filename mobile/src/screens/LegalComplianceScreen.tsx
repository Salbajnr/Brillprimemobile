
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface ComplianceData {
  terms: any;
  privacy: any;
  ndpr: any;
}

export default function LegalComplianceScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('terms');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      const [termsRes, privacyRes, ndprRes] = await Promise.all([
        fetch('/api/legal/terms-of-service'),
        fetch('/api/legal/privacy-policy'),
        fetch('/api/compliance/ndpr-compliance', {
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const [terms, privacy, ndpr] = await Promise.all([
        termsRes.json(),
        privacyRes.json(),
        ndprRes.json()
      ]);

      setComplianceData({ terms, privacy, ndpr });
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    }
  };

  const acceptTerms = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/legal/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: 'v1.0',
          ipAddress: 'mobile-app'
        })
      });

      if (response.ok) {
        setTermsAccepted(true);
        Alert.alert('Success', 'Terms of service accepted successfully');
      }
    } catch (error) {
      console.error('Failed to accept terms:', error);
      Alert.alert('Error', 'Failed to accept terms');
    } finally {
      setLoading(false);
    }
  };

  const requestDataExport = async () => {
    try {
      const response = await fetch('/api/data-privacy/request-data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'ACCESS',
          reason: 'User requested data export'
        })
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert(
          'Request Submitted',
          'Data export request submitted. You will receive a download link via email within 72 hours.'
        );
      }
    } catch (error) {
      console.error('Failed to request data export:', error);
    }
  };

  const TabButton = ({ id, title }: { id: string; title: string }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === id && styles.activeTabButton]}
      onPress={() => setActiveTab(id)}
    >
      <Text style={[styles.tabText, activeTab === id && styles.activeTabText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderTermsContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Terms of Service</Text>
      {termsAccepted && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Accepted</Text>
        </View>
      )}
      
      {complianceData?.terms && (
        <View>
          <View style={styles.textContainer}>
            <Text style={styles.contentText}>
              {complianceData.terms.terms?.content}
            </Text>
          </View>
          
          {!termsAccepted && (
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={acceptTerms}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Accept Terms of Service</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.helperText}>
                By clicking accept, you agree to our terms and conditions
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderPrivacyContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Privacy Policy</Text>
      {complianceData?.privacy && (
        <View style={styles.textContainer}>
          <Text style={styles.contentText}>
            {complianceData.privacy.privacyPolicy?.content}
          </Text>
        </View>
      )}
    </View>
  );

  const renderGDPRContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Your Data Protection Rights</Text>
      
      <View style={styles.rightsContainer}>
        <View style={styles.rightCard}>
          <Text style={styles.rightTitle}>Right to Access</Text>
          <Text style={styles.rightDescription}>
            Request a copy of all personal data we hold about you
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={requestDataExport}>
            <Text style={styles.secondaryButtonText}>Request Data Export</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightCard}>
          <Text style={styles.rightTitle}>Right to Rectification</Text>
          <Text style={styles.rightDescription}>
            Correct any inaccurate personal information
          </Text>
          <TouchableOpacity style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Update Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightCard}>
          <Text style={styles.rightTitle}>Right to Erasure</Text>
          <Text style={styles.rightDescription}>
            Request deletion of your personal data
          </Text>
          <TouchableOpacity style={styles.dangerButton}>
            <Text style={styles.buttonText}>Request Deletion</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rightCard}>
          <Text style={styles.rightTitle}>Data Portability</Text>
          <Text style={styles.rightDescription}>
            Get your data in a portable format
          </Text>
          <TouchableOpacity style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Export Data</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contactContainer}>
        <Text style={styles.contactTitle}>Contact Data Protection Officer</Text>
        <Text style={styles.contactText}>
          For any data protection concerns, contact our DPO at privacy@brillprime.com
        </Text>
      </View>
    </View>
  );

  const renderPCIContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Payment Card Industry (PCI DSS) Compliance</Text>
      
      <View style={styles.complianceGrid}>
        <View style={styles.complianceCard}>
          <Text style={styles.complianceTitle}>Security Measures</Text>
          <Text style={styles.complianceItem}>• End-to-end encryption</Text>
          <Text style={styles.complianceItem}>• Secure data transmission</Text>
          <Text style={styles.complianceItem}>• No card data storage</Text>
          <Text style={styles.complianceItem}>• Regular security audits</Text>
        </View>

        <View style={styles.complianceCard}>
          <Text style={styles.complianceTitle}>Compliance Status</Text>
          <Text style={styles.complianceItem}>• PCI DSS Level 1 Certified</Text>
          <Text style={styles.complianceItem}>• Annual security assessments</Text>
          <Text style={styles.complianceItem}>• Vulnerability scanning</Text>
          <Text style={styles.complianceItem}>• Incident response plan</Text>
        </View>
      </View>

      <View style={styles.responsibilityContainer}>
        <Text style={styles.responsibilityTitle}>Your Responsibilities</Text>
        <Text style={styles.complianceItem}>• Never share your payment information</Text>
        <Text style={styles.complianceItem}>• Use secure networks for transactions</Text>
        <Text style={styles.complianceItem}>• Report suspicious activities immediately</Text>
        <Text style={styles.complianceItem}>• Keep your account credentials secure</Text>
      </View>
    </View>
  );

  const renderNigerianContent = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>Nigerian Regulatory Compliance</Text>
      
      {complianceData?.ndpr && (
        <View style={styles.complianceGrid}>
          <View style={styles.complianceCard}>
            <Text style={styles.complianceTitle}>NDPR Compliance</Text>
            <Text style={styles.complianceDescription}>
              Nigerian Data Protection Regulation compliance
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Registered with NITDA</Text>
            </View>
          </View>

          <View style={styles.complianceCard}>
            <Text style={styles.complianceTitle}>CBN Licensed</Text>
            <Text style={styles.complianceDescription}>
              Central Bank of Nigeria Payment Service Provider
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>PSP License Active</Text>
            </View>
          </View>

          <View style={styles.complianceCard}>
            <Text style={styles.complianceTitle}>NIBSS Integration</Text>
            <Text style={styles.complianceDescription}>
              Nigeria Inter-Bank Settlement System
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Certified Participant</Text>
            </View>
          </View>

          <View style={styles.complianceCard}>
            <Text style={styles.complianceTitle}>Consumer Protection</Text>
            <Text style={styles.complianceDescription}>
              Full consumer protection framework
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CBN Guidelines</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.regulatoryContainer}>
        <Text style={styles.regulatoryTitle}>Regulatory Oversight</Text>
        <Text style={styles.regulatoryItem}>
          <Text style={styles.regulatoryLabel}>Primary Regulator:</Text> Central Bank of Nigeria (CBN)
        </Text>
        <Text style={styles.regulatoryItem}>
          <Text style={styles.regulatoryLabel}>Data Protection:</Text> Nigeria Data Protection Commission (NDPC)
        </Text>
        <Text style={styles.regulatoryItem}>
          <Text style={styles.regulatoryLabel}>Consumer Protection:</Text> CBN Consumer Protection Department
        </Text>
        <Text style={styles.regulatoryItem}>
          <Text style={styles.regulatoryLabel}>Complaints:</Text> contact@brillprime.com | CBN Consumer Help Desk
        </Text>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'terms':
        return renderTermsContent();
      case 'privacy':
        return renderPrivacyContent();
      case 'gdpr':
        return renderGDPRContent();
      case 'pci':
        return renderPCIContent();
      case 'nigerian':
        return renderNigerianContent();
      default:
        return renderTermsContent();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal & Compliance</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
        <TabButton id="terms" title="Terms" />
        <TabButton id="privacy" title="Privacy" />
        <TabButton id="gdpr" title="GDPR Rights" />
        <TabButton id="pci" title="Payment Security" />
        <TabButton id="nigerian" title="Nigerian" />
      </ScrollView>

      <ScrollView style={styles.content}>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  tabContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#007bff',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  activeTabText: {
    color: '#007bff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  badge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  textContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  actionContainer: {
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#007bff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  outlineButtonText: {
    color: '#007bff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  rightsContainer: {
    gap: 16,
  },
  rightCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  rightDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  contactContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b5e20',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#2e7d32',
  },
  complianceGrid: {
    gap: 16,
  },
  complianceCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  complianceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  complianceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  complianceItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  responsibilityContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  responsibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  regulatoryContainer: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  regulatoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b5e20',
    marginBottom: 8,
  },
  regulatoryItem: {
    fontSize: 14,
    color: '#2e7d32',
    marginBottom: 4,
  },
  regulatoryLabel: {
    fontWeight: '600',
  },
});
