import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Trips from './pages/Trips';
import TripDetail from './pages/TripDetail';
import Rentals from './pages/Rentals';
import RentalDetail from './pages/RentalDetail';
import Drivers from './pages/Drivers';
import DriverDetail from './pages/DriverDetail';
import Partners from './pages/Partners';
import Help from './pages/Help';
import { About, Contact, Safety, Privacy, Terms, Refunds, DeleteAccount, NotFound } from './pages/Info';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/trips/:id" element={<TripDetail />} />
        <Route path="/rentals" element={<Rentals />} />
        <Route path="/rentals/:id" element={<RentalDetail />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/drivers/:id" element={<DriverDetail />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/help" element={<Help />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
