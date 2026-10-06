import { StyleSheet, Text, View } from 'react-native';
import type { Lead } from '../types/lead';

function leadName(lead: Lead): string {
  return (
    lead.full_name ||
    lead.name ||
    [lead.first_name, lead.last_name].filter(Boolean).join(' ') ||
    'New lead'
  );
}

function leadTime(createdTime?: string): string {
  if (!createdTime) {
    return 'JUST NOW';
  }

  const timestamp = Date.parse(createdTime);
  if (Number.isNaN(timestamp)) {
    return 'JUST NOW';
  }

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function LeadListItem({ lead }: { lead: Lead }) {
  return (
    <View style={styles.item} testID="lead-item">
      <View style={styles.heading}>
        <Text style={styles.name} numberOfLines={1}>
          {leadName(lead)}
        </Text>
        <Text style={styles.time}>{leadTime(lead.created_time)}</Text>
      </View>
      <View style={styles.details}>
        <View style={styles.detail}>
          <Text style={styles.label}>EMAIL</Text>
          <Text style={styles.value} numberOfLines={1}>
            {lead.email || '—'}
          </Text>
        </View>
        <View style={styles.detail}>
          <Text style={styles.label}>PHONE</Text>
          <Text style={styles.value} numberOfLines={1}>
            {lead.phone_number || lead.phone || '—'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1E7DF',
    borderLeftColor: '#18775C',
    borderLeftWidth: 3,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  name: {
    color: '#17271F',
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  time: {
    color: '#728078',
    fontSize: 10,
    fontWeight: '700',
  },
  details: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 13,
  },
  detail: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: '#758178',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  value: {
    color: '#26372D',
    fontSize: 13,
  },
});