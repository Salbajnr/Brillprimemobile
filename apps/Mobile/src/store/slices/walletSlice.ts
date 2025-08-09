import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WalletState {
  balance: string;
  transactions: any[];
  paymentMethods: any[];
  loading: boolean;
  error: string | null;
}

const initialState: WalletState = {
  balance: '0.00',
  transactions: [],
  paymentMethods: [],
  loading: false,
  error: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setBalance: (state, action: PayloadAction<string>) => {
      state.balance = action.payload;
    },
    setTransactions: (state, action: PayloadAction<any[]>) => {
      state.transactions = action.payload;
      state.loading = false;
      state.error = null;
    },
    addTransaction: (state, action: PayloadAction<any>) => {
      state.transactions.unshift(action.payload);
    },
    setPaymentMethods: (state, action: PayloadAction<any[]>) => {
      state.paymentMethods = action.payload;
    },
    addPaymentMethod: (state, action: PayloadAction<any>) => {
      state.paymentMethods.push(action.payload);
    },
    removePaymentMethod: (state, action: PayloadAction<string>) => {
      state.paymentMethods = state.paymentMethods.filter(
        method => method.id !== action.payload
      );
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setBalance,
  setTransactions,
  addTransaction,
  setPaymentMethods,
  addPaymentMethod,
  removePaymentMethod,
  setError,
  clearError,
} = walletSlice.actions;

export default walletSlice.reducer;