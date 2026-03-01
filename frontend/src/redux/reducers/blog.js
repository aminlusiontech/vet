import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  list: {
    posts: [],
    pagination: {
      total: 0,
      page: 1,
      limit: 12,
    },
  },
  currentPost: null,
  isLoadingList: false,
  isLoadingPost: false,
  listError: null,
  postError: null,
  isCreating: false,
  createError: null,
  isUpdating: false,
  updateError: null,
  isDeleting: false,
  deleteError: null,
};

export const blogReducer = createReducer(initialState, {
  blogListRequest: (state) => {
    state.isLoadingList = true;
    state.listError = null;
  },
  blogListSuccess: (state, action) => {
    state.isLoadingList = false;
    state.list = action.payload;
  },
  blogListFail: (state, action) => {
    state.isLoadingList = false;
    state.listError = action.payload;
  },

  blogSingleRequest: (state) => {
    state.isLoadingPost = true;
    state.postError = null;
    state.currentPost = null;
  },
  blogSingleSuccess: (state, action) => {
    state.isLoadingPost = false;
    state.currentPost = action.payload;
  },
  blogSingleFail: (state, action) => {
    state.isLoadingPost = false;
    state.postError = action.payload;
  },

  blogCreateRequest: (state) => {
    state.isCreating = true;
    state.createError = null;
  },
  blogCreateSuccess: (state, action) => {
    state.isCreating = false;
    state.list.posts = [action.payload, ...(state.list.posts || [])];
    state.list.pagination.total += 1;
  },
  blogCreateFail: (state, action) => {
    state.isCreating = false;
    state.createError = action.payload;
  },

  blogUpdateRequest: (state) => {
    state.isUpdating = true;
    state.updateError = null;
  },
  blogUpdateSuccess: (state, action) => {
    state.isUpdating = false;
    state.currentPost = action.payload;
    state.list.posts = (state.list.posts || []).map((post) =>
      post._id === action.payload._id ? action.payload : post
    );
  },
  blogUpdateFail: (state, action) => {
    state.isUpdating = false;
    state.updateError = action.payload;
  },

  blogDeleteRequest: (state) => {
    state.isDeleting = true;
    state.deleteError = null;
  },
  blogDeleteSuccess: (state, action) => {
    state.isDeleting = false;
    const { id } = action.payload;
    state.list.posts = (state.list.posts || []).filter(
      (post) => post._id !== id
    );
    state.list.pagination.total = Math.max(
      0,
      state.list.pagination.total - 1
    );
  },
  blogDeleteFail: (state, action) => {
    state.isDeleting = false;
    state.deleteError = action.payload;
  },

  blogClearErrors: (state) => {
    state.listError = null;
    state.postError = null;
    state.createError = null;
    state.updateError = null;
    state.deleteError = null;
  },
});

