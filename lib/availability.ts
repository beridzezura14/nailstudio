export interface SpecialistTimeOff {
  id?: string;
  specialist_id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

export type WorkingDaysBySpecialist = Record<string, number[]>;
export type TimeOffBySpecialist = Record<string, SpecialistTimeOff[]>;

export function getDateWeekday(date: Date) {
  return date.getDay();
}

export function specialistWorksOnDate(
  specialistId: string,
  date: Date,
  workingDaysBySpecialist: WorkingDaysBySpecialist,
  timeOffBySpecialist: TimeOffBySpecialist,
  dateString: string
) {
  const workingDays = workingDaysBySpecialist[specialistId];
  const worksThisWeekday =
    !workingDays || workingDays.length === 0 || workingDays.includes(getDateWeekday(date));

  if (!worksThisWeekday) return false;

  return !(timeOffBySpecialist[specialistId] || []).some(
    (period) => period.start_date <= dateString && period.end_date >= dateString
  );
}

export function specialistIsTimeOffOnDate(
  specialistId: string,
  timeOffBySpecialist: TimeOffBySpecialist,
  dateString: string
) {
  return (timeOffBySpecialist[specialistId] || []).some(
    (period) => period.start_date <= dateString && period.end_date >= dateString
  );
}
