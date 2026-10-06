import axios from 'axios';
import BASE_URL from '@/utils/api';

const auth = (token, extra = {}) => ({ headers: { 'x-access-token': token, ...extra } });
const data = (res) => res.data?.data;

export const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

export const listBlogs = async (token, params) =>
  data(await axios.get(`${BASE_URL}/admin/blog/list`, { ...auth(token), params }));

export const getBlog = async (token, id) => data(await axios.get(`${BASE_URL}/admin/blog/${id}`, auth(token)));

/** Create (no id) or update. `fields` become multipart form fields; `cover` is a File or null. */
export const saveBlog = async (token, id, fields, cover) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  if (cover) form.append('image', cover);
  const config = auth(token, { 'Content-Type': 'multipart/form-data' });
  const res = id
    ? await axios.put(`${BASE_URL}/admin/blog/${id}`, form, config)
    : await axios.post(`${BASE_URL}/admin/blog`, form, config);
  return data(res);
};

export const setBlogStatus = async (token, id, status, publishedAt) =>
  data(await axios.patch(`${BASE_URL}/admin/blog/${id}/status`, { status, ...(publishedAt ? { publishedAt } : {}) }, auth(token)));

export const deleteBlog = (token, id) => axios.delete(`${BASE_URL}/admin/blog/${id}`, auth(token));

/** Uploads a picture for inside a post; returns its URL. */
export const uploadInlineImage = async (token, file) => {
  const form = new FormData();
  form.append('image', file);
  return data(await axios.post(`${BASE_URL}/admin/blog/upload-image`, form, auth(token, { 'Content-Type': 'multipart/form-data' })))?.url;
};

export const listTopics = async (token) =>
  data(await axios.get(`${BASE_URL}/admin/interest/getUserInterest`, auth(token))) || [];

export const listComments = async (token, params) =>
  data(await axios.get(`${BASE_URL}/admin/blog/comments`, { ...auth(token), params }));

export const setCommentHidden = (token, id, hidden) =>
  axios.patch(`${BASE_URL}/admin/blog/comments/${id}`, { hidden }, auth(token));

export const deleteComment = (token, id) => axios.delete(`${BASE_URL}/admin/blog/comments/${id}`, auth(token));

/** The admin token saved at login. */
export const readToken = () => {
  try {
    return JSON.parse(sessionStorage.getItem('user') || 'null')?.data?.adminToken || '';
  } catch {
    return '';
  }
};
