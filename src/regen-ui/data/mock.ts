import type {
  LandOpportunity,
  Location,
  LocationAnalysis,
  RecommendedLocation,
} from './types';

const img = (id: string, w = 400, h = 300) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`;

// Example locations around Dehradun. Architecture supports any location —
// Prem Nagar is illustrative, not hardcoded into the UI.
export const LOCATIONS: Location[] = [
  {
    id: 'prem-nagar',
    name: 'Prem Nagar',
    city: 'Dehradun',
    state: 'Uttarakhand',
    country: 'India',
    latitude: 30.3346,
    longitude: 77.9407,
    image: img('1560448204-e02f11c3d0e2'),
  },
  {
    id: 'isbt-area',
    name: 'ISBT Area',
    city: 'Dehradun',
    state: 'Uttarakhand',
    country: 'India',
    latitude: 30.2909,
    longitude: 78.0,
    image: img('1486406146926-c627a92ad1ab'),
  },
  {
    id: 'sahastradhara',
    name: 'Sahastradhara',
    city: 'Dehradun',
    state: 'Uttarakhand',
    country: 'India',
    latitude: 30.3877,
    longitude: 78.1315,
    image: img('1470071459604-3b5ec3a7fe05'),
  },
  {
    id: 'rajpur-road',
    name: 'Rajpur Road',
    city: 'Dehradun',
    state: 'Uttarakhand',
    country: 'India',
    latitude: 30.3629,
    longitude: 78.0745,
    image: img('1449824913935-59a10b8d2000'),
  },
  {
    id: 'dalanwala',
    name: 'Dalanwala',
    city: 'Dehradun',
    state: 'Uttarakhand',
    country: 'India',
    latitude: 30.3204,
    longitude: 78.0489,
    image: img('1518005020951-eccb494ad742'),
  },
  {
    id: 'clock-tower',
    name: 'Clock Tower',
    city: 'Dehradun',
    state: 'Uttarakhand',
    country: 'India',
    latitude: 30.3255,
    longitude: 78.0422,
    image: img('1487958449943-2429e8be8625'),
  },
];

export const DEFAULT_LOCATION = LOCATIONS[0];

// Analysis keyed by location id. Falls back to Prem Nagar's shape for demo.
export function getAnalysis(location: Location): LocationAnalysis {
  return {
    location,
    tags: ['Residential', 'Growing', 'Good Infrastructure'],
    population: 48200,
    populationGrowth: 2.4,
    households: 12400,
    householdGrowth: 1.8,
    businesses: 320,
    businessGrowth: 15,
    hospitals: 4,
    schools: 17,
    roadConnectivity: 'Good',
    summary: `${location.name} is a well-connected residential area in ${location.city} with good infrastructure, access to essential services, and steady development. The area has seen consistent population growth and increasing commercial activity, making it an attractive location for residential and business opportunities.`,
    nearbyFacilities: [
      { label: 'Hospitals', count: 4, icon: 'hospital' },
      { label: 'Schools', count: 17, icon: 'school' },
      { label: 'Colleges', count: 5, icon: 'college' },
      { label: 'Markets', count: 12, icon: 'market' },
      { label: 'Police Stations', count: 2, icon: 'police' },
    ],
    landUse: [
      { label: 'Residential', value: 48, color: '#4f9d69' },
      { label: 'Commercial', value: 18, color: '#cf5b4a' },
      { label: 'Agricultural', value: 12, color: '#e0a53f' },
      { label: 'Forest / Green', value: 15, color: '#2f6b45' },
      { label: 'Others', value: 7, color: '#9a9186' },
    ],
    populationTrend: [
      { year: '2015', value: 34 },
      { year: '2017', value: 38 },
      { year: '2019', value: 41 },
      { year: '2021', value: 45 },
      { year: '2023', value: 48 },
    ],
    developmentSignals: [
      {
        title: 'Road Widening Project',
        place: `${location.name} Main Road · 2.3 km`,
        status: 'In Progress',
        image: img('1545459720-aac8509eb02c', 120, 90),
      },
      {
        title: 'New School',
        place: `${location.name} Extension`,
        status: 'Under Construction',
        image: img('1580582932707-520aed937b7b', 120, 90),
      },
      {
        title: 'Residential Complex',
        place: 'Near ISBT, Dehradun',
        status: 'Planned',
        image: img('1512917774080-9991f1c4c750', 120, 90),
      },
    ],
    insights: [
      {
        title: 'Growing Residential Hub',
        body: 'Population has grown by 2.4% in the last 5 years, with increasing housing demand.',
        tone: 'good',
      },
      {
        title: 'Good Infrastructure',
        body: 'Well connected by major roads with access to schools, hospitals and markets.',
        tone: 'good',
      },
      {
        title: 'Commercial Potential',
        body: 'Increasing number of businesses and retail establishments in the area.',
        tone: 'info',
      },
      {
        title: 'Planned Development',
        body: 'Several government projects and infrastructure improvements planned nearby.',
        tone: 'warn',
      },
    ],
  };
}

export const LAND_OPPORTUNITIES: LandOpportunity[] = [
  {
    id: 'land-1',
    acres: 8.5,
    price: '₹1.2 Cr/acre',
    location: 'Prem Nagar, Dehradun',
    potential: 'High',
    landUse: 'Residential',
    tags: ['Residential', 'Near Main Road', 'Good Infrastructure'],
    lat: 30.3346,
    lng: 77.9407,
    image: img('1500382017468-9049fed747ef', 200, 150),
  },
  {
    id: 'land-2',
    acres: 12,
    price: '₹85 L/acre',
    location: 'Selakui, Dehradun',
    potential: 'Moderate',
    landUse: 'Industrial',
    tags: ['Industrial', 'Near Highway', 'Upcoming Development'],
    lat: 30.3702,
    lng: 77.8299,
    image: img('1516156008625-3a9d6067fab5', 200, 150),
  },
  {
    id: 'land-3',
    acres: 15,
    price: '₹92 L/acre',
    location: 'Jhajra, Dehradun',
    potential: 'High',
    landUse: 'Mixed Use',
    tags: ['Mixed Use', 'Near ISBT (8 km)', 'Good Connectivity'],
    lat: 30.3502,
    lng: 77.8599,
    image: img('1441974231531-c6227db76b6e', 200, 150),
  },
  {
    id: 'land-4',
    acres: 10,
    price: '₹1.1 Cr/acre',
    location: 'Rajpur Road, Dehradun',
    potential: 'Emerging',
    landUse: 'Residential',
    tags: ['Residential', 'Scenic Location', 'Growing Area'],
    lat: 30.3829,
    lng: 78.0845,
    image: img('1472396961693-142e6e269027', 200, 150),
  },
  {
    id: 'land-5',
    acres: 5,
    price: '₹1.6 Cr/acre',
    location: 'Sahastradhara, Dehradun',
    potential: 'Low',
    landUse: 'Commercial',
    tags: ['Commercial', 'Hilly Terrain', 'Limited Access'],
    lat: 30.3877,
    lng: 78.1315,
    image: img('1501785888041-af3ef285b470', 200, 150),
  },
  {
    id: 'land-6',
    acres: 20,
    price: '₹60 L/acre',
    location: 'Mussoorie Road, Dehradun',
    potential: 'Moderate',
    landUse: 'Agricultural',
    tags: ['Agricultural', 'Water Access', 'Fertile Soil'],
    lat: 30.4102,
    lng: 78.05,
    image: img('1523348837708-15d4a09cfac2', 200, 150),
  },
];

export const RECOMMENDED: RecommendedLocation[] = [
  {
    rank: 1,
    location: LOCATIONS[0],
    score: 8.7,
    tags: ['High Demand', 'Good Footfall'],
    suitability: [
      { label: 'Market Demand', value: 9.0, max: 10 },
      { label: 'Target Customer Fit', value: 8.5, max: 10 },
      { label: 'Competition Level', value: 7.5, max: 10 },
      { label: 'Accessibility', value: 8.8, max: 10 },
      { label: 'Infrastructure', value: 8.0, max: 10 },
      { label: 'Cost Advantage', value: 7.2, max: 10 },
      { label: 'Future Growth', value: 8.3, max: 10 },
    ],
  },
  {
    rank: 2,
    location: LOCATIONS[3],
    score: 8.3,
    tags: ['Premium Location', 'High Income'],
    suitability: [],
  },
  {
    rank: 3,
    location: LOCATIONS[1],
    score: 7.6,
    tags: ['High Footfall', 'Transit Hub'],
    suitability: [],
  },
  {
    rank: 4,
    location: LOCATIONS[2],
    score: 7.4,
    tags: ['Growing Area', 'Tourist Attraction'],
    suitability: [],
  },
  {
    rank: 5,
    location: LOCATIONS[4],
    score: 7.1,
    tags: ['Residential Hub', 'Good Connectivity'],
    suitability: [],
  },
];

export const KEY_FACTORS = [
  { factor: 'Demand', premNagar: 9, rajpur: 7, isbt: 8, saha: 6, dala: 7 },
  { factor: 'Footfall', premNagar: 8, rajpur: 6, isbt: 9, saha: 5, dala: 6 },
  { factor: 'Competition', premNagar: 5, rajpur: 7, isbt: 8, saha: 4, dala: 5 },
  { factor: 'Accessibility', premNagar: 9, rajpur: 8, isbt: 9, saha: 5, dala: 7 },
  { factor: 'Cost', premNagar: 6, rajpur: 8, isbt: 7, saha: 5, dala: 6 },
  { factor: 'Growth', premNagar: 8, rajpur: 7, isbt: 6, saha: 8, dala: 7 },
];
