/**
 * Context Engine — Stage 3
 *
 * Gathers real-world context that Yara uses to write smarter, timelier messages.
 *
 * Context sources (all free / no API key required):
 *   1. Calendar context — day of week, upcoming US holidays within 14 days
 *   2. Season — spring/summer/fall/winter
 *   3. Time-of-day context — morning/afternoon/evening (for send-time optimisation)
 *
 * Optional (if OPENWEATHERMAP_API_KEY is set):
 *   4. Weather — current conditions for the merchant's city
 *
 * The returned ContextSnapshot is passed to generateYaraCopy() so Yara can
 * weave it naturally into the message ("With the long weekend coming up…").
 */

export interface ContextSnapshot {
  dayOfWeek: string           // "Monday"
  isWeekend: boolean
  season: 'spring' | 'summer' | 'fall' | 'winter'
  timeOfDay: 'morning' | 'afternoon' | 'evening'
  upcomingHoliday: string | null   // "Memorial Day in 5 days" or null
  weather: string | null           // "sunny and 72°F" or null (requires API key)
  localDate: string                // "2026-06-15"
}

// ── US Holidays (month/day) ────────────────────────────────────────────────
const US_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1,  day: 1,  name: "New Year's Day" },
  { month: 2,  day: 14, name: "Valentine's Day" },
  { month: 5,  day: 27, name: 'Memorial Day' },      // approximate — last Mon in May
  { month: 7,  day: 4,  name: 'Independence Day' },
  { month: 9,  day: 1,  name: 'Labor Day' },          // approximate — first Mon in Sep
  { month: 10, day: 31, name: 'Halloween' },
  { month: 11, day: 11, name: "Veterans Day" },
  { month: 11, day: 27, name: 'Thanksgiving' },       // approximate — 4th Thu in Nov
  { month: 12, day: 24, name: 'Christmas Eve' },
  { month: 12, day: 25, name: 'Christmas' },
  { month: 12, day: 31, name: "New Year's Eve" },
]

function getSeason(month: number): 'spring' | 'summer' | 'fall' | 'winter' {
  if (month >= 3 && month <= 5)  return 'spring'
  if (month >= 6 && month <= 8)  return 'summer'
  if (month >= 9 && month <= 11) return 'fall'
  return 'winter'
}

function getUpcomingHoliday(now: Date): string | null {
  const thisYear = now.getFullYear()
  for (const h of US_HOLIDAYS) {
    const hDate = new Date(thisYear, h.month - 1, h.day)
    const diff  = Math.floor((hDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff >= 0 && diff <= 14) {
      return diff === 0 ? `Today is ${h.name}!` :
             diff === 1 ? `${h.name} is tomorrow!` :
             `${h.name} in ${diff} days`
    }
  }
  return null
}

async function getWeather(city: string): Promise<string | null> {
  const key = process.env.OPENWEATHERMAP_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=imperial`,
      { next: { revalidate: 3600 } }  // cache 1 hour
    )
    if (!res.ok) return null
    const data = await res.json()
    const desc = data.weather?.[0]?.description ?? ''
    const temp = Math.round(data.main?.temp ?? 0)
    return `${desc} and ${temp}°F`
  } catch {
    return null
  }
}

/**
 * Build a ContextSnapshot for the given merchant city (or default to US national).
 * This is called once per cron run and passed to all generateYaraCopy() calls.
 */
export async function buildContextSnapshot(city?: string): Promise<ContextSnapshot> {
  const now = new Date()
  const hour  = now.getHours()
  const month = now.getMonth() + 1
  const days  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  const timeOfDay: 'morning' | 'afternoon' | 'evening' =
    hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  const [weather] = await Promise.all([
    city ? getWeather(city) : Promise.resolve(null),
  ])

  return {
    dayOfWeek:       days[now.getDay()],
    isWeekend:       now.getDay() === 0 || now.getDay() === 6,
    season:          getSeason(month),
    timeOfDay,
    upcomingHoliday: getUpcomingHoliday(now),
    weather,
    localDate:       now.toISOString().slice(0, 10),
  }
}

/**
 * Format the context snapshot into a natural-language sentence
 * that Yara can use in the system prompt to write timelier messages.
 */
export function formatContextForPrompt(ctx: ContextSnapshot): string {
  const parts: string[] = []

  parts.push(`Today is ${ctx.dayOfWeek}${ctx.isWeekend ? ' (weekend)' : ''}, ${ctx.localDate}.`)

  if (ctx.upcomingHoliday) {
    parts.push(ctx.upcomingHoliday)
  }

  if (ctx.weather) {
    parts.push(`Current weather: ${ctx.weather}.`)
  }

  parts.push(`Season: ${ctx.season}.`)

  return parts.join(' ')
}
