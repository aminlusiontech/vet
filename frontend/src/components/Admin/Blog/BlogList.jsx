import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styles from "../../../styles/styles";
import {
  fetchBlogList,
  deleteBlogPost,
  clearBlogErrors,
} from "../../../redux/actions/blog";
import { backend_url } from "../../../server";
import { AiOutlinePlus } from "react-icons/ai";

const BlogList = ({ onCreate = () => {}, onEdit = () => {} }) => {
  const dispatch = useDispatch();
  const { list, isLoadingList, listError, isDeleting, deleteError } =
    useSelector((state) => state.blog);
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchBlogList());
  }, [dispatch]);

  useEffect(() => {
    if (listError || deleteError) {
      console.error(listError || deleteError);
      dispatch(clearBlogErrors());
    }
  }, [listError, deleteError, dispatch]);

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      dispatch(deleteBlogPost(id)).then(() => {
        dispatch(fetchBlogList());
      });
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    dispatch(fetchBlogList({ search }));
  };

  return (
    <div className="bg-white rounded-md shadow p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b">
        <div>
          <h2 className="text-xl font-semibold text-[#38513b]">Blog Posts</h2>
          <p className="text-sm text-gray-500">
            Manage your blog posts. You can add new posts, edit existing ones, or remove them.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className={`${styles.button} text-white flex items-center justify-center gap-2 px-4`}
        >
          <AiOutlinePlus /> New Post
        </button>
      </div>

      <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts"
          className={`${styles.input}`}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-[#38513b] text-white rounded-md"
        >
          Search
        </button>
      </form>

      {isLoadingList ? (
        <div className="py-10 text-center">Loading posts…</div>
      ) : list.posts && list.posts.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.posts.map((post) => (
            <div
              key={post._id}
              className="border rounded-md overflow-hidden bg-[#f9fafb] flex flex-col"
            >
              {post.featuredImage && (
                <img
                  src={`${backend_url}${post.featuredImage}`}
                  alt={post.title}
                  className="w-full h-48 object-contain"
                />
              )}
              <div className="p-4 flex flex-col flex-1">
                <h3 className="text-lg font-semibold text-[#38513b] mb-2">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-600 flex-1">
                  {post.excerpt ||
                    (post.content ? post.content.replace(/<[^>]+>/g, "").slice(0, 140) + "…" : "")}
                </p>
                <div className="mt-4 flex justify-between text-sm text-gray-500">
                  <span>
                    {post.isPublished ? (
                      <span className="text-green-600 font-medium">Published</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">Draft</span>
                    )}
                  </span>
                  <span>
                    {post.publishedAt
                      ? new Date(post.publishedAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(post._id)}
                    className="flex-1 text-center px-3 py-2 bg-[#38513b] text-white rounded-md text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post._id)}
                    className="flex-1 text-center px-3 py-2 bg-red-500 text-white rounded-md text-sm disabled:opacity-60"
                    disabled={isDeleting}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-gray-500">No posts found.</div>
      )}
    </div>
  );
};

export default BlogList;

