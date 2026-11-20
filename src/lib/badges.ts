export interface BadgeDef {
  code: string;
  icon: string;
  name: { en: string; gu: string };
  desc: { en: string; gu: string };
}

export const BADGES: BadgeDef[] = [
  { code: "first_step", icon: "🌱", name: { en: "Pratham Kadam", gu: "પ્રથમ કદમ" }, desc: { en: "Logged your first day", gu: "પહેલો દિવસ નોંધ્યો" } },
  { code: "perfect_day", icon: "🌟", name: { en: "Perfect Day", gu: "સંપૂર્ણ દિવસ" }, desc: { en: "Completed every Yes/No niyam in a day", gu: "એક દિવસમાં બધા હા/ના નિયમ પાળ્યા" } },
  { code: "streak_7", icon: "🪔", name: { en: "7-Day Streak", gu: "૭ દિવસ સળંગ" }, desc: { en: "Logged 7 days in a row", gu: "સળંગ ૭ દિવસ નોંધ્યા" } },
  { code: "streak_21", icon: "🔥", name: { en: "21-Day Streak", gu: "૨૧ દિવસ સળંગ" }, desc: { en: "Logged 21 days in a row", gu: "સળંગ ૨૧ દિવસ નોંધ્યા" } },
  { code: "streak_108", icon: "🏵️", name: { en: "108-Day Streak", gu: "૧૦૮ દિવસ સળંગ" }, desc: { en: "Logged 108 days in a row", gu: "સળંગ ૧૦૮ દિવસ નોંધ્યા" } },
  { code: "tapasvi", icon: "🙏", name: { en: "Tapasvi", gu: "તપસ્વી" }, desc: { en: "10 Ayambil or Upvas", gu: "૧૦ આયંબિલ અથવા ઉપવાસ" } },
  { code: "gyani", icon: "📖", name: { en: "Gyani", gu: "જ્ઞાની" }, desc: { en: "Learned 25 gathas", gu: "૨૫ ગાથા કરી" } },
  { code: "mitra", icon: "🤝", name: { en: "Dharma Mitra", gu: "ધર્મ મિત્ર" }, desc: { en: "5 friends joined through your link", gu: "તમારી લિંકથી ૫ મિત્રો જોડાયા" } },
  { code: "top10", icon: "🏆", name: { en: "Top 10", gu: "ટોપ ૧૦" }, desc: { en: "Finished a month in the top 10", gu: "મહિનાના ટોપ ૧૦ માં સ્થાન" } },
];

export const badgeByCode = (code: string) => BADGES.find((b) => b.code === code);
