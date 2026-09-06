import { useState, useEffect } from 'react';

export interface WeatherInfo {
  temperature: number;
  weatherCode: number;
  description: string;
  location: string;
  isDay: boolean;
  windSpeed: number;
  loading: boolean;
}

function getWeatherDescription(code: number, isVi: boolean): string {
  if (code === 0) return isVi ? 'Trời quang đãng' : 'Clear sky';
  if (code === 1 || code === 2 || code === 3) return isVi ? 'Mây rải rác' : 'Partly cloudy';
  if (code === 45 || code === 48) return isVi ? 'Có sương mù' : 'Foggy';
  if (code >= 51 && code <= 55) return isVi ? 'Mưa phùn' : 'Drizzle';
  if (code >= 61 && code <= 65) return isVi ? 'Mưa vừa' : 'Rain';
  if (code >= 71 && code <= 77) return isVi ? 'Có tuyết' : 'Snow';
  if (code >= 80 && code <= 82) return isVi ? 'Mưa rào' : 'Rain showers';
  if (code >= 95 && code <= 99) return isVi ? 'Có dông sét' : 'Thunderstorm';
  return isVi ? 'Thời tiết ôn hòa' : 'Fair weather';
}

export function useWeatherAndClock(isVi = true) {
  const [now, setNow] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherInfo>({
    temperature: 28,
    weatherCode: 0,
    description: isVi ? 'Trời quang đãng' : 'Clear sky',
    location: isVi ? 'Hà Nội, Việt Nam' : 'Hanoi, Vietnam',
    isDay: true,
    windSpeed: 12,
    loading: true
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function fetchWeather(lat: number, lon: number, cityName?: string) {
      try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
        const res = await fetch(weatherUrl);
        if (!res.ok) throw new Error('Weather API error');
        const data = await res.json();
        const current = data.current_weather;

        let detectedLocation = cityName;
        if (!detectedLocation) {
          try {
            const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${isVi ? 'vi' : 'en'}`);
            if (geoRes.ok) {
              const geoData = await geoRes.json();
              const city = geoData.city || geoData.principalSubdivision || geoData.locality || '';
              const country = geoData.countryName || '';
              detectedLocation = city ? `${city}, ${country}` : country;
            }
          } catch {}
        }

        if (!detectedLocation) {
          detectedLocation = isVi ? 'Hà Nội, Việt Nam' : 'Hanoi, Vietnam';
        }

        if (!isCancelled && current) {
          const info: WeatherInfo = {
            temperature: Math.round(current.temperature),
            weatherCode: current.weathercode,
            description: getWeatherDescription(current.weathercode, isVi),
            location: detectedLocation,
            isDay: Boolean(current.is_day),
            windSpeed: Math.round(current.windspeed),
            loading: false
          };
          setWeather(info);
          try {
            sessionStorage.setItem('reported_weather_cache', JSON.stringify({ ...info, cachedAt: Date.now() }));
          } catch {}
        }
      } catch (err) {
        if (!isCancelled) {
          setWeather(prev => ({ ...prev, loading: false }));
        }
      }
    }

    try {
      const cached = sessionStorage.getItem('reported_weather_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.cachedAt < 15 * 60 * 1000) {
          setWeather({ ...parsed, loading: false });
          return;
        }
      }
    } catch {}

    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          fetchWeather(21.0285, 105.8542, isVi ? 'Hà Nội, Việt Nam' : 'Hanoi, Vietnam');
        },
        { timeout: 8000 }
      );
    } else {
      fetchWeather(21.0285, 105.8542, isVi ? 'Hà Nội, Việt Nam' : 'Hanoi, Vietnam');
    }

    return () => {
      isCancelled = true;
    };
  }, [isVi]);

  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const timeString = `${hours}:${minutes}:${seconds}`;

  const dayOfWeekNamesVi = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayOfWeekNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const dayOfWeek = isVi ? dayOfWeekNamesVi[now.getDay()] : dayOfWeekNamesEn[now.getDay()];
  const dateString = isVi
    ? `${dayOfWeek}, ngày ${now.getDate()} tháng ${now.getMonth() + 1}, ${now.getFullYear()}`
    : `${dayOfWeek}, ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const shortDateString = isVi
    ? `${dayOfWeek}, ${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`
    : `${dayOfWeek.slice(0, 3)}, ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return {
    now,
    timeString,
    dateString,
    shortDateString,
    weather
  };
}
