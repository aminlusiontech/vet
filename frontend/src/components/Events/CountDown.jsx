import axios from "axios";
import React, { useEffect, useState, useCallback } from "react";
import { server } from "../../server";

const CountDown = ({ data }) => {
  // Calculate time left function (memoized to prevent recreation)
  const calculateTimeLeft = useCallback(() => {
    if (!data?.Finish_Date) return {};
    
    const difference = +new Date(data.Finish_Date) - +new Date();
    if (difference <= 0) return {};
    
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }, [data?.Finish_Date]);

  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft());

  useEffect(() => {
    if (!data?._id || !data?.Finish_Date) return;
    
    // Use setInterval for continuous updates
    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);
      
      // Check if time is up
      if (
        typeof newTimeLeft.days === "undefined" &&
        typeof newTimeLeft.hours === "undefined" &&
        typeof newTimeLeft.minutes === "undefined" &&
        typeof newTimeLeft.seconds === "undefined"
      ) {
        axios.delete(`${server}/event/delete-shop-event/${data._id}`).catch(console.error);
        clearInterval(interval);
      }
    }, 1000);

    // Cleanup interval on unmount or when data changes
    return () => clearInterval(interval);
  }, [data._id, data?.Finish_Date, calculateTimeLeft]);

  const timerComponents = Object.keys(timeLeft).map((interval) => {
    if (!timeLeft[interval]) {
      return null;
    }

    return (
      <span className="text-[25px] text-[#38513b] font-[600]">
        {timeLeft[interval]} {interval}{" "}
      </span>
    );
  });

  return (
    <div>
      {timerComponents.length ? (
        timerComponents
      ) : (
        <span className="text-[red] text-[25px]">Time's Up</span>
      )}
    </div>
  );
};

export default CountDown;
