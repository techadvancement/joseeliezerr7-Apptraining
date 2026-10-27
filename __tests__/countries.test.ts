import { COUNTRIES, findCountry } from '../lib/countries';

describe('countries', () => {
  it('lists countries with flag, EN and ES names', () => {
    expect(COUNTRIES.length).toBe(249);
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
    for (const c of COUNTRIES) {
      expect(c.code).toMatch(/^[A-Z]{2}$/);
      expect(c.name_en.length).toBeGreaterThan(0);
      expect(c.name_es.length).toBeGreaterThan(0);
      expect(c.flag.length).toBeGreaterThan(0);
    }
  });

  it('finds by ISO code or any name', () => {
    expect(findCountry('CR')?.code).toBe('CR');
    expect(findCountry('Costa Rica')?.code).toBe('CR');
    expect(findCountry('méxico')?.code).toBe('MX');
    expect(findCountry('Spain')?.code).toBe('ES');
    expect(findCountry('mexico')?.code).toBe('MX');
    expect(findCountry('Kenia')?.code).toBe('KE');
    expect(findCountry('Costa de Marfil')?.code).toBe('CI');
    expect(findCountry('not-real')).toBeUndefined();
  });
});
