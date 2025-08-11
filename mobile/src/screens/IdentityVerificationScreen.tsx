
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import { NavigationProps } from '../shared/types';

interface DriverVerification {
  licenseNumber: string;
  licenseExpiry: string;
  vehicleType: string;
  vehiclePlate: string;
  vehicleModel: string;
  vehicleYear: string;
  faceVerification: boolean;
}

interface ConsumerVerification {
  phoneVerification: boolean;
  emailVerification: boolean;
  faceVerification: boolean;
}

const IdentityVerificationScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [userRole] = useState<'DRIVER' | 'CONSUMER'>('CONSUMER'); // This would come from auth context
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationData, setVerificationData] = useState<DriverVerification | ConsumerVerification>(
    userRole === 'DRIVER' 
      ? { licenseNumber: '', licenseExpiry: '', vehicleType: '', vehiclePlate: '', vehicleModel: '', vehicleYear: '', faceVerification: false }
      : { phoneVerification: false, emailVerification: false, faceVerification: false }
  );
  const [loading, setLoading] = useState(false);

  const vehicleTypes = ['Motorcycle', 'Car', 'Van', 'Truck', 'Bicycle'];

  const driverSteps = [
    { title: 'Driver License', description: 'Upload your valid driver license' },
    { title: 'Vehicle Registration', description: 'Register your vehicle details' },
    { title: 'Face Verification', description: 'Verify your identity' },
  ];

  const consumerSteps = [
    { title: 'Email Verification', description: 'Verify your email address' },
    { title: 'Phone Verification', description: 'Verify your phone number' },
    { title: 'Face Verification', description: 'Verify your identity' },
  ];

  const steps = userRole === 'DRIVER' ? driverSteps : consumerSteps;

  const renderDriverLicenseStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Driver License Verification</Text>
      
      <TextInput
        style={styles.input}
        placeholder="License Number"
        value={(verificationData as DriverVerification).licenseNumber}
        onChangeText={(text) => setVerificationData(prev => ({
          ...prev,
          licenseNumber: text
        }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Expiry Date (YYYY-MM-DD)"
        value={(verificationData as DriverVerification).licenseExpiry}
        onChangeText={(text) => setVerificationData(prev => ({
          ...prev,
          licenseExpiry: text
        }))}
      />

      <TouchableOpacity style={styles.uploadButton}>
        <Text style={styles.uploadButtonText}>📷 Upload License Photo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderVehicleRegistrationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Vehicle Registration</Text>
      
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>Vehicle Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleTypeScroll}>
          {vehicleTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.vehicleTypeButton,
                (verificationData as DriverVerification).vehicleType === type && styles.selectedVehicleType
              ]}
              onPress={() => setVerificationData(prev => ({
                ...prev,
                vehicleType: type
              }))}
            >
              <Text style={[
                styles.vehicleTypeText,
                (verificationData as DriverVerification).vehicleType === type && styles.selectedVehicleTypeText
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Vehicle Plate Number (e.g., LAG-123-AA)"
        value={(verificationData as DriverVerification).vehiclePlate}
        onChangeText={(text) => setVerificationData(prev => ({
          ...prev,
          vehiclePlate: text.toUpperCase()
        }))}
        autoCapitalize="characters"
      />

      <TextInput
        style={styles.input}
        placeholder="Vehicle Model (e.g., Honda CB 150)"
        value={(verificationData as DriverVerification).vehicleModel}
        onChangeText={(text) => setVerificationData(prev => ({
          ...prev,
          vehicleModel: text
        }))}
      />

      <TextInput
        style={styles.input}
        placeholder="Vehicle Year (e.g., 2020)"
        value={(verificationData as DriverVerification).vehicleYear}
        onChangeText={(text) => setVerificationData(prev => ({
          ...prev,
          vehicleYear: text
        }))}
        keyboardType="numeric"
      />
    </View>
  );

  const renderFaceVerificationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Face Verification</Text>
      <Text style={styles.stepDescription}>
        Take a clear photo of your face for identity verification
      </Text>

      <View style={styles.cameraContainer}>
        <Text style={styles.cameraIcon}>📸</Text>
        <TouchableOpacity style={styles.cameraButton}>
          <Text style={styles.cameraButtonText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton}>
          <Text style={styles.uploadButtonText}>Upload from Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConsumerVerificationSteps = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Consumer Verification</Text>
      
      <View style={styles.verificationCard}>
        <Text style={styles.verificationIcon}>📧</Text>
        <View style={styles.verificationInfo}>
          <Text style={styles.verificationTitle}>Email Verification</Text>
          <Text style={styles.verificationStatus}>✅ Verified</Text>
        </View>
      </View>

      <View style={styles.verificationCard}>
        <Text style={styles.verificationIcon}>📱</Text>
        <View style={styles.verificationInfo}>
          <Text style={styles.verificationTitle}>Phone Verification</Text>
          <TouchableOpacity style={styles.verifyButton}>
            <Text style={styles.verifyButtonText}>Verify Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Simulate API submission
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Verification Submitted',
          'Your identity verification has been submitted for review.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
      }, 2000);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to submit verification');
    }
  };

  const canProceed = () => {
    if (userRole === 'DRIVER') {
      const data = verificationData as DriverVerification;
      switch (currentStep) {
        case 0:
          return data.licenseNumber && data.licenseExpiry;
        case 1:
          return data.vehicleType && data.vehiclePlate && data.vehicleModel && data.vehicleYear;
        case 2:
          return true; // Face verification step
        default:
          return false;
      }
    } else {
      return currentStep === steps.length - 1;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Identity Verification</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressStep,
              index === currentStep && styles.activeStep,
              index < currentStep && styles.completedStep,
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.stepNumber}>Step {currentStep + 1} of {steps.length}</Text>
          
          {userRole === 'DRIVER' ? (
            <>
              {currentStep === 0 && renderDriverLicenseStep()}
              {currentStep === 1 && renderVehicleRegistrationStep()}
              {currentStep === 2 && renderFaceVerificationStep()}
            </>
          ) : (
            <>
              {currentStep < 2 ? renderConsumerVerificationSteps() : renderFaceVerificationStep()}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.backStepButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.backStepButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        {currentStep < steps.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed() && styles.disabledButton]}
            onPress={() => setCurrentStep(currentStep + 1)}
            disabled={!canProceed()}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitButton, !canProceed() && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={!canProceed() || loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Submitting...' : 'Complete Verification'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  backButtonText: {
    fontSize: 18,
    color: '#4682b4',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#131313',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: '#e9ecef',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  activeStep: {
    backgroundColor: '#4682b4',
  },
  completedStep: {
    backgroundColor: '#28a745',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  stepNumber: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#131313',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#131313',
    marginBottom: 8,
  },
  vehicleTypeScroll: {
    maxHeight: 50,
  },
  vehicleTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedVehicleType: {
    backgroundColor: '#4682b4',
    borderColor: '#4682b4',
  },
  vehicleTypeText: {
    fontSize: 14,
    color: '#131313',
  },
  selectedVehicleTypeText: {
    color: '#ffffff',
  },
  uploadButton: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#4682b4',
    fontWeight: '500',
  },
  cameraContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  cameraIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  cameraButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  cameraButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  verificationIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  verificationInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#131313',
  },
  verificationStatus: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
  },
  verifyButton: {
    backgroundColor: '#4682b4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  backStepButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  backStepButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#4682b4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#010e42',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default IdentityVerificationScreen;
