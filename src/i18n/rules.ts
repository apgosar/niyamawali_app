import type { Lang } from "./index";

/**
 * Text of the Rules tab (Divine Sanskar Shibir Niyamawali – Rules & Guidelines), in both languages.
 * To change a rule, edit it here in BOTH languages.
 */
export interface RuleSection {
  title: string;
  /** bullet points; `lead` is shown in bold before the text */
  bullets?: { lead?: string; text: string }[];
  /** plain paragraphs */
  paragraphs?: string[];
  /** prize table, with its total */
  prizes?: { rows: { place: string; amount: string }[]; totalLabel: string; total: string };
}

export interface Rules {
  title: string;
  subtitle: string;
  sections: RuleSection[];
}

const AMOUNTS = ["₹15,000", "₹12,000", "₹10,000", "₹8,000", "₹6,000", "₹4,000", "₹3,000", "₹2,000"];
const TOTAL = "₹60,000";
const prizeRows = (places: string[]) => places.map((place, i) => ({ place, amount: AMOUNTS[i] }));

export const rules: Record<Lang, Rules> = {
  en: {
    title: "Divine Sanskar Shibir Niyamawali",
    subtitle: "Rules & Guidelines",
    sections: [
      {
        title: "Eligibility",
        bullets: [
          { text: "The Niyamawali is applicable to students who have participated in any of the last four Divine Sanskar Shibirs." },
          { text: "All entries will be manually verified to ensure eligibility." },
        ],
      },
      {
        title: "Gift & Felicitation",
        bullets: [
          { text: "All prizes and gifts will be distributed during the upcoming Divine Sanskar Shibir." },
          { text: "Students must attend the upcoming Shibir to be eligible for prizes, gifts and felicitation." },
        ],
      },
      {
        title: "Main Prize Distribution",
        prizes: {
          rows: prizeRows(["1st Prize", "2nd Prize", "3rd Prize", "4th Prize", "5th Prize", "6th Prize", "7th Prize", "8th Prize"]),
          totalLabel: "Total Prize Pool",
          total: TOTAL,
        },
      },
      {
        title: "Additional Recognition",
        bullets: [
          { lead: "Monthly Toppers:", text: "Three students will be rewarded every month, without repetition." },
          { lead: "All Badges:", text: "Special gifts for students who earn all prescribed badges." },
          { lead: "Consolation Gifts:", text: "Every participating student attending the upcoming Shibir will receive a gift worth a minimum of ₹500." },
        ],
      },
      {
        title: "Sincerity & Discipline",
        paragraphs: [
          "These Niyams aim to encourage self-discipline, accountability and personal growth. Gifts are only an incentive; self-improvement is the real objective.",
          "Students are expected to follow the Niyams sincerely and not merely mark them as completed. Sangh Coordinators and representatives may periodically verify compliance.",
          "False reporting or deliberate non-compliance may result in disqualification from prizes, future events and Shibirs.",
        ],
      },
      {
        title: "Final Authority",
        paragraphs: [
          "All decisions regarding eligibility, verification, evaluation and prize distribution shall be taken by the Divine Sanskar Shibir Management Committee under the guidance of Pujya Guru Bhagwant. The committee’s decision shall be final.",
        ],
      },
    ],
  },
  gu: {
    title: "ડિવાઇન સંસ્કાર શિબિર નિયમાવલી",
    subtitle: "નિયમો અને માર્ગદર્શિકા",
    sections: [
      {
        title: "પાત્રતા",
        bullets: [
          { text: "છેલ્લી ચાર ડિવાઇન સંસ્કાર શિબિરમાંથી કોઈપણ શિબિરમાં ભાગ લીધેલા વિદ્યાર્થીઓને આ નિયમાવલી લાગુ પડે છે." },
          { text: "પાત્રતાની ખાતરી માટે બધી એન્ટ્રીઓની જાતે (મેન્યુઅલી) ચકાસણી કરવામાં આવશે." },
        ],
      },
      {
        title: "ભેટ અને બહુમાન",
        bullets: [
          { text: "તમામ ઇનામો અને ભેટો આગામી ડિવાઇન સંસ્કાર શિબિર દરમિયાન આપવામાં આવશે." },
          { text: "ઇનામ, ભેટ અને બહુમાન માટે પાત્ર થવા વિદ્યાર્થીઓએ આગામી શિબિરમાં હાજર રહેવું ફરજિયાત છે." },
        ],
      },
      {
        title: "મુખ્ય ઇનામ વિતરણ",
        prizes: {
          rows: prizeRows(["1લું ઇનામ", "2જું ઇનામ", "3જું ઇનામ", "4થું ઇનામ", "5મું ઇનામ", "6ઠ્ઠું ઇનામ", "7મું ઇનામ", "8મું ઇનામ"]),
          totalLabel: "કુલ ઇનામ રકમ",
          total: TOTAL,
        },
      },
      {
        title: "વધારાનું સન્માન",
        bullets: [
          { lead: "માસિક ટોપર્સ:", text: "દર મહિને ત્રણ વિદ્યાર્થીઓને ઇનામ આપવામાં આવશે, પુનરાવર્તન વિના." },
          { lead: "બધા બૅજ:", text: "નિર્ધારિત તમામ બૅજ મેળવનાર વિદ્યાર્થીઓને વિશેષ ભેટ." },
          { lead: "આશ્વાસન ભેટ:", text: "આગામી શિબિરમાં હાજર રહેનાર દરેક સહભાગી વિદ્યાર્થીને ઓછામાં ઓછા ₹500 ની ભેટ મળશે." },
        ],
      },
      {
        title: "નિષ્ઠા અને શિસ્ત",
        paragraphs: [
          "આ નિયમોનો હેતુ સ્વ-શિસ્ત, જવાબદારી અને વ્યક્તિગત વિકાસને પ્રોત્સાહન આપવાનો છે. ભેટ માત્ર પ્રોત્સાહન છે; સાચો ઉદ્દેશ આત્મ-સુધારણા છે.",
          "વિદ્યાર્થીઓ નિયમોનું નિષ્ઠાપૂર્વક પાલન કરે એવી અપેક્ષા છે, માત્ર પૂર્ણ થયાની નોંધ કરવા પૂરતું નહીં. સંઘ કો-ઓર્ડિનેટર્સ અને પ્રતિનિધિઓ સમયાંતરે પાલનની ચકાસણી કરી શકે છે.",
          "ખોટી નોંધ કરવાથી અથવા જાણીજોઈને નિયમ ન પાળવાથી ઇનામ, ભવિષ્યના કાર્યક્રમો અને શિબિરો માટે ગેરલાયક ઠેરવી શકાય છે.",
        ],
      },
      {
        title: "અંતિમ સત્તા",
        paragraphs: [
          "પાત્રતા, ચકાસણી, મૂલ્યાંકન અને ઇનામ વિતરણ અંગેના તમામ નિર્ણયો પૂજ્ય ગુરુ ભગવંતના માર્ગદર્શન હેઠળ ડિવાઇન સંસ્કાર શિબિર મેનેજમેન્ટ કમિટી લેશે. કમિટીનો નિર્ણય અંતિમ રહેશે.",
        ],
      },
    ],
  },
};
