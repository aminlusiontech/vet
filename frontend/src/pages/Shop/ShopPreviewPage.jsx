import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Header from "../../components/Layout/Header";
import Footer from "../../components/Layout/Footer";
import ShopInfo from "../../components/Shop/ShopInfo";
import ShopProfileData from "../../components/Shop/ShopProfileData";
import Loader from "../../components/Layout/Loader";
import { server } from "../../server";

const ShopPreviewPage = () => {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const fetchShop = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get(`${server}/shop/get-shop-info/${id}`);
        if (!ignore) {
          setShop(response.data?.shop || null);
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err?.response?.data?.message ||
              "We couldn't load this shop right now."
          );
          setShop(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchShop();

    return () => {
      ignore = true;
    };
  }, [id]);

  return (
    <div className="flex min-h-screen flex-col ">
      <Header />
      <main className="mx-auto w-full w-11/12 flex-1 px-4 py-10 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-dashed border-rose-200 bg-white p-10 text-center">
            <h1 className="text-lg font-semibold text-rose-600">
              Unable to open shop
            </h1>
            <p className="mt-2 text-sm text-slate-500">{error}</p>
          </div>
        ) : shop ? (
          <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
            <div className="lg:sticky lg:top-28">
              <ShopInfo isOwner={false} shop={shop} />
            </div>
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <ShopProfileData isOwner={false} shopId={shop?._id} />
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <h1 className="text-lg font-semibold text-slate-700">
              Shop not found
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              The shop you are looking for may have been removed or is no longer
              available.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ShopPreviewPage;
