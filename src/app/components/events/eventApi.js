import axios from 'axios';
import BASE_URL from '@/utils/api';

const auth = (token) => ({ headers: { 'x-access-token': token } });

export const fetchEvents = async (token) => {
  const res = await axios.get(`${BASE_URL}/admin/event/showAllEvents`, auth(token));
  return res.data?.data || [];
};

export const saveEvent = async (token, eventId, formData) => {
  const config = { headers: { 'x-access-token': token, 'Content-Type': 'multipart/form-data' } };
  const res = eventId
    ? await axios.put(`${BASE_URL}/admin/event/updateEvent/${eventId}`, formData, config)
    : await axios.post(`${BASE_URL}/admin/event/createEvent`, formData, config);
  return res.data?.data;
};

export const deleteEvent = (token, eventId) =>
  axios.delete(`${BASE_URL}/admin/event/deleteEvent/${eventId}`, auth(token));

export const cancelEvent = async (token, eventId, reason) => {
  const res = await axios.patch(`${BASE_URL}/admin/event/${eventId}/cancel`, { reason }, auth(token));
  return res.data?.data;
};

export const fetchAttendees = async (token, eventId) => {
  const res = await axios.get(`${BASE_URL}/admin/event/${eventId}/attendees`, auth(token));
  return res.data?.data || { attendees: [], counts: { going: 0, interested: 0 } };
};

export const fetchAnnouncements = async (token, eventId) => {
  const res = await axios.get(`${BASE_URL}/admin/event/${eventId}/announcements`, auth(token));
  return res.data?.data || [];
};

export const sendAnnouncement = async (token, eventId, message) => {
  const res = await axios.post(`${BASE_URL}/admin/event/${eventId}/announce`, message, auth(token));
  return res.data?.data;
};

export const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;
