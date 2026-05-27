import { create } from 'zustand';
import api from '../lib/api';
import { resetSocket } from '../lib/socket';

const useAuthStore = create((set) => ({
  user: null,
  token: null,

  hydrate: () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (token && user) set({ token, user });
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
    return user;
  },

  register: async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    const { token, user } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ token, user });
    return user;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    resetSocket();
    set({ token: null, user: null });
  },
}));

export default useAuthStore;
