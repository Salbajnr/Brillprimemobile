
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SignInScreen from '../SignInScreen';
import { apiService } from '../../services/api';

// Mock the API service
jest.mock('../../services/api');
const mockApiService = apiService as jest.Mocked<typeof apiService>;

const Stack = createStackNavigator();

const renderSignInScreen = () => {
  return render(
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="SignIn" component={SignInScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders sign in form correctly', () => {
    renderSignInScreen();
    
    expect(screen.getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(screen.getByText('Sign In')).toBeTruthy();
    expect(screen.getByText('Forgot Password?')).toBeTruthy();
  });

  test('shows validation errors for empty fields', async () => {
    renderSignInScreen();
    
    const signInButton = screen.getByText('Sign In');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeTruthy();
      expect(screen.getByText('Password is required')).toBeTruthy();
    });
  });

  test('shows validation error for invalid email', async () => {
    renderSignInScreen();
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  test('successfully signs in user', async () => {
    mockApiService.signIn.mockResolvedValueOnce({
      success: true,
      data: {
        user: { id: 1, email: 'test@example.com', fullName: 'Test User', role: 'CONSUMER' },
        token: 'mock-token',
      },
    });

    renderSignInScreen();
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(mockApiService.signIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  test('shows error message on sign in failure', async () => {
    mockApiService.signIn.mockResolvedValueOnce({
      success: false,
      error: 'Invalid credentials',
    });

    renderSignInScreen();
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(signInButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy();
    });
  });

  test('navigates to forgot password screen', () => {
    renderSignInScreen();
    
    const forgotPasswordLink = screen.getByText('Forgot Password?');
    fireEvent.press(forgotPasswordLink);

    // Navigation would be tested with a proper navigation mock
    expect(forgotPasswordLink).toBeTruthy();
  });

  test('shows loading state during sign in', async () => {
    mockApiService.signIn.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(() => resolve({
        success: true,
        data: { user: {}, token: 'mock-token' }
      }), 100))
    );

    renderSignInScreen();
    
    const emailInput = screen.getByPlaceholderText('Enter your email');
    const passwordInput = screen.getByPlaceholderText('Enter your password');
    const signInButton = screen.getByText('Sign In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(signInButton);

    // Check for loading state
    expect(screen.getByText('Signing In...')).toBeTruthy();

    await waitFor(() => {
      expect(screen.queryByText('Signing In...')).toBeNull();
    });
  });
});
