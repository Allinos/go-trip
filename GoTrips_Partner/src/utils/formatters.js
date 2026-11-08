const parseDate = (value) => {
  if (!value) return null;

  // ✅ Case 1: already valid date string or timestamp
  const normalDate = new Date(value);
  if (!isNaN(normalDate.getTime())) {
    return normalDate;
  }

  // ✅ Case 2: object with seconds (Firestore / custom backend)
  if (typeof value === "object" && value.seconds) {
    return new Date(value.seconds * 1000);
  }

  // ❌ Invalid format
  return null;
};

export { parseDate };