import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface OrdersState {
  orders: any[];
  activeOrder: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  orders: [],
  activeOrder: null,
  loading: false,
  error: null,
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setOrders: (state, action: PayloadAction<any[]>) => {
      state.orders = action.payload;
      state.loading = false;
      state.error = null;
    },
    addOrder: (state, action: PayloadAction<any>) => {
      state.orders.unshift(action.payload);
    },
    updateOrder: (state, action: PayloadAction<{ id: string; updates: any }>) => {
      const index = state.orders.findIndex(order => order.id === action.payload.id);
      if (index !== -1) {
        state.orders[index] = { ...state.orders[index], ...action.payload.updates };
      }
      if (state.activeOrder?.id === action.payload.id) {
        state.activeOrder = { ...state.activeOrder, ...action.payload.updates };
      }
    },
    setActiveOrder: (state, action: PayloadAction<any>) => {
      state.activeOrder = action.payload;
    },
    clearActiveOrder: (state) => {
      state.activeOrder = null;
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
  setOrders,
  addOrder,
  updateOrder,
  setActiveOrder,
  clearActiveOrder,
  setError,
  clearError,
} = ordersSlice.actions;

export default ordersSlice.reducer;