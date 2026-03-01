import React from "react";
import AdminHeader from "../../Layout/AdminHeader";
import AdminSideBar from "../Layout/AdminSideBar";
import HeaderOptions from "./HeaderOptions";

const OptionsHeader = () => {
  return (
    <div>
      <AdminHeader />
      <div className="w-full flex">
        <div className="flex items-start justify-between w-full">
          <div className="w-[80px] 800px:w-[330px]">
            <AdminSideBar active={8} />
          </div>
          <div className="flex-1 p-4 800px:p-6">
            <HeaderOptions />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsHeader;

