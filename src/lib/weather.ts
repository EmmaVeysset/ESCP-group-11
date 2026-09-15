// Runtime (browser) live weather forecast, from Open-Meteo — a free, no-auth, CORS-enabled
// API. Mirrors the try/catch/timeout/typed-result pattern scripts/prepare-data.ts uses for its
// build-time Eurostat fetch, so a network failure here degrades gracefully instead of throwing.

export type CityKey = 'berlin' | 'munich' | 'hamburg' | 'cologne' | 'frankfurt';

export const GERMAN_CITIES: Record<CityKey, { label: string; latitude: number; longitude: number }> = {
  berlin: { label: 'Berlin', latitude: 52.52, longitude: 13.41 },
  munich: { label: 'Munich', latitude: 48.14, longitude: 11.58 },
  hamburg: { label: 'Hamburg', latitude: 53.55, longitude: 9.99 },
  cologne: { label: 'Cologne', latitude: 50.94, longitude: 6.96 },
  frankfurt: { label: 'Frankfurt', latitude: 50.11, longitude: 8.68 },
};

export type MonthlyForecastPoint = { month: number; forecastTempC: number };

export type WeatherForecastResult =
  | { status: 'ok'; points: MonthlyForecastPoint[] }
  | { status: 'unreachable' | 'error'; points: [] };

const FORECAST_TIMEOUT_MS = 8000;

export async function fetchMonthlyForecast(city: CityKey, signal?: AbortSignal): Promise<WeatherForecastResult> {
  const { latitude, longitude } = GERMAN_CITIES[city];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_mean&forecast_days=16&timezone=Europe/Berlin`;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), FORECAST_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  signal?.addEventListener('abort', onExternalAbort);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      console.warn(`Weather forecast skipped (error): Open-Meteo returned ${response.status}.`);
      return { status: 'error', points: [] };
    }

    const data: { daily?: { time?: string[]; temperature_2m_mean?: number[] } } = await response.json();
    const time = data.daily?.time;
    const temps = data.daily?.temperature_2m_mean;
    if (!Array.isArray(time) || !Array.isArray(temps) || time.length === 0 || time.length !== temps.length) {
      console.warn('Weather forecast skipped (error): unexpected Open-Meteo response shape.');
      return { status: 'error', points: [] };
    }

    const sumByMonth = new Map<number, number>();
    const countByMonth = new Map<number, number>();
    for (let i = 0; i < time.length; i += 1) {
      const month = Number(time[i].slice(5, 7));
      const temp = temps[i];
      if (!Number.isFinite(month) || !Number.isFinite(temp)) continue;
      sumByMonth.set(month, (sumByMonth.get(month) ?? 0) + temp);
      countByMonth.set(month, (countByMonth.get(month) ?? 0) + 1);
    }

    const points: MonthlyForecastPoint[] = Array.from(sumByMonth.entries())
      .map(([month, sum]) => ({ month, forecastTempC: sum / (countByMonth.get(month) ?? 1) }))
      .sort((a, b) => a.month - b.month);

    return { status: 'ok', points };
  } catch (error) {
    // TypeError is what fetch throws for DNS/connection-level failures; AbortError is our own
    // timeout (or the caller's external abort). Both mean "couldn't reach Open-Meteo" as
    // opposed to a reachable-but-bad response.
    const isNetworkFailure = error instanceof Error && (error.name === 'AbortError' || error instanceof TypeError);
    if (!(error instanceof Error && error.name === 'AbortError' && signal?.aborted)) {
      // Don't log the expected case where the caller itself aborted (e.g. city changed again).
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Weather forecast skipped (${isNetworkFailure ? 'unreachable' : 'error'}): ${message}`);
    }
    return { status: isNetworkFailure ? 'unreachable' : 'error', points: [] };
  } finally {
    clearTimeout(timeoutHandle);
    signal?.removeEventListener('abort', onExternalAbort);
  }
}
