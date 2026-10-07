import axios from 'axios';
import BASE_URL from '@/utils/api';

const auth = (token) => ({ headers: { 'x-access-token': token } });

// A "case" is every report about one thing (targetType + targetId).
export const fetchCases = async (token, params) => {
  const res = await axios.get(`${BASE_URL}/admin/report/cases`, { ...auth(token), params });
  return res.data?.data || { cases: [], total: 0, counts: {} };
};

export const fetchCase = async (token, targetType, targetId) => {
  const res = await axios.get(`${BASE_URL}/admin/report/cases/${targetType}/${encodeURIComponent(targetId)}`, auth(token));
  return res.data?.data;
};

// action: 'HIDE' | 'UNHIDE' | 'WARN' | 'SUSPEND' | 'CLOSE'. `message` is only for WARN (the text the user sees).
export const caseAction = async (token, targetType, targetId, { action, reason, message }) => {
  const res = await axios.post(
    `${BASE_URL}/admin/report/cases/${targetType}/${encodeURIComponent(targetId)}/action`,
    { action, reason, ...(message ? { message } : {}) },
    auth(token)
  );
  return res.data?.data;
};

export const errorMessage = (error, fallback) => error?.response?.data?.message || fallback;

export const TARGET_LABEL = {
  USER: 'User',
  POST: 'Post',
  POST_COMMENT: 'Post comment',
  BLOG_COMMENT: 'Blog comment',
  GROUP: 'Group',
  GROUP_MESSAGE: 'Group message',
  HELP_REQUEST: 'Help request',
  EVENT: 'Event',
};

export const TARGET_TYPES = Object.keys(TARGET_LABEL);

// In the order the app shows them.
export const REASON_LABEL = {
  SPAM: 'Spam or advertising',
  HARASSMENT: 'Bullying or harassment',
  HATE: 'Hate or discrimination',
  INAPPROPRIATE: 'Inappropriate or offensive',
  SCAM: 'Scam or asking for money',
  FALSE_INFO: 'False or misleading',
  OTHER: 'Something else',
};

// Short versions for chips in the list.
export const REASON_SHORT = {
  SPAM: 'Spam',
  HARASSMENT: 'Harassment',
  HATE: 'Hate',
  INAPPROPRIATE: 'Inappropriate',
  SCAM: 'Scam',
  FALSE_INFO: 'False info',
  OTHER: 'Other',
};

export const ACTION_LABEL = {
  HIDE: 'Hid content',
  UNHIDE: 'Showed content again',
  WARN: 'Warned user',
  SUSPEND: 'Suspended user',
  CLOSE: 'Closed, no action',
};

export const ACTION_COLOR = { HIDE: 'warning', UNHIDE: 'info', WARN: 'warning', SUSPEND: 'error', CLOSE: 'success' };

// Reasons sorted by how often they were picked, most first.
export const sortedReasons = (reasons) =>
  Object.entries(reasons || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

export const formatDate = (value, withTime = false) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
      })
    : '-';

// "just now", "5 min ago", "3 h ago", "2 days ago", then a plain date after a week.
export const timeAgo = (value) => {
  if (!value) return '-';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (Number.isNaN(diff)) return '-';
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 86400 * 7) {
    const days = Math.floor(diff / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  }
  return formatDate(value);
};
