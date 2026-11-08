import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, View, Text, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyBookings, cancelBookingApi } from 'api/ridesApi';

const STATUS_TABS = [
  { id: 'upcoming', label: 'Upcoming', values: ['confirmed', 'pending'] },
  { id: 'past', label: 'Past', values: ['completed', 'cancelled', 'no_show'] }
];

export default function BookingsScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Cancellation Modal State
  const [cancelModal, setCancelModal] = useState({ visible: false, id: null, reason: '' });

  const fetchBookings = async (pageNum = 1, isRefreshing = false) => {
    try {
      const statusFilter = STATUS_TABS.find(t => t.id === activeTab).values.join(',');
      const res = await getMyBookings(pageNum, statusFilter);
      
      if (res.data.success) {
        const newBookings = res.data.data; // Array from paginated response
        setBookings(prev => isRefreshing ? newBookings : [...prev, ...newBookings]);
        setHasMore(res.data.pagination.hasNext);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setBookings([]);
    setPage(1);
    fetchBookings(1, true);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchBookings(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchBookings(nextPage);
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelModal.reason) return Alert.alert("Required", "Please provide a reason");
    
    try {
      const res = await cancelBookingApi(cancelModal.id, cancelModal.reason);
      if (res.data.success) {
        Alert.alert("Success", "Booking cancelled");
        setCancelModal({ visible: false, id: null, reason: '' });
        onRefresh(); // Refresh list to update status
      }
    } catch (err) {
      Alert.alert("Error", "Could not cancel booking");
    }
  };

  const renderBookingItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>
          {new Date(item.ride.scheduledDepartureTime).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.bookingStatus) }]}>
          <Text style={styles.statusText}>{item.bookingStatus.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <View style={styles.dotColumn}>
          <View style={styles.dot} />
          <View style={styles.line} />
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
        </View>
        <View style={styles.addressColumn}>
          <Text style={styles.address} numberOfLines={1}>{item.ride.pickupAddress}</Text>
          <Text style={styles.address} numberOfLines={1}>{item.ride.dropAddress}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.infoLabel}>Vehicle</Text>
          <Text style={styles.infoValue}>{item.ride.vehicle.model}</Text>
        </View>
        <View>
          <Text style={styles.infoLabel}>Fare</Text>
          <Text style={styles.infoValue}>₹{item.fareAmount}</Text>
        </View>
        
        {activeTab === 'upcoming' && item.bookingStatus !== 'cancelled' && (
          <TouchableOpacity 
            style={styles.cancelLink}
            onPress={() => setCancelModal({ ...cancelModal, visible: true, id: item.bookingId })}
          >
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity 
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && page === 1 ? (
        <ActivityIndicator size="large" color="#EF5350" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.bookingId.toString()}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EF5350" />}
          ListEmptyComponent={<Text style={styles.emptyText}>No bookings found</Text>}
        />
      )}

      {/* Cancellation Modal */}
      <Modal visible={cancelModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Ride</Text>
            <Text style={styles.modalSub}>Why do you want to cancel this booking?</Text>
            <TextInput 
              style={styles.reasonInput}
              placeholder="Reason for cancellation..."
              multiline
              value={cancelModal.reason}
              onChangeText={(t) => setCancelModal({...cancelModal, reason: t})}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setCancelModal({ visible: false, id: null, reason: '' })}>
                <Text>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={handleCancelRequest}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Confirm Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStatusColor = (status) => {
  switch(status) {
    case 'confirmed': return '#10B981';
    case 'pending': return '#F59E0B';
    case 'cancelled': return '#EF4444';
    default: return '#64748B';
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFF', padding: 10, elevation: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#EF5350' },
  tabText: { fontWeight: 'bold', color: '#94A3B8' },
  activeTabText: { color: '#EF5350' },
  listContent: { padding: 15 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  dateText: { fontWeight: 'bold', fontSize: 16, color: '#1E293B' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  locationRow: { flexDirection: 'row', marginBottom: 15 },
  dotColumn: { alignItems: 'center', marginRight: 10, paddingTop: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF5350' },
  line: { width: 1, flex: 1, backgroundColor: '#E2E8F0', marginVertical: 2 },
  addressColumn: { flex: 1, gap: 10 },
  address: { fontSize: 14, color: '#475569' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  infoLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  cancelLink: { justifyContent: 'center' },
  cancelLinkText: { color: '#EF5350', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94A3B8' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  modalSub: { color: '#64748B', marginBottom: 15 },
  reasonInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, height: 80, padding: 10, textAlignVertical: 'top', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, padding: 15, alignItems: 'center', borderRadius: 10 },
  modalConfirm: { backgroundColor: '#EF5350' }
});