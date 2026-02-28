export function toDayString(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    .toISOString()
    .slice(0, 10);
}

export function asUTC(dayString) {
  return new Date(dayString + "T00:00:00Z");
}

export function addDays(dayString, days) {
  var date = asUTC(dayString);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayDelta(fromDay, toDay) {
  var fromDate = asUTC(fromDay);
  var toDate = asUTC(toDay);
  return Math.floor((toDate - fromDate) / 86400000);
}
