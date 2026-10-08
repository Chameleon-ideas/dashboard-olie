import axios from 'axios';
import BASE_URL from '@/utils/api';

const auth = (token) => ({ headers: { 'x-access-token': token } });

// params: { search, status: 'active' | 'deleted', inactiveDays, maxMembers, sort: 'recent' | 'inactive' | 'members', page, limit }
export const fetchGroups = async (token, params) => {
  const res = await axios.get(`${BASE_URL}/admin/groups`, { ...auth(token), params });
  return res.data?.data || { groups: [], total: 0, counts: {} };
};

// Soft delete: hidden for everyone, members are told. Returns { deleted: [ids], skipped: [{ id, reason }] }.
export const deleteGroups = async (token, ids, reason) => {
  const res = await axios.post(`${BASE_URL}/admin/groups/delete`, { ids, reason }, auth(token));
  return { ...(res.data?.data || { deleted: [], skipped: [] }), message: res.data?.message };
};
