import { render, screen } from '@testing-library/react-native';
import { LeadListItem } from '../src/components/LeadListItem';

describe('LeadListItem', () => {
  it('renders name, email, and phone number', () => {
    render(
      <LeadListItem
        lead={{
          id: 'lead-1',
          full_name: 'Ada Lovelace',
          email: 'ada@example.com',
          phone_number: '+15551234567',
        }}
      />,
    );

    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('ada@example.com')).toBeTruthy();
    expect(screen.getByText('+15551234567')).toBeTruthy();
  });

  it('shows an em dash for missing contact fields', () => {
    render(<LeadListItem lead={{ id: 'lead-2', name: 'Grace Hopper' }} />);

    expect(screen.getByText('Grace Hopper')).toBeTruthy();
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('marks local mock leads clearly', () => {
    render(
      <LeadListItem
        lead={{
          id: 'mock-lead-1',
          full_name: 'Phone Mock Lead',
          is_mock_lead: true,
        }}
      />,
    );

    expect(screen.getByText('MOCK')).toBeTruthy();
  });
});