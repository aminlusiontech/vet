import React, { useState } from "react";
import AdminHeader from "../components/Layout/AdminHeader";
import AdminSideBar from "../components/Admin/Layout/AdminSideBar";
import BlogList from "../components/Admin/Blog/BlogList";
import BlogEditor from "../components/Admin/Blog/BlogEditor";

const AdminDashboardPagesBlog = () => {
  const [editingId, setEditingId] = useState(null);
  const [view, setView] = useState("list");

  const handleCreate = () => {
    setEditingId(null);
    setView("editor");
  };

  const handleEdit = (postId) => {
    setEditingId(postId);
    setView("editor");
  };

  const handleCloseEditor = () => {
    setEditingId(null);
    setView("list");
  };

  return (
    <div className=" min-h-screen">
      <AdminHeader />
      <div className="max-w-[1500px] mx-auto px-4 lg:px-6 py-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[300px]">
          <AdminSideBar active={7} />
        </div>
        <div className="flex-1">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 lg:p-6">
            {view === "list" ? (
              <BlogList onCreate={handleCreate} onEdit={handleEdit} />
            ) : (
              <BlogEditor postId={editingId} onClose={handleCloseEditor} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPagesBlog;

