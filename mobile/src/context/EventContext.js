import React, { createContext, useState } from 'react';
import api from '../config/api';

export const EventContext = createContext();

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/events?${params.toString()}`);
      setEvents(response.data.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch events',
      };
    } finally {
      setLoading(false);
    }
  };

  const fetchEvent = async (id) => {
    try {
      const response = await api.get(`/events/${id}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch event',
      };
    }
  };

  const createEvent = async (eventData) => {
    try {
      const response = await api.post('/events', eventData);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create event',
      };
    }
  };

  const registerForEvent = async (eventId) => {
    try {
      const response = await api.post(`/events/${eventId}/register`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to register for event',
      };
    }
  };

  return (
    <EventContext.Provider
      value={{
        events,
        loading,
        fetchEvents,
        fetchEvent,
        createEvent,
        registerForEvent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

