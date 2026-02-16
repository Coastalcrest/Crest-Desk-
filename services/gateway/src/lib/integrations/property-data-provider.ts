/**
 * Property Data Integration Provider
 *
 * Abstracts MLS and property data services behind a common interface.
 * Mock provider returns realistic sample data for development.
 */

// ---- Types ---- //

export interface PropertyListing {
  id: string;
  mlsNumber: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  lotSize?: number;
  yearBuilt: number;
  propertyType: 'single_family' | 'condo' | 'townhouse' | 'multi_family' | 'land' | 'commercial';
  status: 'active' | 'pending' | 'sold' | 'withdrawn' | 'expired';
  listDate: Date;
  soldDate?: Date;
  soldPrice?: number;
  daysOnMarket: number;
  description: string;
  photos: string[];
  features: string[];
  agent: { name: string; brokerage: string; phone?: string; email?: string };
  coordinates?: { lat: number; lng: number };
}

export interface PropertySearchOptions {
  city?: string;
  state?: string;
  zip?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  propertyType?: string;
  status?: string;
  radius?: number;
  lat?: number;
  lng?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'price' | 'date' | 'sqft';
  sortDir?: 'asc' | 'desc';
}

export interface PropertyValuation {
  address: string;
  estimatedValue: number;
  lowEstimate: number;
  highEstimate: number;
  comparables: PropertyListing[];
  lastSaleDate?: Date;
  lastSalePrice?: number;
  taxAssessedValue?: number;
  pricePerSqFt: number;
}

export interface MarketStats {
  area: string;
  period: string;
  medianPrice: number;
  avgPrice: number;
  avgDaysOnMarket: number;
  totalListings: number;
  totalSold: number;
  inventoryMonths: number;
  priceChangePercent: number;
  medianPricePerSqFt: number;
}

// ---- Interface ---- //

export interface PropertyDataProvider {
  readonly name: string;

  connect(credentials: Record<string, string>): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Search
  searchListings(options: PropertySearchOptions): Promise<{ listings: PropertyListing[]; total: number }>;
  getListing(mlsNumber: string): Promise<PropertyListing | null>;

  // Valuation
  getValuation(address: string, city: string, state: string, zip: string): Promise<PropertyValuation>;

  // Market Data
  getMarketStats(city: string, state: string, periodMonths?: number): Promise<MarketStats>;
  getComparables(address: string, city: string, state: string, radius?: number, limit?: number): Promise<PropertyListing[]>;
}

// ---- Mock Implementation ---- //

const SAMPLE_LISTINGS: PropertyListing[] = [
  {
    id: 'prop-1', mlsNumber: 'RMLS-24001234',
    address: '4521 NE Glisan St', city: 'Portland', state: 'OR', zip: '97213',
    price: 525000, bedrooms: 3, bathrooms: 2, squareFeet: 1650, lotSize: 5000, yearBuilt: 1948,
    propertyType: 'single_family', status: 'active',
    listDate: new Date('2024-10-15'), daysOnMarket: 21,
    description: 'Charming Craftsman in the heart of NE Portland. Updated kitchen with quartz counters.',
    photos: [], features: ['hardwood_floors', 'updated_kitchen', 'fenced_yard', 'garage'],
    agent: { name: 'Alex Rivera', brokerage: 'Coastal Crest Realty', phone: '(503) 555-0011' },
    coordinates: { lat: 45.5268, lng: -122.6085 },
  },
  {
    id: 'prop-2', mlsNumber: 'RMLS-24001235',
    address: '2468 NW 23rd Ave', city: 'Portland', state: 'OR', zip: '97210',
    price: 1250000, bedrooms: 4, bathrooms: 3.5, squareFeet: 3200, lotSize: 6500, yearBuilt: 2019,
    propertyType: 'single_family', status: 'active',
    listDate: new Date('2024-10-01'), daysOnMarket: 35,
    description: 'Stunning modern home in NW Portland. Open concept with chef kitchen and rooftop deck.',
    photos: [], features: ['modern', 'rooftop_deck', 'wine_cellar', 'smart_home', 'ev_charging'],
    agent: { name: 'Jordan Chen', brokerage: 'Coastal Crest Realty', phone: '(503) 555-0012' },
    coordinates: { lat: 45.5338, lng: -122.6982 },
  },
  {
    id: 'prop-3', mlsNumber: 'RMLS-24001236',
    address: '910 Main St Unit 4B', city: 'Vancouver', state: 'WA', zip: '98660',
    price: 380000, bedrooms: 2, bathrooms: 2, squareFeet: 1100, yearBuilt: 2015,
    propertyType: 'condo', status: 'pending',
    listDate: new Date('2024-09-20'), daysOnMarket: 46,
    description: 'Modern downtown condo with river views. Walk to restaurants and shops.',
    photos: [], features: ['river_view', 'concierge', 'gym', 'parking', 'balcony'],
    agent: { name: 'Jordan Chen', brokerage: 'Coastal Crest Realty', phone: '(503) 555-0012' },
    coordinates: { lat: 45.6311, lng: -122.6747 },
  },
  {
    id: 'prop-4', mlsNumber: 'RMLS-24001237',
    address: '7890 N Lombard St', city: 'Portland', state: 'OR', zip: '97203',
    price: 415000, bedrooms: 3, bathrooms: 1.5, squareFeet: 1450, lotSize: 4800, yearBuilt: 1955,
    propertyType: 'single_family', status: 'sold',
    listDate: new Date('2024-08-01'), soldDate: new Date('2024-09-15'), soldPrice: 420000, daysOnMarket: 45,
    description: 'Well-maintained mid-century home in St Johns. Close to Cathedral Park.',
    photos: [], features: ['mid_century', 'updated_bath', 'large_yard', 'close_to_park'],
    agent: { name: 'Maya Patel', brokerage: 'Coastal Crest Realty', phone: '(503) 555-0013' },
    coordinates: { lat: 45.5905, lng: -122.7528 },
  },
  {
    id: 'prop-5', mlsNumber: 'RMLS-24001238',
    address: '1357 SE Division St', city: 'Portland', state: 'OR', zip: '97202',
    price: 475000, bedrooms: 3, bathrooms: 2.5, squareFeet: 1800, lotSize: 3500, yearBuilt: 2010,
    propertyType: 'townhouse', status: 'pending',
    listDate: new Date('2024-10-10'), daysOnMarket: 26,
    description: 'Modern townhouse in SE Portland. Walking distance to Division Street dining.',
    photos: [], features: ['townhouse', 'rooftop_terrace', 'in_unit_laundry', 'open_concept'],
    agent: { name: 'Maya Patel', brokerage: 'Coastal Crest Realty', phone: '(503) 555-0013' },
    coordinates: { lat: 45.5049, lng: -122.6515 },
  },
];

export class MockPropertyDataProvider implements PropertyDataProvider {
  readonly name = 'mock';
  private connected = false;

  async connect(_credentials: Record<string, string>): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async searchListings(options: PropertySearchOptions): Promise<{ listings: PropertyListing[]; total: number }> {
    let filtered = [...SAMPLE_LISTINGS];

    if (options.city) {
      filtered = filtered.filter((l) => l.city.toLowerCase() === options.city!.toLowerCase());
    }
    if (options.state) {
      filtered = filtered.filter((l) => l.state.toUpperCase() === options.state!.toUpperCase());
    }
    if (options.minPrice) {
      filtered = filtered.filter((l) => l.price >= options.minPrice!);
    }
    if (options.maxPrice) {
      filtered = filtered.filter((l) => l.price <= options.maxPrice!);
    }
    if (options.minBedrooms) {
      filtered = filtered.filter((l) => l.bedrooms >= options.minBedrooms!);
    }
    if (options.propertyType) {
      filtered = filtered.filter((l) => l.propertyType === options.propertyType);
    }
    if (options.status) {
      filtered = filtered.filter((l) => l.status === options.status);
    }

    // Sort
    if (options.sortBy === 'price') {
      filtered.sort((a, b) => options.sortDir === 'desc' ? b.price - a.price : a.price - b.price);
    }

    const offset = options.offset ?? 0;
    const limit = options.limit ?? 25;
    return { listings: filtered.slice(offset, offset + limit), total: filtered.length };
  }

  async getListing(mlsNumber: string): Promise<PropertyListing | null> {
    return SAMPLE_LISTINGS.find((l) => l.mlsNumber === mlsNumber) ?? null;
  }

  async getValuation(address: string, city: string, state: string, _zip: string): Promise<PropertyValuation> {
    const match = SAMPLE_LISTINGS.find(
      (l) => l.address.toLowerCase().includes(address.toLowerCase()) && l.city.toLowerCase() === city.toLowerCase(),
    );
    const basePrice = match?.price ?? 500000;

    return {
      address: `${address}, ${city}, ${state}`,
      estimatedValue: basePrice,
      lowEstimate: Math.round(basePrice * 0.92),
      highEstimate: Math.round(basePrice * 1.08),
      comparables: SAMPLE_LISTINGS.filter(
        (l) => l.city.toLowerCase() === city.toLowerCase() && l.id !== match?.id,
      ).slice(0, 3),
      lastSaleDate: match?.soldDate,
      lastSalePrice: match?.soldPrice,
      taxAssessedValue: Math.round(basePrice * 0.85),
      pricePerSqFt: match ? Math.round(basePrice / match.squareFeet) : 320,
    };
  }

  async getMarketStats(city: string, state: string, _periodMonths = 3): Promise<MarketStats> {
    const cityListings = SAMPLE_LISTINGS.filter(
      (l) => l.city.toLowerCase() === city.toLowerCase() && l.state.toUpperCase() === state.toUpperCase(),
    );
    const prices = cityListings.map((l) => l.price);
    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 500000;

    return {
      area: `${city}, ${state}`,
      period: `${_periodMonths}mo`,
      medianPrice: avgPrice,
      avgPrice,
      avgDaysOnMarket: 32,
      totalListings: cityListings.length + 150,
      totalSold: Math.round((cityListings.length + 150) * 0.65),
      inventoryMonths: 2.1,
      priceChangePercent: 4.2,
      medianPricePerSqFt: 310,
    };
  }

  async getComparables(address: string, city: string, _state: string, _radius = 1, limit = 5): Promise<PropertyListing[]> {
    return SAMPLE_LISTINGS.filter(
      (l) => l.city.toLowerCase() === city.toLowerCase() && !l.address.toLowerCase().includes(address.toLowerCase()),
    ).slice(0, limit);
  }
}

// ---- Factory ---- //

export function createPropertyDataProvider(): PropertyDataProvider {
  // In production, check for MLS API credentials
  return new MockPropertyDataProvider();
}
