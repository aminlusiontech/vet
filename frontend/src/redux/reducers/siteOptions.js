import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  options: {},
  loading: {},
  errors: {},
  updating: {},
  updateErrors: {},
  updateSuccess: {},
};

export const siteOptionsReducer = createReducer(initialState, {
  siteOptionsRequest: (state, action) => {
    const slug = action.payload || "global";
    state.loading[slug] = true;
    state.errors[slug] = null;
  },
  siteOptionsSuccess: (state, action) => {
    const { slug, options } = action.payload;
    state.loading[slug] = false;
    state.options[slug] = options;
  },
  siteOptionsFail: (state, action) => {
    const { slug, error } = action.payload;
    state.loading[slug] = false;
    state.errors[slug] = error;
  },

  siteOptionsUpdateRequest: (state, action) => {
    const slug = action.payload || "global";
    state.updating[slug] = true;
    state.updateErrors[slug] = null;
    state.updateSuccess[slug] = false;
  },
  siteOptionsUpdateSuccess: (state, action) => {
    const { slug, options } = action.payload;
    state.updating[slug] = false;
    state.options[slug] = options;
    state.updateSuccess[slug] = true;
  },
  siteOptionsUpdateFail: (state, action) => {
    const { slug, error } = action.payload;
    state.updating[slug] = false;
    state.updateErrors[slug] = error;
    state.updateSuccess[slug] = false;
  },

  siteOptionsClearErrors: (state) => {
    state.errors = {};
    state.updateErrors = {};
  },
});

