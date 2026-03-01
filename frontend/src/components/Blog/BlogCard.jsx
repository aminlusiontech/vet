import React from "react";
import { Link } from "react-router-dom";
import { backend_url } from "../../server";

const BlogCard = ({ post }) => {
  const featuredImage = post.featuredImage
    ? `${backend_url}${post.featuredImage}`
    : null;
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString()
    : null;

  const excerpt =
    post.excerpt ||
    (post.content
      ? post.content.replace(/<[^>]+>/g, "").slice(0, 140).concat("…")
      : "");

  return (
    <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden relative cursor-pointer">
      {featuredImage && (
        <Link to={`/blog/${post.slug}`}>
          <img src={featuredImage} alt={post.title} className="w-full h-52 object-cover" />
        </Link>
      )}
      <div className="blog-card-content p-4 flex flex-col h-full">
        <Link to={`/blog/${post.slug}`}>
          <h4 className="pb-3 font-[700] text-[#38513B] text-[22px]">
            {post.title}
          </h4>
        </Link>
        <p className="pb-3 text-[15px] text-gray-600">{excerpt}</p>
        <div className="flex items-center justify-between text-sm text-gray-500 pb-3">
          <span>{formattedDate}</span>
          {/* {post.isPublished ? (
            <span className="text-green-600 font-medium">Published</span>
          ) : (
            <span className="text-yellow-600 font-medium">Draft</span>
          )} */}
        </div>
        <Link to={`/blog/${post.slug}`}>
          <h5 className="read-more py-3 text-[#38513B] font-[600]">
            Read More »
          </h5>
        </Link>
      </div>
    </div>
  );
};

export default BlogCard;

