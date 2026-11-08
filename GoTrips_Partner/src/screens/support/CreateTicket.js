import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Install: npm install @react-native-picker/picker
import { createTicketApi } from 'api/supportApi';

export default function CreateTicketScreen({ route, navigation }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ticketType: route.params?.type || 'ride_issue',
    priority: 'medium',
    subject: '',
    description: '',
    rideId: route.params?.rideId || '',
  });

  const handleSubmit = async () => {
    // Basic Joi-aligned validation
    if (form.subject.length < 5) return Alert.alert("Error", "Subject too short");
    if (form.description.length < 20) return Alert.alert("Error", "Description must be 20+ chars");

    setLoading(true);
    try {
      const res = await createTicketApi(form);
      if (res.data.success) {
        Alert.alert("Success", "Ticket created. Our team will contact you soon.");
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Error", "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.createContainer}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerBorder}>
        <Picker
          selectedValue={form.ticketType}
          onValueChange={(itemValue) => setForm({...form, ticketType: itemValue})}
        >
          <Picker.Item label="Ride Issue" value="ride_issue" />
          <Picker.Item label="Payment Issue" value="payment_issue" />
          <Picker.Item label="Driver Complaint" value="driver_complaint" />
          <Picker.Item label="Account" value="account" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>

      <Text style={styles.label}>Subject</Text>
      <TextInput 
        style={styles.input} 
        placeholder="Briefly describe the issue"
        value={form.subject}
        onChangeText={(t) => setForm({...form, subject: t})}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput 
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]} 
        placeholder="Please provide detailed information..."
        multiline
        value={form.description}
        onChangeText={(t) => setForm({...form, description: t})}
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.submitText}>{loading ? 'Creating...' : 'Submit Ticket'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
// Create Ticket Styles
  createContainer: { flex: 1, backgroundColor: '#FFF', padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#64748B', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 15, fontSize: 16 },
  pickerBorder: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, backgroundColor: '#F8F9FA' },
  submitBtn: { backgroundColor: '#EF5350', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});