// Recurring workdays carry their date in the title ("Monthly Garden Meet Up -
// November 8, 2026"). Wherever a date is already shown beside the title, drop it.
export function titleWithoutDate(title) {
  return (title || '').replace(/\s+[-–—]\s+[A-Z][a-z]+ \d{1,2},? \d{4}$/, '');
}
