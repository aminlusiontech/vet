import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { State } from "country-state-city";
import { AiOutlineDelete } from "react-icons/ai";
import { RxCross1 } from "react-icons/rx";
import { toast } from "react-toastify";
import { deleteUserAddress, updatUserAddress } from "../../redux/actions/user";

const cityNameFromCode = (countryCode, cityCode) => {
  if (!countryCode || !cityCode) return "";
  const states = State.getStatesOfCountry(countryCode);
  const match = states.find((item) => item.isoCode === cityCode);
  return match ? match.name : cityCode;
};

const displayPostalCode = (address) => {
  if (!address) return "";
  const code =
    address.postCode ||
    address.postcode ||
    address.zipCode ||
    address.zipcode ||
    address.postalCode;
  return code ? `• ${code}` : "";
};

const Address = ({
  cardClass,
  inputClasses,
  labelClasses,
  primaryButtonClasses,
  secondaryButtonClasses,
}) => {
  const [open, setOpen] = useState(false);
  const [country] = useState("GB"); // Country is fixed to UK, hidden from UI
  const [city, setCity] = useState("");
  const [postCode, setPostCode] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [addressType, setAddressType] = useState("");
  const { user } = useSelector((state) => state.user);
  const dispatch = useDispatch();

  const addressTypeData = [
    { name: "Default" },
    { name: "Home" },
    { name: "Office" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!addressType || !city) {
      toast.error("Please fill all the required fields.");
      return;
    }

    dispatch(
      updatUserAddress(
        country,
        city,
        address1,
        address2,
        postCode,
        addressType
      )
    );
    setOpen(false);
    setCity("");
    setAddress1("");
    setAddress2("");
    setPostCode("");
    setAddressType("");
  };

  const handleDelete = (item) => {
    if (!item?._id) return;
    dispatch(deleteUserAddress(item._id));
  };

  return (
    <section className={cardClass}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Saved addresses</h2>
          <p className="text-sm text-slate-500">
            Manage delivery locations for faster checkout.
          </p>
        </div>
        <button
          type="button"
          className={secondaryButtonClasses}
          onClick={() => setOpen(true)}
        >
          Add new address
        </button>
      </header>

      <div className="space-y-4">
        {user?.addresses?.length ? (
          user.addresses.map((item, index) => (
            <article
              key={`${item._id}-${index}`}
              className="flex flex-col gap-4 rounded-2xl border border-slate-200 /60 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#38513b]">
                  {item.addressType}
                </p>
                <h3 className="text-sm font-medium text-slate-900">
                  {item.address1}, {item.address2}
                </h3>
                <p className="text-sm text-slate-500">
                  {cityNameFromCode(item.country, item.city)}{" "}
                  {displayPostalCode(item)}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium text-slate-700">
                  {user?.phoneNumber || "No phone number"}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="text-sm font-semibold text-rose-600 transition hover:text-rose-500"
                >
                  <span className="inline-flex items-center gap-2">
                    <AiOutlineDelete size={18} />
                    Remove
                  </span>
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 /60 p-10 text-center">
            <p className="text-sm font-medium text-slate-500">
              You haven&apos;t added any addresses yet.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Save your first address to speed up future orders.
            </p>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 px-4 py-10 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">
                Add new address
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-transparent p-1 text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
              >
                <RxCross1 size={22} />
              </button>
            </div>
            <form
              onSubmit={handleSubmit}
              className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-6"
              aria-required="true"
            >
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>City</span>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Choose your city</option>
                  {State.getStatesOfCountry(country).map((item) => (
                    <option key={item.isoCode} value={item.isoCode}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Address line 1</span>
                <input
                  type="text"
                  className={inputClasses}
                  required
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Address line 2</span>
                <input
                  type="text"
                  className={inputClasses}
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Postal code</span>
                <input
                  type="text"
                  className={inputClasses}
                  value={postCode}
                  onChange={(e) => setPostCode(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className={labelClasses}>Address type</span>
                <select
                  value={addressType}
                  onChange={(e) => setAddressType(e.target.value)}
                  className={inputClasses}
                >
                  <option value="">Choose address type</option>
                  {addressTypeData.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={secondaryButtonClasses}
                >
                  Cancel
                </button>
                <button type="submit" className={primaryButtonClasses}>
                  Save address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Address;

