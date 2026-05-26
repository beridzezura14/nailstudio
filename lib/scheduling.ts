export const BUSINESS_START_MINUTES = 10 * 60;
export const BUSINESS_END_MINUTES = 20 * 60;
export const SLOT_STEP_MINUTES = 15;
const LONG_SERVICE_SLOT_STEP_MINUTES = 30;

export interface TimeRange {
  id?: string;
  start_time: string;
  end_time: string;
}

export interface AvailableSlot {
  start: string;
  end: string;
}

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.substring(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatLocalDate(date: Date) {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
}

function roundUpToSlotStep(minutes: number) {
  return Math.ceil(minutes / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
}

function getMinimumStartMinutes(dateString?: string) {
  if (!dateString) return BUSINESS_START_MINUTES;

  const now = new Date();
  if (dateString !== formatLocalDate(now)) return BUSINESS_START_MINUTES;

  return Math.max(
    BUSINESS_START_MINUTES,
    roundUpToSlotStep(now.getHours() * 60 + now.getMinutes())
  );
}

export function rangesOverlap(
  firstStart: number,
  firstEnd: number,
  secondStart: number,
  secondEnd: number
) {
  return firstStart < secondEnd && secondStart < firstEnd;
}

export function getAvailableSlots(
  bookings: TimeRange[],
  durationMinutes: number,
  excludeBookingId?: string,
  dateString?: string
) {
  const slots: AvailableSlot[] = [];
  const minimumStartMinutes = getMinimumStartMinutes(dateString);
  const slotStepMinutes =
    durationMinutes <= SLOT_STEP_MINUTES
      ? SLOT_STEP_MINUTES
      : LONG_SERVICE_SLOT_STEP_MINUTES;

  for (
    let startMinutes = BUSINESS_START_MINUTES;
    startMinutes + durationMinutes <= BUSINESS_END_MINUTES;
    startMinutes += slotStepMinutes
  ) {
    if (startMinutes < minimumStartMinutes) continue;

    const endMinutes = startMinutes + durationMinutes;
    const hasOverlap = bookings.some((booking) => {
      if (booking.id && booking.id === excludeBookingId) return false;

      return rangesOverlap(
        startMinutes,
        endMinutes,
        timeToMinutes(booking.start_time),
        timeToMinutes(booking.end_time)
      );
    });

    if (!hasOverlap) {
      slots.push({
        start: minutesToTime(startMinutes),
        end: minutesToTime(endMinutes),
      });
    }
  }

  return slots;
}

export function getAvailableGaps(
  bookings: TimeRange[],
  excludeBookingId?: string,
  dateString?: string
) {
  const minimumStartMinutes = getMinimumStartMinutes(dateString);
  const sortedBookings = bookings
    .filter((booking) => !booking.id || booking.id !== excludeBookingId)
    .map((booking) => ({
      start: Math.max(BUSINESS_START_MINUTES, timeToMinutes(booking.start_time)),
      end: Math.min(BUSINESS_END_MINUTES, timeToMinutes(booking.end_time)),
    }))
    .filter((booking) => booking.start < booking.end)
    .sort((first, second) => first.start - second.start);

  const gaps: AvailableSlot[] = [];
  let cursor = minimumStartMinutes;

  sortedBookings.forEach((booking) => {
    if (booking.end <= cursor) return;

    if (booking.start > cursor) {
      gaps.push({
        start: minutesToTime(cursor),
        end: minutesToTime(booking.start),
      });
    }

    cursor = Math.max(cursor, booking.end);
  });

  if (cursor < BUSINESS_END_MINUTES) {
    gaps.push({
      start: minutesToTime(cursor),
      end: minutesToTime(BUSINESS_END_MINUTES),
    });
  }

  return gaps;
}

export function getTimelineSlots(bookings: TimeRange[]) {
  const slots: Array<AvailableSlot & { booking?: TimeRange }> = [];

  for (
    let startMinutes = BUSINESS_START_MINUTES;
    startMinutes < BUSINESS_END_MINUTES;
    startMinutes += SLOT_STEP_MINUTES
  ) {
    const endMinutes = startMinutes + SLOT_STEP_MINUTES;
    const booking = bookings.find((item) =>
      rangesOverlap(
        startMinutes,
        endMinutes,
        timeToMinutes(item.start_time),
        timeToMinutes(item.end_time)
      )
    );

    slots.push({
      start: minutesToTime(startMinutes),
      end: minutesToTime(endMinutes),
      booking,
    });
  }

  return slots;
}
