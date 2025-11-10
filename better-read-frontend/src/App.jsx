import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import BookDetails from "./pages/BookDetails";
import Profile from "./pages/Profile";
import Discover from "./pages/Discover";
import Onboarding from "./pages/Onboarding";
import { withAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes } from "@aws-amplify/auth";



function App({ signOut, user }) {

  const navigate = useNavigate();
  const location = useLocation();

  const shouldShowNavbar = location.pathname !== '/onboarding';

  console.log(user);

  useEffect(() => {
    if (!user) {
      return null; // Cognito's UI will handle the authentication
    }
    const checkAttributes = async () => {
      try {
        const attrs = await fetchUserAttributes();
        console.log('User attributes on App load: ', attrs);
        if (!attrs['custom:onBoardingComplete'] || attrs['custom:onBoardingComplete'] !== 'true') {
          navigate('/onboarding');
        }
      } catch (err) {
        console.error('Error fetching user attributes: ', err);
      }
    } 
    checkAttributes();
  }, [user]);


  return (
    <>
      <div className="container">
        {shouldShowNavbar &&
          <Navbar signOut={signOut} user={user} />   
        }
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/book/:id" element={<BookDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  );
}

export default withAuthenticator(App);
