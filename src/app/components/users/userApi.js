import axios from 'axios';
import BASE_URL from '@/utils/api';

const auth = (token) => ({ headers: { 'x-access-token': token } });

export const fetchUsers = async (token, params) => {
  const res = await axios.get(`${BASE_URL}/admin/user`, { ...auth(token), params });
  return res.data?.data || { users: [], total: 0, counts: {} };
};

export const fetchUser = async (token, userId) => {
  const res = await axios.get(`${BASE_URL}/admin/user/${userId}`, auth(token));
  return res.data?.data;
};

export const fetchUserAudit = async (token, userId) => {
  const res = await axios.get(`${BASE_URL}/admin/user/${userId}/audit`, auth(token));
  return res.data?.data || [];
};

// Every change carries a reason; the server writes it to the audit log.
export const updateUser = async (token, userId, changes, reason) => {
  const res = await axios.patch(`${BASE_URL}/admin/user/${userId}`, { ...changes, reason }, auth(token));
  return res.data?.data;
};

// action: 'suspend' | 'reactivate' | 'logout'
export const userAction = async (token, userId, action, reason) => {
  const res = await axios.post(`${BASE_URL}/admin/user/${userId}/${action}`, { reason }, auth(token));
  return res.data?.data;
};

export const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

export const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'No name yet';

export const formatDate = (value, withTime = false) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : '-';
