import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { EventContext } from '../../context/EventContext';
import { AuthContext } from '../../context/AuthContext';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const { fetchEvent, registerForEvent } = useContext(EventContext);
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    setLoading(true);
    const result = await fetchEvent(eventId);
    if (result.success) {
      setEvent(result.data);
    } else {
      Alert.alert('Error', result.message);
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    const result = await registerForEvent(eventId);
    if (result.success) {
      Alert.alert('Success', 'You have successfully registered for this event!');
      loadEvent(); // Refresh event data
    } else {
      Alert.alert('Error', result.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const isRegistered = event.attendees?.some(
    (attendee) => attendee._id === user?._id
  );
  const isOwner = event.createdBy?._id === user?._id;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.label}>📅 Date:</Text>
          <Text style={styles.value}>
            {new Date(event.date).toLocaleString()}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>📍 Location:</Text>
          <Text style={styles.value}>{event.location}</Text>
        </View>

        {event.price > 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>💰 Price:</Text>
            <Text style={styles.value}>${event.price}</Text>
          </View>
        )}

        {event.capacity > 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>👥 Capacity:</Text>
            <Text style={styles.value}>
              {event.attendees?.length || 0} / {event.capacity}
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <Text style={styles.category}>{event.category}</Text>
        </View>

        {!isOwner && (
          <TouchableOpacity
            style={[
              styles.registerButton,
              isRegistered && styles.registeredButton,
            ]}
            onPress={handleRegister}
            disabled={isRegistered}
          >
            <Text style={styles.registerButtonText}>
              {isRegistered ? 'Already Registered' : 'Register for Event'}
            </Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <View style={styles.ownerBadge}>
            <Text style={styles.ownerText}>You are the event organizer</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 10,
    minWidth: 100,
  },
  value: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  category: {
    fontSize: 16,
    color: '#007AFF',
    textTransform: 'capitalize',
  },
  registerButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  registeredButton: {
    backgroundColor: '#34C759',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  ownerBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  ownerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#FF3B30',
  },
});

export default EventDetailScreen;

