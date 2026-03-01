import React from "react";
import { useSelector } from "react-redux";
import styles from "../../styles/styles";
import ShopInfo from "../../components/Shop/ShopInfo";
import ShopProfileData from "../../components/Shop/ShopProfileData";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";

const ShopHomePage = () => {
  const { seller } = useSelector((state) => state.seller);

  return (
    <div className="min-h-screen ">
      <Header />
      <main className={`${styles.section} py-10`}>
        <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
          <div className="lg:sticky lg:top-24">
            <ShopInfo isOwner shop={seller} />
          </div>
          <ShopProfileData isOwner shopId={seller?._id} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ShopHomePage;
