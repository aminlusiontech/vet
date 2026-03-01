import axios from "axios";
import { server } from "../../server";

const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong"
  );
};

export const fetchStaticPage = (slug) => async (dispatch) => {
  try {
    dispatch({
      type: "staticPageRequest",
      payload: { slug },
    });

    const { data } = await axios.get(`${server}/pages/static/${slug}`);

    dispatch({
      type: "staticPageSuccess",
      payload: { slug, page: data.page },
    });
  } catch (error) {
    dispatch({
      type: "staticPageFail",
      payload: { slug, error: getErrorMessage(error) },
    });
  }
};

export const updateStaticPage = (slug, payload) => async (dispatch) => {
  try {
    dispatch({
      type: "staticPageUpdateRequest",
      payload: { slug },
    });

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true,
    };

    const { data } = await axios.put(
      `${server}/pages/static/${slug}`,
      payload,
      config
    );

    dispatch({
      type: "staticPageUpdateSuccess",
      payload: { slug, page: data.page },
    });
  } catch (error) {
    dispatch({
      type: "staticPageUpdateFail",
      payload: { slug, error: getErrorMessage(error) },
    });
  }
};

export const clearStaticPageErrors = () => (dispatch) =>
  dispatch({
    type: "staticPageClearErrors",
  });

