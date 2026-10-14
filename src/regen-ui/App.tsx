import { RouterProvider } from 'react-router';
import { router } from './routes';
import { LocationProvider } from './lib/location-store';

export default function App() {
  return (
    <LocationProvider>
      <RouterProvider router={router} />
    </LocationProvider>
  );
}
