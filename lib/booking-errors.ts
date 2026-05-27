export function getBookingErrorMessage(message: string) {
  if (message.includes("specialist is unavailable on this date")) {
    return "სპეციალისტი ამ თარიღზე ხელმისაწვდომი არ არის. აირჩიე სხვა დღე.";
  }

  if (message.includes("specialist is not working on this weekday")) {
    return "სპეციალისტი კვირის ამ დღეს არ მუშაობს. აირჩიე სხვა დღე.";
  }

  return `შეცდომა: ${message}`;
}
