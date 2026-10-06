import { emitNewLead, setSocketServer } from '../src/services/socketEmitter';

describe('emitNewLead', () => {
  it('emits the lead as a new-lead event on the shared Socket.io server', () => {
    const emit = jest.fn();
    const lead = { id: 'lead-123', email: 'ada@example.com' };

    try {
      setSocketServer({ emit } as never);
      emitNewLead(lead);

      expect(emit).toHaveBeenCalledWith('new-lead', lead);
    } finally {
      setSocketServer(null);
    }
  });
});