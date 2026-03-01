import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import styles from "../../../styles/styles";
import {
  createBlogPost,
  updateBlogPost,
  fetchSinglePost,
  fetchBlogList,
  clearBlogErrors,
} from "../../../redux/actions/blog";
import { toast } from "react-toastify";
import { backend_url } from "../../../server";

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ align: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    ["link"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "align",
  "list",
  "bullet",
  "link",
];

const BlogEditor = ({ postId, onClose }) => {
  const dispatch = useDispatch();
  const { currentPost, isLoadingPost, isCreating, isUpdating, createError, updateError } =
    useSelector((state) => state.blog);

  const [formState, setFormState] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    isPublished: true,
    publishedAt: new Date().toISOString().slice(0, 16),
  });
  const [featuredImageFile, setFeaturedImageFile] = useState(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState("");

  const isEditing = Boolean(postId);

  useEffect(() => {
    if (isEditing) {
      dispatch(fetchSinglePost(postId));
    }
  }, [dispatch, isEditing, postId]);

  useEffect(() => {
    if (isEditing && currentPost && currentPost._id === postId) {
      setFormState({
        title: currentPost.title || "",
        slug: currentPost.slug || "",
        excerpt: currentPost.excerpt || "",
        content: currentPost.content || "",
        isPublished: currentPost.isPublished ?? true,
        publishedAt: currentPost.publishedAt
          ? new Date(currentPost.publishedAt).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16),
      });
      setFeaturedImagePreview(
        currentPost.featuredImage ? `${backend_url}${currentPost.featuredImage}` : ""
      );
    }
  }, [isEditing, currentPost, postId]);

  useEffect(() => {
    if (createError || updateError) {
      toast.error(createError || updateError);
      dispatch(clearBlogErrors());
    }
  }, [createError, updateError, dispatch]);

  const handleInputChange = (field, value) => {
    setFormState((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    setFeaturedImageFile(file || null);
    if (file) {
      setFeaturedImagePreview(URL.createObjectURL(file));
    } else {
      setFeaturedImagePreview("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData();
    formData.append("title", formState.title);
    formData.append("slug", formState.slug);
    formData.append("excerpt", formState.excerpt);
    formData.append("content", formState.content);
    formData.append("isPublished", String(formState.isPublished));
    if (formState.publishedAt) {
      formData.append("publishedAt", new Date(formState.publishedAt).toISOString());
    }
    if (featuredImageFile) {
      formData.append("featuredImage", featuredImageFile);
    }

    try {
      if (isEditing) {
        await dispatch(updateBlogPost(postId, formData));
        toast.success("Post updated successfully");
      } else {
        await dispatch(createBlogPost(formData));
        toast.success("Post created successfully");
      }
      await dispatch(fetchBlogList());
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const toolbarNote = useMemo(
    () =>
      "Use the toolbar to format and structure your post. Links, bullet lists, and headings are supported.",
    []
  );

  return (
    <div className="bg-white rounded-md shadow p-6">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-[#38513b]">
            {isEditing ? "Edit Post" : "Create New Post"}
          </h2>
          <p className="text-sm text-gray-500">{toolbarNote}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>

      {isEditing && isLoadingPost ? (
        <div className="py-20 text-center">Loading post details…</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={formState.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
                className={`${styles.input}`}
                placeholder="Post title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={formState.slug}
                onChange={(e) => handleInputChange("slug", e.target.value)}
                className={`${styles.input}`}
                placeholder="Optional custom slug (e.g. veteran-airsoft-gives-back)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt
            </label>
            <textarea
              value={formState.excerpt}
              onChange={(e) => handleInputChange("excerpt", e.target.value)}
              className={`${styles.input} min-h-[100px]`}
              placeholder="Short summary shown on the blog listing page"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Published At
              </label>
              <input
                type="datetime-local"
                value={formState.publishedAt}
                onChange={(e) => handleInputChange("publishedAt", e.target.value)}
                className={`${styles.input}`}
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                id="isPublished"
                type="checkbox"
                checked={formState.isPublished}
                onChange={(e) => handleInputChange("isPublished", e.target.checked)}
              />
              <label htmlFor="isPublished" className="text-sm text-gray-700">
                Published
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Featured Image
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className={`${styles.input}`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Recommended size: 1200x600px (blog featured image)
            </p>
            {featuredImagePreview && (
              <img
                src={featuredImagePreview}
                alt="Preview"
                className="mt-3 h-48 w-full object-contain rounded-md"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <ReactQuill
              theme="snow"
              value={formState.content}
              onChange={(value) => handleInputChange("content", value)}
              modules={quillModules}
              formats={quillFormats}
              className="bg-white"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} text-white px-6`}
              disabled={isCreating || isUpdating}
            >
              {isEditing
                ? isUpdating
                  ? "Saving…"
                  : "Save Changes"
                : isCreating
                ? "Publishing…"
                : "Publish Post"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BlogEditor;

