partner-app/
│
├── App.js
├── app.json
├── package.json
├── babel.config.js
│
├── assets/
│   ├── images/
│   ├── icons/
│   ├── animations/
│   └── fonts/
│
├── src/
│
│   ├── components/          # Reusable UI components
│   │   ├── buttons/
│   │   │   └── PrimaryButton.js
│   │   ├── cards/
│   │   │   └── DriverCard.js
│   │   ├── inputs/
│   │   │   └── TextInputField.js
│   │   └── loaders/
│   │       └── Loader.js
│   │
│   ├── screens/             # App screens
│   │   ├── auth/
│   │   │   ├── LoginScreen.js
│   │   │   ├── RegisterScreen.js
│   │   │   └── OTPVerifyScreen.js
│   │   │
│   │   ├── home/
│   │   │   └── HomeScreen.js
│   │   │
│   │   ├── bookings/
│   │   │   ├── BookingListScreen.js
│   │   │   └── BookingDetailScreen.js
│   │   │
│   │   ├── earnings/
│   │   │   └── EarningsScreen.js
│   │   │
│   │   ├── profile/
│   │   │   └── ProfileScreen.js
│   │   │
│   │   └── settings/
│   │       └── SettingsScreen.js
│   │
│   ├── navigation/          # Navigation logic
│   │   ├── AppNavigator.js
│   │   ├── AuthNavigator.js
│   │   └── TabNavigator.js
│   │
│   ├── services/            # API calls
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── bookingService.js
│   │   └── driverService.js
│   │
│   ├── store/               # Global state (Redux / Zustand)
│   │   ├── index.js
│   │   ├── authStore.js
│   │   └── bookingStore.js
│   │
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.js
│   │   └── useLocation.js
│   │
│   ├── utils/               # Utility functions
│   │   ├── helpers.js
│   │   ├── validators.js
│   │   └── formatters.js
│   │
│   ├── constants/           # App constants
│   │   ├── colors.js
│   │   ├── theme.js
│   │   ├── fonts.js
│   │   └── config.js
│   │
│   ├── context/             # React Context (optional)
│   │   └── AuthContext.js
│   │
│   ├── config/              # App configs
│   │   ├── firebase.js
│   │   └── env.js
│   │
│   └── styles/              # Global styles
│       └── globalStyles.js
│
└── README.md