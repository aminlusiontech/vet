import axios from "axios";
import { server } from "../../server";

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
};

export const fetchHomePage = () => async (dispatch) => {
  try {
    dispatch({
      type: "homePageRequest",
    });

    const { data } = await axios.get(`${server}/pages/home`);

    dispatch({
      type: "homePageSuccess",
      payload: data.page,
    });
  } catch (error) {
    dispatch({
      type: "homePageFail",
      payload: getErrorMessage(error),
    });
  }
};

export const updateHomePage = (payload) => async (dispatch) => {
  try {
    dispatch({
      type: "homePageUpdateRequest",
    });

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    };

    const { data } = await axios.put(
      `${server}/pages/home`,
      payload,
      config
    );

    dispatch({
      type: "homePageUpdateSuccess",
      payload: data.page,
    });
  } catch (error) {
    dispatch({
      type: "homePageUpdateFail",
      payload: getErrorMessage(error),
    });
  }
};

export const uploadHomeAsset = (formData) => async (dispatch) => {
  try {
    dispatch({
      type: "homePageAssetUploadRequest",
    });

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      withCredentials: true,
    };

    const { data } = await axios.post(
      `${server}/pages/home/upload`,
      formData,
      config
    );

    dispatch({
      type: "homePageAssetUploadSuccess",
      payload: data,
    });

    return data;
  } catch (error) {
    const message = getErrorMessage(error);

    dispatch({
      type: "homePageAssetUploadFail",
      payload: message,
    });

    throw new Error(message);
  }
};

export const clearHomePageErrors = () => (dispatch) =>
  dispatch({
    type: "homePageClearErrors",
  });

export const deleteHomeAsset = (filename) => async (dispatch) => {
  try {
    dispatch({
      type: "homePageAssetDeleteRequest",
    });

    const config = {
      withCredentials: true,
    };

    await axios.delete(`${server}/pages/home/upload/${filename}`, config);

    dispatch({
      type: "homePageAssetDeleteSuccess",
      payload: filename,
    });
  } catch (error) {
    dispatch({
      type: "homePageAssetDeleteFail",
      payload: getErrorMessage(error),
    });
  }
};

