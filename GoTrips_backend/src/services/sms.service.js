const axios = require("axios");

// SMS Provider Configuration
const SMS_PROVIDER = process.env.SMS_PROVIDER || "console"; // console, twilio, fast2sms, msg91, textlocal

// Initialize providers based on configuration
let twilioClient = null;

if (
  SMS_PROVIDER === "twilio" &&
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN
) {
  const twilio = require("twilio");
  twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
  console.log("✅ Twilio SMS service initialized");
}

/**
 * Console SMS Provider (for testing/development)
 * Logs OTP to console - no external service needed
 */
const sendViaConsole = async (phoneNumber, message, otp = null) => {
  console.log("\n" + "=".repeat(50));
  console.log("📱 SMS (CONSOLE MODE - TESTING ONLY)");
  console.log("=".repeat(50));
  console.log(`To: ${phoneNumber}`);
  console.log(`Message: ${message}`);
  if (otp) {
    console.log(`\n🔐 OTP: ${otp}`);
    console.log("\n⚠️  Copy this OTP for testing");
  }
  console.log("=".repeat(50) + "\n");

  return {
    success: true,
    provider: "console",
    messageId: `console_${Date.now()}`,
    message: "SMS logged to console (testing mode)",
  };
};

/**
 * Twilio SMS Provider
 * Reliable international SMS service
 */
const sendViaTwilio = async (phoneNumber, message) => {
  if (!twilioClient) {
    throw new Error(
      "Twilio not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN",
    );
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log(
      `✅ SMS sent via Twilio to ${phoneNumber} - SID: ${result.sid}`,
    );

    return {
      success: true,
      provider: "twilio",
      messageId: result.sid,
      status: result.status,
    };
  } catch (error) {
    console.error("❌ Twilio SMS failed:", error.message);
    throw new Error(`Twilio: ${error.message}`);
  }
};

/**
 * Fast2SMS Provider (Popular in India)
 * Supports both promotional and transactional messages
 * Website: https://www.fast2sms.com/
 */
const sendViaFast2SMS = async (phoneNumber, message, otp = null) => {
  const apiKey = process.env.FAST2SMS_API_KEY;

  if (!apiKey) {
    throw new Error("Fast2SMS not configured. Set FAST2SMS_API_KEY in .env");
  }

  // Remove country code if present (Fast2SMS needs 10-digit number)
  const cleanNumber = phoneNumber.replace(/^\+91/, "").replace(/\D/g, "");

  if (cleanNumber.length !== 10) {
    throw new Error("Fast2SMS requires 10-digit Indian mobile number");
  }

  try {
    let response;

    if (otp) {
      // Use OTP-specific endpoint (higher delivery rate)
      response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
        params: {
          authorization: apiKey,
          variables_values: otp,
          route: "otp",
          numbers: cleanNumber,
        },
        timeout: 10000,
      });
    } else {
      // Use general message endpoint
      response = await axios.get("https://www.fast2sms.com/dev/bulkV2", {
        params: {
          authorization: apiKey,
          route: "q", // Quick transactional route
          message: message,
          language: "english",
          flash: 0,
          numbers: cleanNumber,
        },
        timeout: 10000,
      });
    }

    const data = response.data;

    if (data.return === true || data.status_code === 200) {
      console.log(
        `✅ SMS sent via Fast2SMS to ${cleanNumber} - ID: ${data.message_id || data.request_id}`,
      );

      return {
        success: true,
        provider: "fast2sms",
        messageId: data.message_id || data.request_id,
        status: "sent",
        response: data,
      };
    } else {
      throw new Error(data.message || "Fast2SMS API returned error");
    }
  } catch (error) {
    console.error("❌ Fast2SMS failed:", error.message);

    if (error.response) {
      console.error("Response data:", error.response.data);
      throw new Error(
        `Fast2SMS: ${error.response.data.message || error.message}`,
      );
    }

    throw new Error(`Fast2SMS: ${error.message}`);
  }
};

/**
 * MSG91 Provider (Alternative Indian SMS service)
 * Website: https://msg91.com/
 */
const sendViaMSG91 = async (phoneNumber, message, otp = null) => {
  const authKey = process.env.MSG91_AUTH_KEY;
  const senderId = process.env.MSG91_SENDER_ID || "RIDFLW";

  if (!authKey) {
    throw new Error("MSG91 not configured. Set MSG91_AUTH_KEY in .env");
  }

  const cleanNumber = phoneNumber.replace(/^\+91/, "").replace(/\D/g, "");

  try {
    const response = await axios.post(
      "https://api.msg91.com/api/v5/flow/",
      {
        flow_id: process.env.MSG91_TEMPLATE_ID, // Template ID from MSG91 dashboard
        sender: senderId,
        mobiles: "91" + cleanNumber,
        VAR1: otp || message, // Variable for template
      },
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    console.log(`✅ SMS sent via MSG91 to ${cleanNumber}`);

    return {
      success: true,
      provider: "msg91",
      messageId: response.data.request_id || response.data.message_id,
      status: "sent",
    };
  } catch (error) {
    console.error("❌ MSG91 failed:", error.message);
    throw new Error(`MSG91: ${error.message}`);
  }
};

/**
 * TextLocal Provider (UK/India SMS service)
 * Website: https://www.textlocal.in/
 */
const sendViaTextLocal = async (phoneNumber, message) => {
  const apiKey = process.env.TEXTLOCAL_API_KEY;
  const sender = process.env.TEXTLOCAL_SENDER || "RIDFLW";

  if (!apiKey) {
    throw new Error("TextLocal not configured. Set TEXTLOCAL_API_KEY in .env");
  }

  const cleanNumber = phoneNumber.replace(/^\+91/, "").replace(/\D/g, "");

  try {
    const response = await axios.post("https://api.textlocal.in/send/", null, {
      params: {
        apikey: apiKey,
        numbers: cleanNumber,
        message: message,
        sender: sender,
      },
      timeout: 10000,
    });

    const data = response.data;

    if (data.status === "success") {
      console.log(`✅ SMS sent via TextLocal to ${cleanNumber}`);

      return {
        success: true,
        provider: "textlocal",
        messageId: data.messages[0]?.id,
        status: "sent",
      };
    } else {
      throw new Error(data.errors[0]?.message || "TextLocal API error");
    }
  } catch (error) {
    console.error("❌ TextLocal failed:", error.message);
    throw new Error(`TextLocal: ${error.message}`);
  }
};

/**
 * Main send SMS function - routes to appropriate provider
 */
const sendSMS = async (phoneNumber, message, otp = null) => {
  const provider = SMS_PROVIDER.toLowerCase();

  console.log(`📤 Sending SMS via ${provider} to ${phoneNumber}`);

  try {
    switch (provider) {
      case "twilio":
        return await sendViaTwilio(phoneNumber, message);

      case "fast2sms":
        return await sendViaFast2SMS(phoneNumber, message, otp);

      case "msg91":
        return await sendViaMSG91(phoneNumber, message, otp);

      case "textlocal":
        return await sendViaTextLocal(phoneNumber, message);

      case "console":
      default:
        return await sendViaConsole(phoneNumber, message, otp);
    }
  } catch (error) {
    console.error(`❌ SMS sending failed via ${provider}:`, error.message);

    // Fallback to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("⚠️  Falling back to console mode for testing");
      return await sendViaConsole(phoneNumber, message, otp);
    }

    throw error;
  }
};

/**
 * Send OTP via SMS
 * @param {String} phoneNumber - Phone number with country code
 * @param {String} otp - OTP code
 */
const sendOTP = async (phoneNumber, otp) => {
  const message = `Your RideFlow verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
  return await sendSMS(phoneNumber, message, otp);
};

/**
 * Send ride notification
 * @param {String} phoneNumber - Phone number
 * @param {String} message - Message to send
 */
const sendRideNotification = async (phoneNumber, message) => {
  try {
    return await sendSMS(phoneNumber, message);
  } catch (error) {
    console.error("Ride notification SMS failed:", error.message);
    // Don't throw - notifications are non-critical
    return { success: false, error: error.message };
  }
};

/**
 * Send bulk SMS
 * @param {Array} recipients - Array of {phoneNumber, message, otp}
 */
const sendBulkSMS = async (recipients) => {
  console.log(`📤 Sending bulk SMS to ${recipients.length} recipients`);

  const promises = recipients.map(({ phoneNumber, message, otp }) =>
    sendSMS(phoneNumber, message, otp).catch((error) => ({
      error: true,
      phoneNumber,
      message: error.message,
    })),
  );

  const results = await Promise.all(promises);

  const successful = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error);

  return {
    success: true,
    total: recipients.length,
    successful,
    failed: failed.length,
    failedRecipients: failed,
  };
};

/**
 * Send verification code (generic)
 * @param {String} phoneNumber - Phone number
 * @param {String} code - Verification code
 * @param {String} purpose - Purpose of the code
 */
const sendVerificationCode = async (
  phoneNumber,
  code,
  purpose = "verification",
) => {
  const message = `Your RideFlow ${purpose} code is: ${code}. Valid for 5 minutes.`;
  return await sendSMS(phoneNumber, message, code);
};

/**
 * Check SMS service status and configuration
 */
const checkServiceStatus = () => {
  const provider = SMS_PROVIDER.toLowerCase();

  const providerConfigs = {
    console: {
      configured: true,
      note: "Testing mode - SMS logged to console only",
    },
    twilio: {
      configured: !!(twilioClient && process.env.TWILIO_ACCOUNT_SID),
      accountSid: process.env.TWILIO_ACCOUNT_SID
        ? `${process.env.TWILIO_ACCOUNT_SID.substring(0, 8)}...`
        : "Not configured",
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || "Not configured",
    },
    fast2sms: {
      configured: !!process.env.FAST2SMS_API_KEY,
      apiKey: process.env.FAST2SMS_API_KEY
        ? `${process.env.FAST2SMS_API_KEY.substring(0, 8)}...`
        : "Not configured",
    },
    msg91: {
      configured: !!process.env.MSG91_AUTH_KEY,
      authKey: process.env.MSG91_AUTH_KEY
        ? `${process.env.MSG91_AUTH_KEY.substring(0, 8)}...`
        : "Not configured",
      senderId: process.env.MSG91_SENDER_ID || "Not set",
    },
    textlocal: {
      configured: !!process.env.TEXTLOCAL_API_KEY,
      apiKey: process.env.TEXTLOCAL_API_KEY
        ? `${process.env.TEXTLOCAL_API_KEY.substring(0, 8)}...`
        : "Not configured",
    },
  };

  return {
    currentProvider: provider,
    providerStatus: providerConfigs[provider] || { configured: false },
    allProviders: providerConfigs,
  };
};

/**
 * Test SMS sending (for debugging)
 */
const testSMS = async (phoneNumber) => {
  console.log("🧪 Testing SMS service...");

  try {
    const result = await sendOTP(phoneNumber, "123456");
    console.log("✅ Test SMS sent successfully:", result);
    return result;
  } catch (error) {
    console.error("❌ Test SMS failed:", error.message);
    throw error;
  }
};

module.exports = {
  sendOTP,
  sendSMS,
  sendRideNotification,
  sendBulkSMS,
  sendVerificationCode,
  checkServiceStatus,
  testSMS,
};
