import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  loading: true, // Start with true to wait for initial load
  admin: null,
  error: null,
};

export const adminReducer = createReducer(initialState, (builder) => {
  builder
    // Load admin actions
    .addCase("LoadAdminRequest", (state) => {
      state.loading = true;
    })
    .addCase("LoadAdminSuccess", (state, action) => {
      state.isAuthenticated = true;
      state.loading = false;
      state.admin = action.payload;
    })
    .addCase("LoadAdminFail", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.admin = null;
    })
    // Clear errors
    .addCase("clearErrors", (state) => {
      state.error = null;
    });
});

