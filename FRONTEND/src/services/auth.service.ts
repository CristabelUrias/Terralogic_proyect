// FRONTEND/src/services/auth.service.ts

import axios from 'axios';
import { UserCreate, AuthResponse } from '../types';

const API_URL = '/api/v1/auth';

// REGISTRO
export const registerUser = async (userData: UserCreate): Promise<AuthResponse> => {
  const response = await axios.post(`${API_URL}/register`, userData);
  return response.data;
};

// LOGIN
export const loginUser = async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
  const response = await axios.post(`${API_URL}/login`, credentials);
  return response.data;
};