<Modal visible={locationModalVisible} animationType="slide" transparent={true}>
  <View style={modalStyles.overlay}>
    <View style={modalStyles.content}>
      <Text style={styles.sectionTitle}>
        Enter {activeType === "pickup" ? "Pickup" : "Drop"} Details
      </Text>

      <CustomInput
        label="District"
        placeholder="e.g. Kathmandu"
        value={tempLocation.district}
        onChange={(t) => setTempLocation({ ...tempLocation, district: t })}
      />
      <CustomInput
        label="Major Point / Landmark"
        placeholder="e.g. Kalanki Chowk"
        value={tempLocation.point}
        onChange={(t) => setTempLocation({ ...tempLocation, point: t })}
      />
      <CustomInput
        label="Detailed Address"
        placeholder="e.g. Near the main gate"
        value={tempLocation.address}
        multiline
        onChange={(t) => setTempLocation({ ...tempLocation, address: t })}
      />

      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.publishBtn,
            { flex: 1, backgroundColor: "#64748B", marginRight: 10 },
          ]}
          onPress={() => setLocationModalVisible(false)}
        >
          <Text style={styles.publishText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.publishBtn, { flex: 2 }]}
          onPress={handleLocationConfirm}
        >
          <Text style={styles.publishText}>Confirm</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>;
