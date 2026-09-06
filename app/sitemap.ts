import type { MetadataRoute } from 'next';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['','/privacy-policy','/terms-of-use','/accessibility'].map(path=>({url:`https://gayiclub.com${path}`}));
}
