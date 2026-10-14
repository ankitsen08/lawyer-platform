import Link from "next/link";
import { MapPin } from "lucide-react";

const TOP_STATES = [
  "New York", "California", "Texas", "Florida", 
  "Illinois", "Pennsylvania", "Ohio", "Georgia", 
  "North Carolina", "Michigan", "New Jersey", "Virginia"
];

const TOP_CITIES = [
  "New York City, NY", "Los Angeles, CA", "Chicago, IL", 
  "Houston, TX", "Phoenix, AZ", "Philadelphia, PA",
  "San Antonio, TX", "San Diego, CA", "Dallas, TX",
  "San Jose, CA", "Austin, TX", "Jacksonville, FL"
];

export default function LocationsPage() {
  return (
    <div className="w-full bg-color-background px-6 py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 border-b border-color-border-light pb-6 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-color-foreground sm:text-5xl">
            Browse by Location
          </h1>
          <p className="mt-4 text-lg text-color-text-muted">
            Find elite legal representation in your specific city or state.
          </p>
        </div>

        {/* States Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-color-foreground mb-6 flex items-center gap-2">
            <MapPin className="h-6 w-6" /> Top States
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {TOP_STATES.map((state) => (
              <Link
                key={state}
                href={`/lawyers?location=${encodeURIComponent(state)}`}
                className="border border-color-border-light bg-gray-50/50 px-4 py-3 text-sm font-semibold text-color-foreground hover:border-color-foreground hover:bg-white transition-minimal"
              >
                {state}
              </Link>
            ))}
          </div>
        </div>

        {/* Cities Grid */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-color-foreground mb-6 flex items-center gap-2">
            <MapPin className="h-6 w-6" /> Top Cities
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {TOP_CITIES.map((city) => (
              <Link
                key={city}
                href={`/lawyers?location=${encodeURIComponent(city)}`}
                className="border border-color-border-light bg-gray-50/50 px-4 py-3 text-sm font-semibold text-color-foreground hover:border-color-foreground hover:bg-white transition-minimal"
              >
                {city}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
