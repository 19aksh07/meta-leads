import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeadListItem } from '../src/components/LeadListItem';
import { useLeadSocket } from '../src/hooks/useLeadSocket';

export default function LeadsScreen({ socketUrl }: { socketUrl?: string } = {}) {
  const {
    leads,
    connected,
    mode,
    loading,
    creating,
    deletingId,
    error,
    refreshLeads,
    createTestLead,
    deleteTestLead,
  } = useLeadSocket(socketUrl);
  const [fullName, setFullName] = useState('Android Test Lead');
  const [email, setEmail] = useState('android-test@example.com');
  const [phoneNumber, setPhoneNumber] = useState('+15555550100');
  const [actionError, setActionError] = useState<string | null>(null);
  const testLead =
    mode === 'meta'
      ? leads.find((lead) => lead.is_test_lead && !lead.is_mock_lead)
      : undefined;

  const handleDeleteLead = async (leadId: string) => {
    setActionError(null);
    try {
      await deleteTestLead(leadId);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete the lead',
      );
    }
  };

  const handleCreate = async () => {
    setActionError(null);
    try {
      await createTestLead({
        full_name: fullName,
        email,
        phone_number: phoneNumber,
      });
    } catch (createError) {
      setActionError(
        createError instanceof Error
          ? createError.message
          : 'Could not create a test lead',
      );
    }
  };

  const handleDelete = async () => {
    if (!testLead) {
      return;
    }
    setActionError(null);
    try {
      await deleteTestLead(testLead.id);
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Could not delete the test lead',
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.topLine}>
          <Text style={styles.eyebrow}>META LEAD ADS / INBOX</Text>
          <View style={styles.connection}>
            <View
              style={[
                styles.connectionDot,
                connected ? styles.connectedDot : styles.disconnectedDot,
              ]}
            />
            <Text style={styles.connectionText}>
              {connected ? 'LIVE' : 'CONNECTING'}
            </Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Lead feed</Text>
            <Text style={styles.subtitle}>Recent form submissions</Text>
          </View>
          <View style={styles.count}>
            <Text style={styles.countValue}>{leads.length}</Text>
            <Text style={styles.countLabel}>LEADS</Text>
          </View>
        </View>

        <FlatList
          contentContainerStyle={[
            styles.listContent,
            leads.length === 0 && styles.emptyListContent,
          ]}
          data={leads}
          keyExtractor={(lead) => lead.id}
          renderItem={({ item }) => (
            <LeadListItem
              lead={item}
              deleting={deletingId === item.id}
              onDelete={
                item.is_test_lead
                  ? () => void handleDeleteLead(item.id)
                  : undefined
              }
            />
          )}
          ListHeaderComponent={
            <View style={styles.testCard}>
              <View style={styles.cardHeading}>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>
                    {mode === 'mock'
                      ? 'Create a mock lead'
                      : 'Create a Meta test lead'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {mode === 'mock'
                      ? 'Creates a local sample lead you can view in this feed.'
                      : 'Creates a fake lead for your configured form.'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void refreshLeads()}
                  style={styles.refreshButton}
                >
                  <Text style={styles.refreshText}>
                    {loading ? '…' : 'Refresh'}
                  </Text>
                </Pressable>
              </View>

              <TextInput
                accessibilityLabel="Lead name"
                onChangeText={setFullName}
                placeholder="Full name"
                style={styles.input}
                value={fullName}
              />
              <TextInput
                accessibilityLabel="Lead email"
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Email"
                style={styles.input}
                value={email}
              />
              <TextInput
                accessibilityLabel="Lead phone number"
                keyboardType="phone-pad"
                onChangeText={setPhoneNumber}
                placeholder="Phone number"
                style={styles.input}
                value={phoneNumber}
              />

              <Pressable
                accessibilityRole="button"
                disabled={loading || creating || Boolean(testLead)}
                onPress={() => void handleCreate()}
                style={[
                  styles.createButton,
                  (loading || creating || testLead) && styles.disabledButton,
                ]}
              >
                <Text style={styles.createButtonText}>
                  {loading
                    ? 'Loading leads…'
                    : creating
                      ? 'Creating…'
                      : mode === 'mock'
                        ? 'Create mock lead'
                        : 'Create test lead'}
                </Text>
              </Pressable>

              {testLead ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={deletingId === testLead.id}
                  onPress={() => void handleDelete()}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>
                    {deletingId === testLead.id
                      ? 'Deleting…'
                      : 'Delete test lead to create another'}
                  </Text>
                </Pressable>
              ) : null}

              {actionError || error ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {actionError || error}
                </Text>
              ) : null}
              <Text style={styles.note}>
                {mode === 'mock'
                  ? 'Mock leads are local to this backend and clear when it restarts. They are not sent to Meta.'
                  : 'Meta allows one test lead per form at a time. This does not create a real ad lead.'}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyMark}>
                <Text style={styles.emptyMarkText}>+</Text>
              </View>
              <Text style={styles.emptyTitle}>No leads yet</Text>
              <Text style={styles.emptyCopy}>
                {loading
                  ? 'Loading Meta test leads…'
                  : 'New submissions will appear here.'}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F2F5EF',
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 20,
  },
  topLine: {
    alignItems: 'center',
    borderBottomColor: '#DEE5DC',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 16,
    paddingTop: 10,
  },
  eyebrow: {
    color: '#617168',
    fontSize: 10,
    fontWeight: '800',
  },
  connection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE5DC',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connectionDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  connectedDot: {
    backgroundColor: '#18845F',
  },
  disconnectedDot: {
    backgroundColor: '#C7863B',
  },
  connectionText: {
    color: '#45564B',
    fontSize: 9,
    fontWeight: '800',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 18,
    paddingTop: 24,
  },
  title: {
    color: '#1C2D23',
    fontFamily: 'Georgia',
    fontSize: 30,
  },
  subtitle: {
    color: '#718077',
    fontSize: 13,
    marginTop: 4,
  },
  testCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7DF',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 18,
    padding: 14,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardCopy: {
    flex: 1,
  },
  cardTitle: {
    color: '#24372B',
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#718077',
    fontSize: 12,
    marginTop: 3,
  },
  refreshButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  refreshText: {
    color: '#18775C',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F8FAF7',
    borderColor: '#DCE5DC',
    borderRadius: 5,
    borderWidth: 1,
    color: '#26372D',
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  createButton: {
    alignItems: 'center',
    backgroundColor: '#18775C',
    borderRadius: 5,
    marginTop: 2,
    paddingVertical: 11,
  },
  disabledButton: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: '#D8A5A0',
    borderRadius: 5,
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 9,
  },
  deleteButtonText: {
    color: '#9A3F37',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: '#A83228',
    fontSize: 12,
    marginTop: 9,
  },
  note: {
    color: '#718077',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },
  count: {
    alignItems: 'center',
    backgroundColor: '#E1EAE1',
    borderRadius: 6,
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  countValue: {
    color: '#1D6B52',
    fontSize: 18,
    fontWeight: '800',
  },
  countLabel: {
    color: '#60746A',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
  },
  listContent: {
    paddingBottom: 24,
    paddingTop: 4,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingBottom: 70,
  },
  emptyMark: {
    alignItems: 'center',
    backgroundColor: '#E0EAE1',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  emptyMarkText: {
    color: '#18775C',
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },
  emptyTitle: {
    color: '#24372B',
    fontFamily: 'Georgia',
    fontSize: 21,
    marginTop: 16,
  },
  emptyCopy: {
    color: '#718077',
    fontSize: 13,
    marginTop: 6,
  },
});