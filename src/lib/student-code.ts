/**
 * Student ID: joining year (India) + gender + running number, e.g. 26-M-00007.
 * The running number is one shared sequence, so it is unique on its own.
 * `genderParam` is the SQL placeholder ("$19") that holds 'M' or 'F'.
 * (Students created without a gender, e.g. before this existed, have the older form 26-00001.)
 */
export const studentCodeSql = (genderParam: string) =>
  `(to_char(now() at time zone 'Asia/Kolkata', 'YY') || '-' || ${genderParam}::text || '-' || lpad(nextval('student_no_seq')::text, 5, '0'))`;
