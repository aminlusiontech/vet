import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import styles from "../styles/styles";
import BlogCard from "../components/Blog/BlogCard";
import { fetchBlogList } from "../redux/actions/blog";

const BlogPage = () => {
  const dispatch = useDispatch();
  const { list, isLoadingList, listError } = useSelector((state) => state.blog);

  useEffect(() => {
    dispatch(fetchBlogList({ published: true, limit: 12 }));
  }, [dispatch]);

  return (
    <div>
      <Header activeHeading={5} />
      <div className="bg-[#CCBEA1] border-t border-t-black" id="inner-page-banner">
        <div className="py-[50px] flex flex-col px-4 text-center">
          <h1 className="lg:text-4xl text-3xl md:mb-0 mb-6 lg:leading-normal font-semibold">
            Blogs
          </h1>
          <p>
            Home &gt; <span className="text-[#38513B]">Blogs</span>
          </p>
        </div>
      </div>

      <div className="w-11/12 mx-auto py-10" id="blog-page">
        {isLoadingList ? (
          <div className="text-center py-10">Loading articles…</div>
        ) : listError ? (
          <div className="text-center py-10 text-red-500">{listError}</div>
        ) : list.posts && list.posts.length ? (
          <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2 md:gap-[25px] lg:grid-cols-3 lg:gap-[25px] xl:grid-cols-3 xl:gap-[20px] border-0">
            {list.posts.map((post) => (
              <BlogCard key={post._id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            No blog posts available yet.
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BlogPage;