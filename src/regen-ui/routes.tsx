import { createBrowserRouter } from 'react-router';
import RootLayout from './components/RootLayout';
import Home from './pages/Home';
import ExploreMap from './pages/ExploreMap';
import AnalyzeLand from './pages/AnalyzeLand';
import FindLand from './pages/FindLand';
import LandDetails from './pages/LandDetails';
import BusinessPlanning from './pages/BusinessPlanning';
import BusinessResults from './pages/BusinessResults';
import PublicPlanning from './pages/PublicPlanning';
import PlanningReport from './pages/PlanningReport';
import Placeholder from './pages/Placeholder';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Home },
      { path: 'explore', Component: ExploreMap },
      { path: 'analyze', Component: AnalyzeLand },
      { path: 'find-land', Component: FindLand },
      { path: 'find-land/:id', Component: LandDetails },
      { path: 'business', Component: BusinessPlanning },
      { path: 'business/results', Component: BusinessResults },
      { path: 'public', Component: PublicPlanning },
      { path: 'public/:context', Component: PlanningReport },
      { path: 'saved', Component: Placeholder },
      { path: 'reports', Component: Placeholder },
      { path: 'layers', Component: Placeholder },
      { path: 'settings', Component: Placeholder },
      { path: '*', Component: Placeholder },
    ],
  },
]);
