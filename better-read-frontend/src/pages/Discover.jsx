import { useState, useEffect } from "react";
import BookList from "../components/BookList";
import RefreshIcon from "@mui/icons-material/Refresh";
import "./Discover.css"

export default function Discover() {

  const API_GATEWAY = import.meta.env.API_GATEWAY;
  const [books, setBooks] = useState([]);
  const [displayBooks, setDisplayBooks] = useState([]);
  
  useEffect(() => {
    const fetchDiscovery = async () => {
      try {
        const res = await fetch(`${API_GATEWAY}/books?limit=1000`);
        const data = await res.json();
        setBooks(data.books);
        if (!displayBooks || displayBooks.length === 0) {
          const shuffled = data.books.sort(() => 0.5 - Math.random());
          setDisplayBooks(shuffled.slice(0, 5));
        }
      } catch (err) {
        console.error("Error loading discovery books: ", err);
      }
    };
    if (books.length === 0) {
      fetchDiscovery();
    }
  }, []);

  const refreshBooks = () => {
    const shuffled = [...books].sort(() => 0.5 - Math.random());
    setDisplayBooks(shuffled.slice(0, 5));
  }

  return (
    <div className="discover">
      <div className="discover-header">
        <h2>Discover New Books</h2>
        <button
          className="refresh-button"
          onClick={refreshBooks}
        >
          <RefreshIcon />
        </button>
      </div>
      <BookList books={displayBooks} />
    </div>
  );
}
