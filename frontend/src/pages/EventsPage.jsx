import React from "react";
import { useSelector } from "react-redux";
import EventCard from "../components/Events/EventCard";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import Loader from "../components/Layout/Loader";

const EventsPage = () => {
  const { allEvents = [], isLoading } = useSelector((state) => state.events);
  
  // Filter and sort events
  const activeEvents = (allEvents || [])
    .filter(event => {
      // Only include active events
      if (event.status && event.status !== "active") return false;
      
      // Get the start date (use approvedStart if available, otherwise start_Date)
      const startDate = event.approvedStart 
        ? new Date(event.approvedStart) 
        : event.start_Date 
        ? new Date(event.start_Date) 
        : null;
      
      // Only show events where start date has arrived (not before start date)
      if (startDate) {
        const now = new Date();
        // Set time to start of day for comparison
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfEventDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        
        // Only show if event start date is today or in the past
        if (startOfEventDate > startOfToday) return false;
      }
      
      // Additional check: if approvedEnd exists and has passed, exclude it
      if (event.approvedEnd) {
        const endDate = new Date(event.approvedEnd);
        const now = new Date();
        if (endDate < now) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort by latest start date first (newest start date first)
      const startDateA = a.approvedStart 
        ? new Date(a.approvedStart) 
        : a.start_Date 
        ? new Date(a.start_Date) 
        : new Date(0);
      
      const startDateB = b.approvedStart 
        ? new Date(b.approvedStart) 
        : b.start_Date 
        ? new Date(b.start_Date) 
        : new Date(0);
      
      // Sort descending (latest first)
      return startDateB - startDateA;
    });
  
  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <div>
          <Header activeHeading={4} />
          {/* Banner */}
            <div className="bg-[#CCBEA1] border-t border-t-black" id="inner-page-banner">
            <div className="py-[50px] flex flex-col px-12 px-4 text-center">
                <h1 className="lg:text-4xl text-3xl md:mb-0 mb-6 lg:leading-normal font-semibold">
                    Booking & Events
                </h1>
                <p>Home &gt; <span className="text-[#38513B]">Booking & Events</span></p>
            </div>
            </div>
            {/* Banner */}
          <div className="w-11/12 mx-auto" id="events-page">
          <div className="gap-[20px] flex flex-col">
          {activeEvents.length !== 0 ? (
            activeEvents.map((event) => (
              <EventCard key={event._id || event.id} active={true} data={event} />
            ))
          ) : (
            <p>No events available.</p>
          )}
          </div>
          </div>
          <Footer />
        </div>
        
      )}
    </>
  );
};

export default EventsPage;
