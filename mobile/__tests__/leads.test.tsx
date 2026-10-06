import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import LeadsScreen from '../app/leads';
import { useLeadSocket } from '../src/hooks/useLeadSocket';

jest.mock('../src/hooks/useLeadSocket', () => ({
  useLeadSocket: jest.fn(),
}));

describe('LeadsScreen', () => {
  const createTestLead = jest.fn();
  const deleteTestLead = jest.fn();
  const refreshLeads = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders an empty state when there are no leads', () => {
    (useLeadSocket as jest.Mock).mockReturnValue({
      leads: [],
      connected: true,
      loading: false,
      creating: false,
      deletingId: null,
      error: null,
      refreshLeads,
      createTestLead,
      deleteTestLead,
    });

    render(<LeadsScreen />);

    expect(screen.getByText('No leads yet')).toBeTruthy();
  });

  it('renders each lead newest first', () => {
    (useLeadSocket as jest.Mock).mockReturnValue({
      connected: true,
      loading: false,
      creating: false,
      deletingId: null,
      error: null,
      refreshLeads,
      createTestLead,
      deleteTestLead,
      leads: [
        { id: 'lead-2', full_name: 'Grace Hopper', email: 'grace@example.com' },
        { id: 'lead-1', full_name: 'Ada Lovelace', email: 'ada@example.com' },
      ],
    });

    render(<LeadsScreen />);

    const leadItems = screen.getAllByTestId('lead-item');
    expect(leadItems).toHaveLength(2);
    expect(within(leadItems[0]).getByText('Grace Hopper')).toBeTruthy();
    expect(within(leadItems[1]).getByText('Ada Lovelace')).toBeTruthy();
  });

  it('submits the editable lead fields from the Android screen', async () => {
    (useLeadSocket as jest.Mock).mockReturnValue({
      leads: [],
      connected: true,
      loading: false,
      creating: false,
      deletingId: null,
      error: null,
      refreshLeads,
      createTestLead,
      deleteTestLead,
    });
    createTestLead.mockResolvedValue(undefined);

    render(<LeadsScreen />);
    fireEvent.press(screen.getByText('Create test lead'));

    expect(createTestLead).toHaveBeenCalledWith({
      full_name: 'Android Test Lead',
      email: 'android-test@example.com',
      phone_number: '+15555550100',
    });
  });

  it('offers deletion and prevents creating a second test lead for the form', () => {
    (useLeadSocket as jest.Mock).mockReturnValue({
      leads: [
        {
          id: 'test-lead-1',
          full_name: 'Existing Test Lead',
          is_test_lead: true,
        },
      ],
      connected: true,
      loading: false,
      creating: false,
      deletingId: null,
      error: null,
      refreshLeads,
      createTestLead,
      deleteTestLead,
    });

    render(<LeadsScreen />);

    expect(screen.getByText('Delete test lead to create another')).toBeTruthy();
    fireEvent.press(screen.getByText('Create test lead'));
    expect(createTestLead).not.toHaveBeenCalled();
  });
});