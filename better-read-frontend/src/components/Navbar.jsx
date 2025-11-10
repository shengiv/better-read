import { useState, useRef, useEffect} from "react";
import { Link } from "react-router-dom";
import "./Navbar.css"

export default function Navbar({ signOut }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const toggleDropDown = () => {
    setDropdownOpen(!dropdownOpen);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = () => {
    setDropdownOpen(false);
  }
  
  return (
    <nav>
      <h2>Better Read</h2>
      <div className="nav-links">
        <Link to="/home">Home</Link>
        <Link to="/discover">Discover</Link>
        <div className="dropdown" ref={dropdownRef}>
          <button className ="dropdown-toggle" onClick={toggleDropDown}>
            Profile 
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              <Link to="/profile" onClick={handleMenuClick}>
                Reading List
              </Link>
              <button onClick={() => {
                handleMenuClick();
                signOut();
              }} className="dropdown-item">
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
