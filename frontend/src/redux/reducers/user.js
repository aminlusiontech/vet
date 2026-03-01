import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  isAuthenticated: false,
  loading: false, // Initialize loading to false
};

export const userReducer = createReducer(initialState, (builder) => {
  builder
    // Load user actions
    .addCase("LoadUserRequest", (state) => {
      state.loading = true;
      // state.loading meaning: if loading is true, then the user is not authenticated
    })
    .addCase("LoadUserSuccess", (state, action) => {
      state.isAuthenticated = true;
      state.loading = false;
      state.user = action.payload;
      state.error = null;
      state.successMessage = null;
    })
    .addCase("LoadUserFail", (state, action) => {
      state.loading = false;
      // Only set error if payload is not null (null means silent auth failure)
      if (action.payload !== null) {
        state.error = action.payload;
      }
      state.isAuthenticated = false;
    })
    // Update user information actions
    .addCase("updateUserInfoRequest", (state) => {
      state.loading = true;
    })
    .addCase("updateUserInfoSuccess", (state, action) => {
      state.loading = false;
      state.user = action.payload;
    })
    .addCase("updateUserInfoFailed", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Update user address actions
    .addCase("updateUserAddressRequest", (state) => {
      state.addressloading = true;
    })
    .addCase("updateUserAddressSuccess", (state, action) => {
      state.addressloading = false;
      state.successMessage = action.payload.successMessage;
      state.user = action.payload.user;
    })
    .addCase("updateUserAddressFailed", (state, action) => {
      state.addressloading = false;
      state.error = action.payload;
    })
    // Delete user address actions
    .addCase("deleteUserAddressRequest", (state) => {
      state.addressloading = true;
    })
    .addCase("deleteUserAddressSuccess", (state, action) => {
      state.addressloading = false;
      state.successMessage = action.payload.successMessage;
      state.user = action.payload.user;
    })
    .addCase("deleteUserAddressFailed", (state, action) => {
      state.addressloading = false;
      state.error = action.payload;
    })
    // Get all users (admin) actions
    .addCase("getAllUsersRequest", (state) => {
      state.usersLoading = true;
    })
    .addCase("getAllUsersSuccess", (state, action) => {
      state.usersLoading = false;
      state.users = action.payload;
    })
    .addCase("getAllUsersFailed", (state, action) => {
      state.usersLoading = false;
      state.error = action.payload;
    })
    // Clear errors
    .addCase("clearErrors", (state) => {
      state.error = null;
    });
});

// reducer -> logic (state change)
