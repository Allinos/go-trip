// seed.js
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seeding...");

  // =====================================================
  // CLEAN EXISTING DATA (Optional - be careful in production!)
  // =====================================================
  await cleanDatabase();

  // =====================================================
  // CREATE APP CONFIGURATIONS
  // =====================================================
  await seedAppConfigurations();

  // =====================================================
  // CREATE USERS
  // =====================================================
  const users = await seedUsers();

  // =====================================================
  // CREATE PARTNERS (Drivers & Vehicle Owners)
  // =====================================================
  const partners = await seedPartners(users);

  // =====================================================
  // CREATE VEHICLES
  // =====================================================
  const vehicles = await seedVehicles(partners);

  // =====================================================
  // CREATE RIDES
  // =====================================================
  const rides = await seedRides(users, partners, vehicles);

  // =====================================================
  // CREATE RENTAL BOOKINGS
  // =====================================================
  const rentals = await seedRentalBookings(users, partners, vehicles);

  // =====================================================
  // CREATE PAYMENTS
  // =====================================================
  const payments = await seedPayments(users, rides, rentals);

  // =====================================================
  // CREATE PARTNER SUBSCRIPTION PLANS
  // =====================================================
  const subscriptionPlans = await seedSubscriptionPlans();

  // =====================================================
  // CREATE PARTNER SUBSCRIPTIONS
  // =====================================================
  await seedPartnerSubscriptions(partners, subscriptionPlans, payments);

  // =====================================================
  // CREATE PARTNER EARNINGS
  // =====================================================
  await seedPartnerEarnings(partners, rides, rentals);

  // =====================================================
  // CREATE RATINGS & REVIEWS
  // =====================================================
  await seedRatingsAndReviews(users, partners, vehicles, rides, rentals);

  // =====================================================
  // CREATE USER SAVED LOCATIONS
  // =====================================================
  await seedUserSavedLocations(users);

  // =====================================================
  // CREATE EMERGENCY CONTACTS
  // =====================================================
  await seedEmergencyContacts(users);

  // =====================================================
  // CREATE PROMO CODES
  // =====================================================
  const promoCodes = await seedPromoCodes();

  // =====================================================
  // CREATE PROMO USAGE
  // =====================================================
  await seedPromoUsage(promoCodes, users, rides, rentals);

  // =====================================================
  // CREATE NOTIFICATIONS
  // =====================================================
  await seedNotifications(users);

  // =====================================================
  // CREATE PUSH TOKENS
  // =====================================================
  await seedPushTokens(users);

  // =====================================================
  // CREATE SUPPORT TICKETS
  // =====================================================
  await seedSupportTickets(users, rides, rentals);

  // =====================================================
  // CREATE FAQS
  // =====================================================
  await seedFaqs();

  // =====================================================
  // CREATE RIDE TRACKING
  // =====================================================
  await seedRideTracking(rides);

  // =====================================================
  // CREATE SOS ALERTS
  // =====================================================
  await seedSosAlerts(users, rides);

  // =====================================================
  // CREATE APP SESSIONS
  // =====================================================
  await seedAppSessions(users);

  // =====================================================
  // CREATE SEARCH LOGS
  // =====================================================
  await seedSearchLogs(users);

  console.log("Seeding completed successfully!");
}

async function cleanDatabase() {
  console.log("Cleaning existing data...");

  // Delete in reverse order of dependencies
  await prisma.$transaction([
    prisma.searchLog.deleteMany(),
    prisma.appSession.deleteMany(),
    prisma.sosAlert.deleteMany(),
    prisma.rideTracking.deleteMany(),
    prisma.faq.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.pushToken.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.promoUsage.deleteMany(),
    prisma.promoCode.deleteMany(),
    prisma.emergencyContact.deleteMany(),
    prisma.ratingsReview.deleteMany(),
    prisma.partnerEarning.deleteMany(),
    prisma.partnerSubscription.deleteMany(),
    prisma.partnerSubscriptionPlan.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.rentalBooking.deleteMany(),
    prisma.ride.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.partnerDocument.deleteMany(),
    prisma.partner.deleteMany(),
    prisma.userSavedLocation.deleteMany(),
    prisma.otpVerification.deleteMany(),
    prisma.user.deleteMany(),
    prisma.appConfiguration.deleteMany(),
  ]);
}

async function seedAppConfigurations() {
  console.log("Seeding app configurations...");

  const configs = [
    {
      config_key: "commission_percentage",
      config_value: "15.00",
      description: "Platform commission percentage",
    },
    {
      config_key: "cancellation_fee",
      config_value: "50.00",
      description: "Cancellation fee for rides",
    },
    {
      config_key: "sos_emergency_number",
      config_value: "100",
      description: "Emergency helpline number",
    },
    {
      config_key: "support_email",
      config_value: "support@rideflow.com",
      description: "Customer support email",
    },
    {
      config_key: "support_phone",
      config_value: "+91-1800-123-4567",
      description: "Customer support phone",
    },
    {
      config_key: "min_app_version_android",
      config_value: "1.0.0",
      description: "Minimum required Android app version",
    },
    {
      config_key: "tax_percentage",
      config_value: "5.00",
      description: "GST/Tax percentage on rides",
    },
    {
      config_key: "driver_subscription_fee",
      config_value: "499.00",
      description: "Monthly subscription fee for drivers",
    },
    {
      config_key: "lead_unlock_price",
      config_value: "49.00",
      description: "Price to unlock a lead",
    },
  ];

  for (const config of configs) {
    await prisma.appConfiguration.create({
      data: config,
    });
  }
}

async function seedUsers() {
  console.log("Seeding users...");

  const userData = [
    // Regular passengers
    {
      phone_number: "+919876543210",
      country_code: "+91",
      full_name: "Amit Sharma",
      email: "amit.sharma@example.com",
      profile_photo_url: "https://randomuser.me/api/portraits/men/1.jpg",
      date_of_birth: new Date("1990-05-15"),
      gender: "male",
      user_type: "passenger",
      is_verified: true,
      is_active: true,
      terms_accepted: true,
      privacy_accepted: true,
      last_login: new Date(),
    },
    {
      phone_number: "+919876543211",
      country_code: "+91",
      full_name: "Priya Patel",
      email: "priya.patel@example.com",
      profile_photo_url: "https://randomuser.me/api/portraits/women/2.jpg",
      date_of_birth: new Date("1995-08-22"),
      gender: "female",
      user_type: "passenger",
      is_verified: true,
      is_active: true,
      terms_accepted: true,
      privacy_accepted: true,
      last_login: new Date(),
    },
    {
      phone_number: "+919876543212",
      country_code: "+91",
      full_name: "Rahul Verma",
      email: "rahul.verma@example.com",
      profile_photo_url: "https://randomuser.me/api/portraits/men/3.jpg",
      date_of_birth: new Date("1988-11-03"),
      gender: "male",
      user_type: "passenger",
      is_verified: true,
      is_active: true,
      terms_accepted: true,
      privacy_accepted: true,
      last_login: new Date(),
    },
    // Drivers/Partners
    {
      phone_number: "+919876543213",
      country_code: "+91",
      full_name: "Rajesh Kumar",
      email: "rajesh.kumar@example.com",
      profile_photo_url: "https://randomuser.me/api/portraits/men/4.jpg",
      date_of_birth: new Date("1985-02-10"),
      gender: "male",
      user_type: "driver",
      is_verified: true,
      is_active: true,
      terms_accepted: true,
      privacy_accepted: true,
      last_login: new Date(),
    },
    {
      phone_number: "+919876543214",
      country_code: "+91",
      full_name: "Suresh Reddy",
      email: "suresh.reddy@example.com",
      profile_photo_url: "https://randomuser.me/api/portraits/men/5.jpg",
      date_of_birth: new Date("1982-07-19"),
      gender: "male",
      user_type: "driver",
      is_verified: true,
      is_active: true,
      terms_accepted: true,
      privacy_accepted: true,
      last_login: new Date(),
    },
    {
      phone_number: "+919876543215",
      country_code: "+91",
      full_name: "Vikram Singh",
      email: "vikram.singh@example.com",
      profile_photo_url: "https://randomuser.me/api/portraits/men/6.jpg",
      date_of_birth: new Date("1979-12-25"),
      gender: "male",
      user_type: "both",
      is_verified: true,
      is_active: true,
      terms_accepted: true,
      privacy_accepted: true,
      last_login: new Date(),
    },
  ];

  const users = [];
  for (const data of userData) {
    const user = await prisma.user.create({ data });
    users.push(user);

    // Create OTP verification for each user
    await prisma.otpVerification.create({
      data: {
        user_id: user.user_id,
        phone_number: user.phone_number,
        otp_code: "123456", // In production, this would be a real OTP
        otp_type: "login",
        is_verified: true,
        expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      },
    });
  }

  return users;
}

async function seedPartners(users) {
  console.log("Seeding partners...");

  // Get the driver users (last 3 users)
  const driverUsers = users.slice(-3);

  const partnerData = [
    {
      user_id: driverUsers[0].user_id,
      partner_type: "taxi_driver",
      business_name: "Rajesh Taxi Services",
      verification_status: "approved",
      verification_date: new Date("2024-01-15"),
      is_online: true,
      bank_account_number: "12345678901",
      bank_ifsc_code: "SBIN0012345",
      bank_account_holder: "Rajesh Kumar",
      upi_id: "rajesh.kumar@okhdfcbank",
      rating_average: 4.5,
      total_rides_completed: 1250,
      total_earnings: 187500.0,
      pending_payout: 2500.0,
      language_preference: "hi",
    },
    {
      user_id: driverUsers[1].user_id,
      partner_type: "vehicle_owner",
      business_name: "Reddy Rentals",
      verification_status: "approved",
      verification_date: new Date("2024-02-20"),
      is_online: true,
      bank_account_number: "23456789012",
      bank_ifsc_code: "HDFC0012345",
      bank_account_holder: "Suresh Reddy",
      upi_id: "suresh.reddy@okhdfcbank",
      rating_average: 4.8,
      total_rides_completed: 0, // Vehicle owner, not driver
      total_earnings: 45000.0,
      pending_payout: 5000.0,
      language_preference: "te",
    },
    {
      user_id: driverUsers[2].user_id,
      partner_type: "taxi_driver",
      business_name: "Singh Cabs",
      verification_status: "approved",
      verification_date: new Date("2024-01-10"),
      is_online: true,
      bank_account_number: "34567890123",
      bank_ifsc_code: "ICIC0012345",
      bank_account_holder: "Vikram Singh",
      upi_id: "vikram.singh@okicici",
      rating_average: 4.9,
      total_rides_completed: 2100,
      total_earnings: 315000.0,
      pending_payout: 3500.0,
      language_preference: "hi",
    },
  ];

  const partners = [];
  for (const data of partnerData) {
    const partner = await prisma.partner.create({ data });
    partners.push(partner);

    // Create partner documents
    await prisma.partnerDocument.createMany({
      data: [
        {
          partner_id: partner.partner_id,
          document_type: "driving_license",
          document_number: `DL${Math.floor(Math.random() * 1000000000)}`,
          document_url: `https://storage.rideflow.com/documents/dl_${partner.partner_id}.jpg`,
          verification_status: "approved",
          expiry_date: new Date("2028-12-31"),
          verified_at: new Date("2024-01-15"),
        },
        {
          partner_id: partner.partner_id,
          document_type: "aadhar",
          document_number: `${Math.floor(Math.random() * 100000000000)}`,
          document_url: `https://storage.rideflow.com/documents/aadhar_${partner.partner_id}.jpg`,
          verification_status: "approved",
          verified_at: new Date("2024-01-15"),
        },
        {
          partner_id: partner.partner_id,
          document_type: "pan",
          document_number: `ABCDE${Math.floor(Math.random() * 1000)}F`,
          document_url: `https://storage.rideflow.com/documents/pan_${partner.partner_id}.jpg`,
          verification_status: "approved",
          verified_at: new Date("2024-01-15"),
        },
      ],
    });
  }

  return partners;
}

async function seedVehicles(partners) {
  console.log("Seeding vehicles...");

  const vehicleData = [
    {
      partner_id: partners[0].partner_id,
      vehicle_type: "taxi",
      vehicle_category: "sedan",
      manufacturer: "Toyota",
      model: "Etios",
      year: 2022,
      color: "Silver",
      number_plate: "DL01AB1234",
      seating_capacity: 4,
      fuel_type: "diesel",
      ac_available: true,
      is_available: true,
      is_verified: true,
      ride_price_per_km: 12.0,
      base_fare: 50.0,
      vehicle_photos: JSON.stringify([
        "https://storage.rideflow.com/vehicles/1_front.jpg",
        "https://storage.rideflow.com/vehicles/1_interior.jpg",
        "https://storage.rideflow.com/vehicles/1_back.jpg",
      ]),
      features: JSON.stringify([
        "GPS",
        "Music System",
        "Phone Charger",
        "Bottle Water",
      ]),
      rating_average: 4.5,
      total_trips: 1250,
    },
    {
      partner_id: partners[0].partner_id,
      vehicle_type: "taxi",
      vehicle_category: "hatchback",
      manufacturer: "Maruti Suzuki",
      model: "Swift",
      year: 2023,
      color: "Red",
      number_plate: "DL01CD5678",
      seating_capacity: 4,
      fuel_type: "petrol",
      ac_available: true,
      is_available: true,
      is_verified: true,
      ride_price_per_km: 10.0,
      base_fare: 40.0,
      vehicle_photos: JSON.stringify([
        "https://storage.rideflow.com/vehicles/2_front.jpg",
        "https://storage.rideflow.com/vehicles/2_interior.jpg",
      ]),
      features: JSON.stringify(["GPS", "Music System", "Phone Charger"]),
      rating_average: 4.3,
      total_trips: 850,
    },
    {
      partner_id: partners[1].partner_id,
      vehicle_type: "rental_car",
      vehicle_category: "suv",
      manufacturer: "Hyundai",
      model: "Creta",
      year: 2023,
      color: "White",
      number_plate: "DL02EF9012",
      seating_capacity: 5,
      fuel_type: "diesel",
      ac_available: true,
      is_available: true,
      is_verified: true,
      rental_price_per_hour: 150.0,
      rental_price_per_day: 2500.0,
      vehicle_photos: JSON.stringify([
        "https://storage.rideflow.com/vehicles/3_front.jpg",
        "https://storage.rideflow.com/vehicles/3_interior.jpg",
        "https://storage.rideflow.com/vehicles/3_back.jpg",
      ]),
      features: JSON.stringify([
        "GPS",
        "Music System",
        "Sunroof",
        "Cruise Control",
      ]),
      rating_average: 4.8,
      total_trips: 45,
    },
    {
      partner_id: partners[2].partner_id,
      vehicle_type: "taxi",
      vehicle_category: "sedan",
      manufacturer: "Honda",
      model: "City",
      year: 2023,
      color: "Black",
      number_plate: "DL03GH3456",
      seating_capacity: 4,
      fuel_type: "petrol",
      ac_available: true,
      is_available: true,
      is_verified: true,
      ride_price_per_km: 14.0,
      base_fare: 60.0,
      vehicle_photos: JSON.stringify([
        "https://storage.rideflow.com/vehicles/4_front.jpg",
        "https://storage.rideflow.com/vehicles/4_interior.jpg",
      ]),
      features: JSON.stringify([
        "GPS",
        "Music System",
        "Phone Charger",
        "Leather Seats",
      ]),
      rating_average: 4.9,
      total_trips: 2100,
    },
  ];

  const vehicles = [];
  for (const data of vehicleData) {
    const vehicle = await prisma.vehicle.create({ data });
    vehicles.push(vehicle);
  }

  return vehicles;
}

async function seedRides(users, partners, vehicles) {
  console.log("Seeding rides...");

  // Get passenger users (first 3 users)
  const passengers = users.slice(0, 3);

  const rideData = [
    // Completed rides
    {
      ride_type: "taxi",
      passenger_id: passengers[0].user_id,
      driver_id: partners[0].partner_id,
      vehicle_id: vehicles[0].vehicle_id,
      pickup_address: "Indira Gandhi International Airport, New Delhi",
      pickup_latitude: 28.5562,
      pickup_longitude: 77.1,
      pickup_landmark: "Terminal 3",
      drop_address: "Connaught Place, New Delhi",
      drop_latitude: 28.6328,
      drop_longitude: 77.2197,
      drop_landmark: "Rajiv Chowk",
      scheduled_date: new Date("2024-03-10"),
      scheduled_time: new Date("2024-03-10T10:30:00"),
      pickup_datetime: new Date("2024-03-10T10:35:00"),
      start_datetime: new Date("2024-03-10T10:40:00"),
      end_datetime: new Date("2024-03-10T11:15:00"),
      distance_km: 18.5,
      duration_minutes: 35,
      seats_required: 1,
      base_fare: 50.0,
      distance_fare: 222.0,
      tax_amount: 13.6,
      discount_amount: 0,
      total_fare: 285.6,
      ride_status: "completed",
      created_at: new Date("2024-03-10T10:00:00"),
    },
    {
      ride_type: "taxi",
      passenger_id: passengers[1].user_id,
      driver_id: partners[2].partner_id,
      vehicle_id: vehicles[3].vehicle_id,
      pickup_address: "Saket, New Delhi",
      pickup_latitude: 28.5245,
      pickup_longitude: 77.2167,
      pickup_landmark: "Select Citywalk Mall",
      drop_address: "Cyber City, Gurugram",
      drop_latitude: 28.495,
      drop_longitude: 77.0887,
      drop_landmark: "Building 5",
      scheduled_date: new Date("2024-03-11"),
      scheduled_time: new Date("2024-03-11T09:00:00"),
      pickup_datetime: new Date("2024-03-11T09:05:00"),
      start_datetime: new Date("2024-03-11T09:10:00"),
      end_datetime: new Date("2024-03-11T09:45:00"),
      distance_km: 22.3,
      duration_minutes: 35,
      seats_required: 2,
      base_fare: 60.0,
      distance_fare: 312.2,
      tax_amount: 18.61,
      discount_amount: 0,
      total_fare: 390.81,
      ride_status: "completed",
      created_at: new Date("2024-03-11T08:30:00"),
    },
    // Upcoming ride
    {
      ride_type: "taxi",
      passenger_id: passengers[2].user_id,
      driver_id: partners[0].partner_id,
      vehicle_id: vehicles[1].vehicle_id,
      pickup_address: "Dwarka Sector 21, New Delhi",
      pickup_latitude: 28.5658,
      pickup_longitude: 77.0618,
      pickup_landmark: "Metro Station",
      drop_address: "Aerocity, New Delhi",
      drop_latitude: 28.5536,
      drop_longitude: 77.1216,
      drop_landmark: "Worldmark",
      scheduled_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      scheduled_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      pickup_datetime: null,
      start_datetime: null,
      end_datetime: null,
      distance_km: 8.2,
      duration_minutes: 20,
      seats_required: 3,
      base_fare: 40.0,
      distance_fare: 82.0,
      tax_amount: 6.1,
      discount_amount: 0,
      total_fare: 128.1,
      ride_status: "pending",
      created_at: new Date(),
    },
    // Cancelled ride
    {
      ride_type: "taxi",
      passenger_id: passengers[0].user_id,
      driver_id: partners[2].partner_id,
      vehicle_id: vehicles[3].vehicle_id,
      pickup_address: "Chandni Chowk, Delhi",
      pickup_latitude: 28.6505,
      pickup_longitude: 77.2303,
      pickup_landmark: "Red Fort",
      drop_address: "New Delhi Railway Station",
      drop_latitude: 28.6425,
      drop_longitude: 77.2217,
      drop_landmark: "Paharganj Side",
      scheduled_date: new Date("2024-03-05"),
      scheduled_time: new Date("2024-03-05T15:00:00"),
      pickup_datetime: null,
      start_datetime: null,
      end_datetime: null,
      distance_km: 3.5,
      duration_minutes: 15,
      seats_required: 1,
      base_fare: 40.0,
      distance_fare: 42.0,
      tax_amount: 4.1,
      discount_amount: 0,
      total_fare: 86.1,
      ride_status: "cancelled",
      cancellation_reason: "Passenger not available",
      cancelled_by: "passenger",
      cancelled_at: new Date("2024-03-05T14:45:00"),
      created_at: new Date("2024-03-05T13:00:00"),
    },
  ];

  const rides = [];
  for (const data of rideData) {
    const ride = await prisma.ride.create({ data });
    rides.push(ride);
  }

  return rides;
}

async function seedRentalBookings(users, partners, vehicles) {
  console.log("Seeding rental bookings...");

  const passengers = users.slice(0, 3);

  const rentalData = [
    // Completed rental
    {
      passenger_id: passengers[0].user_id,
      vehicle_id: vehicles[2].vehicle_id,
      owner_id: partners[1].partner_id,
      start_date: new Date("2024-03-01"),
      start_time: new Date("2024-03-01T09:00:00"),
      end_date: new Date("2024-03-05"),
      end_time: new Date("2024-03-05T18:00:00"),
      rental_duration_hours: 105,
      rental_duration_days: 4,
      price_per_hour: 150.0,
      price_per_day: 2500.0,
      total_rental_amount: 10000.0,
      security_deposit: 5000.0,
      tax_amount: 500.0,
      total_amount: 15500.0,
      pickup_location: "Hyundai Showroom, Dwarka, Delhi",
      return_location: "Hyundai Showroom, Dwarka, Delhi",
      booking_status: "completed",
      rental_agreement_url:
        "https://storage.rideflow.com/agreements/rental_1.pdf",
      created_at: new Date("2024-02-25"),
    },
    // Upcoming rental
    {
      passenger_id: passengers[1].user_id,
      vehicle_id: vehicles[2].vehicle_id,
      owner_id: partners[1].partner_id,
      start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      end_time: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      rental_duration_hours: 72,
      rental_duration_days: 3,
      price_per_hour: 150.0,
      price_per_day: 2500.0,
      total_rental_amount: 7500.0,
      security_deposit: 5000.0,
      tax_amount: 375.0,
      total_amount: 12875.0,
      pickup_location: "Hyundai Showroom, Dwarka, Delhi",
      return_location: "Hyundai Showroom, Dwarka, Delhi",
      booking_status: "confirmed",
      rental_agreement_url:
        "https://storage.rideflow.com/agreements/rental_2.pdf",
      created_at: new Date(),
    },
  ];

  const rentals = [];
  for (const data of rentalData) {
    const rental = await prisma.rentalBooking.create({ data });
    rentals.push(rental);
  }

  return rentals;
}

async function seedPayments(users, rides, rentals) {
  console.log("Seeding payments...");

  const paymentData = [
    // Payment for completed ride 1
    {
      transaction_type: "ride",
      ride_id: rides[0].ride_id,
      payer_id: users[0].user_id,
      payee_id: users[3].user_id, // Driver Rajesh
      amount: 285.6,
      payment_method: "upi",
      payment_status: "completed",
      transaction_id: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
      gateway_name: "razorpay",
      gateway_response: JSON.stringify({
        status: "success",
        payment_id: "pay_123456",
      }),
      payment_date: new Date("2024-03-10T11:16:00"),
    },
    // Payment for completed ride 2
    {
      transaction_type: "ride",
      ride_id: rides[1].ride_id,
      payer_id: users[1].user_id,
      payee_id: users[5].user_id, // Driver Vikram
      amount: 390.81,
      payment_method: "card",
      payment_status: "completed",
      transaction_id: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
      gateway_name: "razorpay",
      gateway_response: JSON.stringify({
        status: "success",
        payment_id: "pay_789012",
      }),
      payment_date: new Date("2024-03-11T09:46:00"),
    },
    // Payment for completed rental
    {
      transaction_type: "rental",
      rental_booking_id: rentals[0].booking_id,
      payer_id: users[0].user_id,
      payee_id: users[4].user_id, // Owner Suresh
      amount: 15500.0,
      payment_method: "netbanking",
      payment_status: "completed",
      transaction_id: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
      gateway_name: "razorpay",
      gateway_response: JSON.stringify({
        status: "success",
        payment_id: "pay_345678",
      }),
      payment_date: new Date("2024-02-25T14:30:00"),
    },
    // Payment for upcoming rental (partial/pending)
    {
      transaction_type: "rental",
      rental_booking_id: rentals[1].booking_id,
      payer_id: users[1].user_id,
      payee_id: users[4].user_id, // Owner Suresh
      amount: 5000.0, // Security deposit only
      payment_method: "upi",
      payment_status: "completed",
      transaction_id: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
      gateway_name: "razorpay",
      gateway_response: JSON.stringify({
        status: "success",
        payment_id: "pay_901234",
      }),
      payment_date: new Date(),
    },
  ];

  const payments = [];
  for (const data of paymentData) {
    const payment = await prisma.payment.create({ data });
    payments.push(payment);
  }

  return payments;
}

async function seedSubscriptionPlans() {
  console.log("Seeding subscription plans...");

  const planData = [
    {
      plan_name: "Basic Driver Plan",
      billing_type: "monthly",
      plan_price: 299.0,
      lead_unlock_price: 49.0,
      commission_percentage: 15.0,
      is_active: true,
    },
    {
      plan_name: "Pro Driver Plan",
      billing_type: "monthly",
      plan_price: 499.0,
      lead_unlock_price: 39.0,
      commission_percentage: 12.0,
      is_active: true,
    },
    {
      plan_name: "Premium Driver Plan",
      billing_type: "monthly",
      plan_price: 999.0,
      lead_unlock_price: 29.0,
      commission_percentage: 10.0,
      is_active: true,
    },
    {
      plan_name: "Vehicle Owner Plan",
      billing_type: "monthly",
      plan_price: 1999.0,
      lead_unlock_price: 0.0,
      commission_percentage: 8.0,
      is_active: true,
    },
  ];

  const plans = [];
  for (const data of planData) {
    const plan = await prisma.partnerSubscriptionPlan.create({ data });
    plans.push(plan);
  }

  return plans;
}

async function seedPartnerSubscriptions(partners, plans, payments) {
  console.log("Seeding partner subscriptions...");

  const subscriptionData = [
    {
      partner_id: partners[0].partner_id,
      plan_id: plans[1].plan_id, // Pro Driver Plan
      subscription_status: "active",
      start_date: new Date("2024-03-01"),
      end_date: new Date("2024-04-01"),
      payment_id: payments[0].payment_id,
      created_at: new Date("2024-03-01"),
    },
    {
      partner_id: partners[2].partner_id,
      plan_id: plans[2].plan_id, // Premium Driver Plan
      subscription_status: "active",
      start_date: new Date("2024-03-05"),
      end_date: new Date("2024-04-05"),
      payment_id: payments[1].payment_id,
      created_at: new Date("2024-03-05"),
    },
    {
      partner_id: partners[1].partner_id,
      plan_id: plans[3].plan_id, // Vehicle Owner Plan
      subscription_status: "active",
      start_date: new Date("2024-02-15"),
      end_date: new Date("2024-03-15"),
      payment_id: payments[2].payment_id,
      created_at: new Date("2024-02-15"),
    },
  ];

  for (const data of subscriptionData) {
    await prisma.partnerSubscription.create({ data });
  }
}

async function seedPartnerEarnings(partners, rides, rentals) {
  console.log("Seeding partner earnings...");

  const earningData = [
    // Earnings for Rajesh from ride 1
    {
      partner_id: partners[0].partner_id,
      ride_id: rides[0].ride_id,
      gross_amount: 285.6,
      commission_percentage: 15.0,
      commission_amount: 42.84,
      final_payout_amount: 242.76,
      net_earnings: 242.76,
      payout_status: "completed",
      payout_date: new Date("2024-03-12"),
      payout_transaction_id: `PO${Date.now()}${Math.floor(Math.random() * 1000)}`,
      earned_at: new Date("2024-03-10"),
    },
    // Earnings for Vikram from ride 2
    {
      partner_id: partners[2].partner_id,
      ride_id: rides[1].ride_id,
      gross_amount: 390.81,
      commission_percentage: 10.0, // Premium plan
      commission_amount: 39.08,
      final_payout_amount: 351.73,
      net_earnings: 351.73,
      payout_status: "completed",
      payout_date: new Date("2024-03-13"),
      payout_transaction_id: `PO${Date.now()}${Math.floor(Math.random() * 1000)}`,
      earned_at: new Date("2024-03-11"),
    },
    // Earnings for Suresh from rental
    {
      partner_id: partners[1].partner_id,
      rental_booking_id: rentals[0].booking_id,
      gross_amount: 15500.0,
      commission_percentage: 8.0, // Owner plan
      commission_amount: 1240.0,
      final_payout_amount: 14260.0,
      net_earnings: 14260.0,
      payout_status: "pending",
      earned_at: new Date("2024-03-05"),
    },
  ];

  for (const data of earningData) {
    await prisma.partnerEarning.create({ data });
  }
}

async function seedRatingsAndReviews(
  users,
  partners,
  vehicles,
  rides,
  rentals,
) {
  console.log("Seeding ratings and reviews...");

  const reviewData = [
    // Review for ride 1
    {
      review_type: "ride",
      ride_id: rides[0].ride_id,
      reviewer_id: users[0].user_id,
      reviewee_id: users[3].user_id, // Rajesh
      vehicle_id: vehicles[0].vehicle_id,
      rating: 4,
      review_text: "Good ride, driver was polite and reached on time.",
      review_tags: JSON.stringify(["Polite", "On Time", "Clean"]),
      is_visible: true,
      created_at: new Date("2024-03-11"),
    },
    // Review for ride 2
    {
      review_type: "ride",
      ride_id: rides[1].ride_id,
      reviewer_id: users[1].user_id,
      reviewee_id: users[5].user_id, // Vikram
      vehicle_id: vehicles[3].vehicle_id,
      rating: 5,
      review_text: "Excellent service! Very professional driver.",
      review_tags: JSON.stringify(["Professional", "Clean", "On Time"]),
      is_visible: true,
      created_at: new Date("2024-03-12"),
    },
    // Review for vehicle (rental)
    {
      review_type: "vehicle",
      rental_booking_id: rentals[0].booking_id,
      reviewer_id: users[0].user_id,
      reviewee_id: users[4].user_id, // Suresh
      vehicle_id: vehicles[2].vehicle_id,
      rating: 5,
      review_text: "Car was in excellent condition. Smooth rental process.",
      review_tags: JSON.stringify([
        "Clean",
        "Well Maintained",
        "Good Condition",
      ]),
      is_visible: true,
      created_at: new Date("2024-03-06"),
    },
  ];

  for (const data of reviewData) {
    await prisma.ratingsReview.create({ data });
  }
}

async function seedUserSavedLocations(users) {
  console.log("Seeding user saved locations...");

  const locationData = [
    // User 1 locations
    {
      user_id: users[0].user_id,
      location_type: "home",
      location_name: "Home",
      address: "123, Green Park Extension, New Delhi",
      latitude: 28.5577,
      longitude: 77.2456,
      landmark: "Near Green Park Metro Station",
    },
    {
      user_id: users[0].user_id,
      location_type: "work",
      location_name: "Office",
      address: "DLF Cyber City, Building 8, Gurugram",
      latitude: 28.495,
      longitude: 77.0887,
      landmark: "Near Cyber Hub",
    },
    // User 2 locations
    {
      user_id: users[1].user_id,
      location_type: "home",
      location_name: "Home",
      address: "456, Vasant Kunj, New Delhi",
      latitude: 28.5445,
      longitude: 77.1552,
      landmark: "Near Vasant Kunj Mall",
    },
    // User 3 locations
    {
      user_id: users[2].user_id,
      location_type: "other",
      location_name: "Gym",
      address: "789, Connaught Place, New Delhi",
      latitude: 28.6328,
      longitude: 77.2197,
      landmark: "Near Rajiv Chowk",
    },
  ];

  for (const data of locationData) {
    await prisma.userSavedLocation.create({ data });
  }
}

async function seedEmergencyContacts(users) {
  console.log("Seeding emergency contacts...");

  const contactData = [
    {
      user_id: users[0].user_id,
      contact_name: "Anita Sharma",
      contact_phone: "+919876543220",
      relationship: "Mother",
      is_primary: true,
    },
    {
      user_id: users[0].user_id,
      contact_name: "Ravi Sharma",
      contact_phone: "+919876543221",
      relationship: "Brother",
      is_primary: false,
    },
    {
      user_id: users[1].user_id,
      contact_name: "Rajesh Patel",
      contact_phone: "+919876543222",
      relationship: "Father",
      is_primary: true,
    },
    {
      user_id: users[2].user_id,
      contact_name: "Sunita Verma",
      contact_phone: "+919876543223",
      relationship: "Wife",
      is_primary: true,
    },
  ];

  for (const data of contactData) {
    await prisma.emergencyContact.create({ data });
  }
}

async function seedPromoCodes() {
  console.log("Seeding promo codes...");

  const promoData = [
    {
      promo_code: "WELCOME50",
      description: "Welcome discount for new users",
      discount_type: "fixed",
      discount_value: 50.0,
      max_discount_amount: 50.0,
      min_order_amount: 100.0,
      usage_limit_per_user: 1,
      total_usage_limit: 1000,
      times_used: 0,
      valid_from: new Date("2024-01-01"),
      valid_until: new Date("2024-12-31"),
      is_active: true,
      applicable_to: "all",
      user_type: "new",
    },
    {
      promo_code: "FLAT20",
      description: "20% off on all rides",
      discount_type: "percentage",
      discount_value: 20.0,
      max_discount_amount: 150.0,
      min_order_amount: 200.0,
      usage_limit_per_user: 3,
      total_usage_limit: 5000,
      times_used: 0,
      valid_from: new Date("2024-03-01"),
      valid_until: new Date("2024-04-30"),
      is_active: true,
      applicable_to: "ride",
      user_type: "all",
    },
    {
      promo_code: "RENTALSAVE",
      description: "Save on rental bookings",
      discount_type: "percentage",
      discount_value: 15.0,
      max_discount_amount: 1000.0,
      min_order_amount: 5000.0,
      usage_limit_per_user: 1,
      total_usage_limit: 100,
      times_used: 0,
      valid_from: new Date("2024-02-01"),
      valid_until: new Date("2024-05-31"),
      is_active: true,
      applicable_to: "rental",
      user_type: "all",
    },
    {
      promo_code: "SUMMER100",
      description: "Summer special discount",
      discount_type: "fixed",
      discount_value: 100.0,
      max_discount_amount: 100.0,
      min_order_amount: 300.0,
      usage_limit_per_user: 2,
      total_usage_limit: 2000,
      times_used: 0,
      valid_from: new Date("2024-04-01"),
      valid_until: new Date("2024-06-30"),
      is_active: true,
      applicable_to: "all",
      user_type: "all",
    },
  ];

  const promoCodes = [];
  for (const data of promoData) {
    const promo = await prisma.promoCode.create({ data });
    promoCodes.push(promo);
  }

  return promoCodes;
}

async function seedPromoUsage(promoCodes, users, rides, rentals) {
  console.log("Seeding promo usage...");

  const usageData = [
    {
      promo_id: promoCodes[0].promo_id,
      user_id: users[2].user_id, // New user Rahul
      ride_id: rides[2].ride_id, // Upcoming ride
      discount_applied: 50.0,
      used_at: new Date(),
    },
    {
      promo_id: promoCodes[1].promo_id,
      user_id: users[0].user_id,
      ride_id: rides[0].ride_id,
      discount_applied: 57.12, // 20% of 285.60
      used_at: new Date("2024-03-10"),
    },
  ];

  for (const data of usageData) {
    await prisma.promoUsage.create({ data });
  }

  // Update promo code usage count
  for (const usage of usageData) {
    await prisma.promoCode.update({
      where: { promo_id: usage.promo_id },
      data: { times_used: { increment: 1 } },
    });
  }
}

async function seedNotifications(users) {
  console.log("Seeding notifications...");

  const notificationData = [
    {
      user_id: users[0].user_id,
      notification_type: "ride_completed",
      title: "Ride Completed",
      message:
        "Your ride from Airport to Connaught Place has been completed. Thank you for riding with us!",
      data: JSON.stringify({ ride_id: 1, type: "ride_completed" }),
      is_read: true,
      read_at: new Date("2024-03-10T11:30:00"),
      sent_at: new Date("2024-03-10T11:15:00"),
    },
    {
      user_id: users[1].user_id,
      notification_type: "payment",
      title: "Payment Successful",
      message: "Your payment of ₹390.81 for ride to Cyber City was successful.",
      data: JSON.stringify({ payment_id: 2, amount: 390.81 }),
      is_read: false,
      sent_at: new Date("2024-03-11T09:47:00"),
    },
    {
      user_id: users[3].user_id, // Driver Rajesh
      notification_type: "ride_request",
      title: "New Ride Request",
      message: "You have a new ride request from Dwarka to Aerocity.",
      data: JSON.stringify({ ride_id: 3, passenger_name: "Rahul Verma" }),
      is_read: false,
      sent_at: new Date(),
    },
    {
      user_id: users[4].user_id, // Owner Suresh
      notification_type: "system",
      title: "Rental Booking Confirmed",
      message:
        "Your vehicle (Creta) has been booked for rental from 15 Apr to 18 Apr.",
      data: JSON.stringify({ booking_id: 2, vehicle_model: "Creta" }),
      is_read: true,
      read_at: new Date(),
      sent_at: new Date(),
    },
  ];

  for (const data of notificationData) {
    await prisma.notification.create({ data });
  }
}

async function seedPushTokens(users) {
  console.log("Seeding push tokens...");

  const tokenData = [
    {
      user_id: users[0].user_id,
      device_token: `fcm_token_android_${Date.now()}_${users[0].user_id}`,
      device_type: "android",
      is_active: true,
    },
    {
      user_id: users[1].user_id,
      device_token: `fcm_token_ios_${Date.now()}_${users[1].user_id}`,
      device_type: "ios",
      is_active: true,
    },
    {
      user_id: users[3].user_id, // Driver Rajesh
      device_token: `fcm_token_android_${Date.now()}_${users[3].user_id}`,
      device_type: "android",
      is_active: true,
    },
  ];

  for (const data of tokenData) {
    await prisma.pushToken.create({ data });
  }
}

async function seedSupportTickets(users, rides, rentals) {
  console.log("Seeding support tickets...");

  const ticketData = [
    {
      user_id: users[0].user_id,
      ride_id: rides[0].ride_id,
      ticket_type: "ride_issue",
      priority: "low",
      subject: "Lost item in taxi",
      description:
        "I think I left my water bottle in the taxi. Can you help me retrieve it?",
      status: "resolved",
      resolution_notes:
        "Driver has been contacted. Item found and will be returned.",
      created_at: new Date("2024-03-11"),
      updated_at: new Date("2024-03-12"),
      resolved_at: new Date("2024-03-12"),
    },
    {
      user_id: users[1].user_id,
      ride_id: rides[1].ride_id,
      ticket_type: "payment_issue",
      priority: "high",
      subject: "Incorrect fare charged",
      description: "I was charged ₹390 but the estimated fare was ₹350.",
      status: "in_progress",
      created_at: new Date("2024-03-11"),
    },
    {
      user_id: users[2].user_id,
      ticket_type: "account",
      priority: "medium",
      subject: "Unable to update profile photo",
      description:
        "Every time I try to update my profile photo, it shows an error.",
      status: "open",
      created_at: new Date(),
    },
  ];

  for (const data of ticketData) {
    await prisma.supportTicket.create({ data });
  }
}

async function seedFaqs() {
  console.log("Seeding FAQs...");

  const faqData = [
    {
      category: "passenger",
      question: "How do I book a ride?",
      answer:
        "Open the app, enter your pickup and drop locations, select your preferred vehicle type, and confirm the booking. You will be matched with a nearby driver.",
      display_order: 1,
      is_active: true,
    },
    {
      category: "passenger",
      question: "How can I pay for my ride?",
      answer:
        "We accept multiple payment methods including cash, UPI (Google Pay, PhonePe, Paytm), credit/debit cards, and net banking.",
      display_order: 2,
      is_active: true,
    },
    {
      category: "partner",
      question: "How do I become a driver partner?",
      answer:
        "Download the partner app, register with your details, upload the required documents (driving license, Aadhar, PAN, vehicle RC), and complete the verification process.",
      display_order: 1,
      is_active: true,
    },
    {
      category: "partner",
      question: "What is the commission structure?",
      answer:
        "The commission varies based on your subscription plan. Basic plan has 15% commission, Pro has 12%, and Premium has 10% commission.",
      display_order: 2,
      is_active: true,
    },
    {
      category: "payment",
      question: "When will I receive my earnings?",
      answer:
        "Driver earnings are settled weekly every Monday. You can also withdraw your pending earnings instantly using the Instant Payout feature.",
      display_order: 1,
      is_active: true,
    },
    {
      category: "rental",
      question: "What documents are required for renting a vehicle?",
      answer:
        "You need a valid driving license, government ID proof (Aadhar/Passport), and a security deposit which will be refunded after the rental period.",
      display_order: 1,
      is_active: true,
    },
  ];

  for (const data of faqData) {
    await prisma.faq.create({ data });
  }
}

async function seedRideTracking(rides) {
  console.log("Seeding ride tracking data...");

  // Only add tracking for completed rides
  const trackingData = [
    {
      ride_id: rides[0].ride_id,
      driver_latitude: 28.6328,
      driver_longitude: 77.2197,
      speed_kmph: 45.5,
      heading: 90.0,
      eta_minutes: 0,
      distance_to_pickup_km: 0,
      recorded_at: new Date("2024-03-10T11:15:00"),
    },
    {
      ride_id: rides[1].ride_id,
      driver_latitude: 28.495,
      driver_longitude: 77.0887,
      speed_kmph: 50.2,
      heading: 180.0,
      eta_minutes: 0,
      distance_to_pickup_km: 0,
      recorded_at: new Date("2024-03-11T09:45:00"),
    },
  ];

  for (const data of trackingData) {
    await prisma.rideTracking.create({ data });
  }
}

async function seedSosAlerts(users, rides) {
  console.log("Seeding SOS alerts...");

  const sosData = [
    {
      user_id: users[0].user_id,
      ride_id: rides[0].ride_id,
      alert_type: "safety_concern",
      latitude: 28.6328,
      longitude: 77.2197,
      location_address: "Connaught Place, New Delhi",
      alert_status: "resolved",
      response_notes: "False alarm. User accidentally pressed SOS button.",
      triggered_at: new Date("2024-03-10T11:20:00"),
      resolved_at: new Date("2024-03-10T11:25:00"),
    },
    {
      user_id: users[1].user_id,
      ride_id: rides[1].ride_id,
      alert_type: "emergency",
      latitude: 28.495,
      longitude: 77.0887,
      location_address: "Cyber City, Gurugram",
      alert_status: "active",
      triggered_at: new Date(),
    },
  ];

  for (const data of sosData) {
    await prisma.sosAlert.create({ data });
  }
}

async function seedAppSessions(users) {
  console.log("Seeding app sessions...");

  const sessionData = [
    {
      user_id: users[0].user_id,
      device_id: "device_android_1",
      device_type: "android",
      app_version: "1.2.3",
      os_version: "Android 14",
      session_start: new Date("2024-03-10T10:00:00"),
      session_end: new Date("2024-03-10T10:30:00"),
      duration_seconds: 1800,
    },
    {
      user_id: users[1].user_id,
      device_id: "device_ios_1",
      device_type: "ios",
      app_version: "1.2.3",
      os_version: "iOS 17",
      session_start: new Date("2024-03-11T08:45:00"),
      session_end: new Date("2024-03-11T09:15:00"),
      duration_seconds: 1800,
    },
    {
      user_id: users[3].user_id, // Driver Rajesh
      device_id: "device_android_2",
      device_type: "android",
      app_version: "1.2.3",
      os_version: "Android 14",
      session_start: new Date(),
      session_end: null,
      duration_seconds: null,
    },
  ];

  for (const data of sessionData) {
    await prisma.appSession.create({ data });
  }
}

async function seedSearchLogs(users) {
  console.log("Seeding search logs...");

  const searchData = [
    {
      user_id: users[0].user_id,
      search_type: "ride",
      pickup_location: "Green Park",
      drop_location: "Connaught Place",
      vehicle_type: "sedan",
      search_date: new Date("2024-03-10"),
      search_time: new Date("2024-03-10T09:30:00"),
      results_count: 12,
      booking_made: true,
      searched_at: new Date("2024-03-10T09:30:00"),
    },
    {
      user_id: users[1].user_id,
      search_type: "ride",
      pickup_location: "Saket",
      drop_location: "Cyber City",
      vehicle_type: "suv",
      search_date: new Date("2024-03-11"),
      search_time: new Date("2024-03-11T08:15:00"),
      results_count: 8,
      booking_made: true,
      searched_at: new Date("2024-03-11T08:15:00"),
    },
    {
      user_id: users[2].user_id,
      search_type: "rental",
      pickup_location: "Dwarka",
      vehicle_type: "suv",
      search_date: new Date(),
      search_time: new Date(),
      results_count: 3,
      booking_made: false,
      searched_at: new Date(),
    },
  ];

  for (const data of searchData) {
    await prisma.searchLog.create({ data });
  }
}

// Run the seed function
main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
