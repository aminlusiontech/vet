import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import { useParams } from "react-router-dom";
import { fetchSinglePost } from "../redux/actions/blog";
import { backend_url } from "../server";

const SingleBlog = () => {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const { currentPost, isLoadingPost, postError } = useSelector(
    (state) => state.blog
  );

  useEffect(() => {
    if (slug) {
      dispatch(fetchSinglePost(slug));
    }
  }, [dispatch, slug]);

  const featuredImage = currentPost?.featuredImage
    ? `${backend_url}${currentPost.featuredImage}`
    : null;
  const publishedDate = currentPost?.publishedAt
    ? new Date(currentPost.publishedAt).toLocaleDateString()
    : null;

  return (
    <div>
      <Header activeHeading={5} />
      <div className="bg-[#CCBEA1] border-t border-t-black" id="inner-page-banner">
        <div className="py-[50px] flex flex-col px-4 text-center">
          <h1 className="lg:text-4xl text-3xl md:mb-0 mb-6 lg:leading-normal font-semibold">
            {currentPost?.title || "Blog Post"}
          </h1>
          <p>
            Home &gt; <span className="text-[#38513B]">Blog</span>
          </p>
        </div>
      </div>

      <div className="w-11/12 mx-auto py-10" id="single-blog">
        {isLoadingPost ? (
          <div className="text-center py-10">Loading article…</div>
        ) : postError ? (
          <div className="text-center py-10 text-red-500">{postError}</div>
        ) : currentPost ? (
          <div className="w-full max-w-4xl mx-auto">
            {featuredImage && (
              <img
                src={featuredImage}
                alt={currentPost.title}
                className="w-full h-[500px] object-cover object-center rounded mb-5"
              />
            )}
            <h1 className="text-[32px] md:text-[40px] text-[#38513B] font-semibold mb-4">
              {currentPost.title}
            </h1>
            {publishedDate && (
              <p className="text-sm text-gray-500 mb-6">Published on {publishedDate}</p>
            )}
            <div
              className="prose max-w-none text-[#333]"
              dangerouslySetInnerHTML={{ __html: currentPost.content }}
            />
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">Post not found.</div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default SingleBlog;