export type Lead = {
  id: string;
  created_time?: string;
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  phone?: string;
  [field: string]: unknown;
};