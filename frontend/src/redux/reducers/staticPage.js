import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  pages: {},
  loading: {},
  errors: {},
  updating: {},
  updateErrors: {},
  updateSuccess: {},
};

export const staticPageReducer = createReducer(initialState, {
  staticPageRequest: (state, action) => {
    const { slug } = action.payload;
    state.loading[slug] = true;
    state.errors[slug] = null;
  },
  staticPageSuccess: (state, action) => {
    const { slug, page } = action.payload;
    state.loading[slug] = false;
    state.pages[slug] = page;
  },
  staticPageFail: (state, action) => {
    const { slug, error } = action.payload;
    state.loading[slug] = false;
    state.errors[slug] = error;
  },

  staticPageUpdateRequest: (state, action) => {
    const { slug } = action.payload;
    state.updating[slug] = true;
    state.updateErrors[slug] = null;
    state.updateSuccess[slug] = false;
  },
  staticPageUpdateSuccess: (state, action) => {
    const { slug, page } = action.payload;
    state.updating[slug] = false;
    state.pages[slug] = page;
    state.updateSuccess[slug] = true;
  },
  staticPageUpdateFail: (state, action) => {
    const { slug, error } = action.payload;
    state.updating[slug] = false;
    state.updateErrors[slug] = error;
    state.updateSuccess[slug] = false;
  },

  staticPageClearErrors: (state) => {
    state.errors = {};
    state.updateErrors = {};
  },
});

