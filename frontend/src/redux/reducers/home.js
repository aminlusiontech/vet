import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  isLoading: false,
  isUpdating: false,
  assetUploading: false,
  page: null,
};

export const homePageReducer = createReducer(initialState, {
  homePageRequest: (state) => {
    state.isLoading = true;
    state.error = null;
  },
  homePageSuccess: (state, action) => {
    state.isLoading = false;
    state.page = action.payload;
  },
  homePageFail: (state, action) => {
    state.isLoading = false;
    state.error = action.payload;
  },

  homePageUpdateRequest: (state) => {
    state.isUpdating = true;
    state.updateError = null;
    state.updateSuccess = false;
  },
  homePageUpdateSuccess: (state, action) => {
    state.isUpdating = false;
    state.page = action.payload;
    state.updateSuccess = true;
  },
  homePageUpdateFail: (state, action) => {
    state.isUpdating = false;
    state.updateError = action.payload;
    state.updateSuccess = false;
  },

  homePageAssetUploadRequest: (state) => {
    state.assetUploading = true;
    state.assetUploadError = null;
  },
  homePageAssetUploadSuccess: (state, action) => {
    state.assetUploading = false;
    state.lastUploadedAsset = action.payload;
  },
  homePageAssetUploadFail: (state, action) => {
    state.assetUploading = false;
    state.assetUploadError = action.payload;
  },

  homePageAssetDeleteRequest: (state) => {
    state.assetDeleting = true;
    state.assetDeleteError = null;
  },
  homePageAssetDeleteSuccess: (state, action) => {
    state.assetDeleting = false;
    state.deletedAsset = action.payload;
  },
  homePageAssetDeleteFail: (state, action) => {
    state.assetDeleting = false;
    state.assetDeleteError = action.payload;
  },

  homePageClearErrors: (state) => {
    state.error = null;
    state.updateError = null;
    state.assetUploadError = null;
    state.assetDeleteError = null;
  },
  homePageResetUpdateState: (state) => {
    state.updateSuccess = false;
    state.updateError = null;
  },
});

