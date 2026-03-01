import axios from "axios";
import { server } from "../../server";

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
};

export const fetchBlogList =
  ({ page = 1, limit = 12, search = "", published } = {}) =>
  async (dispatch) => {
    try {
      dispatch({
        type: "blogListRequest",
      });

      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", limit);
      if (search) params.set("search", search);
      if (published !== undefined) params.set("published", published);

      const { data } = await axios.get(`${server}/blog?${params.toString()}`);

      dispatch({
        type: "blogListSuccess",
        payload: data,
      });
    } catch (error) {
      dispatch({
        type: "blogListFail",
        payload: getErrorMessage(error),
      });
    }
  };

export const fetchSinglePost = (slug) => async (dispatch) => {
  try {
    dispatch({
      type: "blogSingleRequest",
    });

    const { data } = await axios.get(`${server}/blog/${slug}`);

    dispatch({
      type: "blogSingleSuccess",
      payload: data.post,
    });
  } catch (error) {
    dispatch({
      type: "blogSingleFail",
      payload: getErrorMessage(error),
    });
  }
};

export const createBlogPost = (formData) => async (dispatch) => {
  try {
    dispatch({
      type: "blogCreateRequest",
    });

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    };

    const { data } = await axios.post(`${server}/blog`, formData, config);

    dispatch({
      type: "blogCreateSuccess",
      payload: data.post,
    });

    return data.post;
  } catch (error) {
    const message = getErrorMessage(error);
    dispatch({
      type: "blogCreateFail",
      payload: message,
    });
    throw new Error(message);
  }
};

export const updateBlogPost = (id, formData) => async (dispatch) => {
  try {
    dispatch({
      type: "blogUpdateRequest",
    });

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    };

    const { data } = await axios.put(`${server}/blog/${id}`, formData, config);

    dispatch({
      type: "blogUpdateSuccess",
      payload: data.post,
    });

    return data.post;
  } catch (error) {
    const message = getErrorMessage(error);
    dispatch({
      type: "blogUpdateFail",
      payload: message,
    });
    throw new Error(message);
  }
};

export const deleteBlogPost = (id) => async (dispatch) => {
  try {
    dispatch({
      type: "blogDeleteRequest",
    });

    const config = {
      withCredentials: true,
    };

    const { data } = await axios.delete(`${server}/blog/${id}`, config);

    dispatch({
      type: "blogDeleteSuccess",
      payload: { id, message: data.message },
    });
  } catch (error) {
    dispatch({
      type: "blogDeleteFail",
      payload: getErrorMessage(error),
    });
  }
};

export const clearBlogErrors = () => (dispatch) =>
  dispatch({
    type: "blogClearErrors",
  });

