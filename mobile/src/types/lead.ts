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
  is_test_lead?: boolean;
  is_mock_lead?: boolean;
  [field: string]: unknown;
};