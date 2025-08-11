
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { NavigationProps } from '../shared/types';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  image: string;
}

const OnboardingScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: OnboardingSlide[] = [
    {
      id: 1,
      title: "Welcome to BrillPrime",
      description: "Your all-in-one platform for delivery, payments, and financial services in Nigeria",
      image: "onboarding_img1"
    },
    {
      id: 2,
      title: "Fast & Reliable Delivery",
      description: "Get your orders delivered quickly and safely to your doorstep",
      image: "onboarding_img2"
    },
    {
      id: 3,
      title: "Secure Payments",
      description: "Make payments safely with our secure and encrypted payment system",
      image: "onboarding_img3"
    }
  ];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      navigation.navigate('SignUp');
    }
  };

  const skipOnboarding = () => {
    navigation.navigate('SignIn');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.slideContainer}>
          <View style={styles.imageContainer}>
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>{slides[currentSlide].image}</Text>
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{slides[currentSlide].title}</Text>
            <Text style={styles.description}>{slides[currentSlide].description}</Text>
          </View>

          <View style={styles.indicatorContainer}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentSlide ? styles.activeIndicator : styles.inactiveIndicator
                ]}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={nextSlide}>
          <Text style={styles.nextButtonText}>
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  skipText: {
    color: '#666',
    fontSize: 16,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  slideContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  imageContainer: {
    height: height * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#666',
    fontSize: 14,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeIndicator: {
    backgroundColor: '#4682b4',
  },
  inactiveIndicator: {
    backgroundColor: '#ccc',
  },
  buttonContainer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
  },
  nextButton: {
    backgroundColor: '#4682b4',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default OnboardingScreen;
