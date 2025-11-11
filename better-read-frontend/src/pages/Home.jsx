import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchUserAttributes } from "@aws-amplify/auth";
import RefreshIcon from "@mui/icons-material/Refresh";
import BookList from "../components/BookList";

import "./Home.css"

const API_GATEWAY = 'https://8cekws5yt5.execute-api.ap-southeast-1.amazonaws.com/prod';

async function getRecommendations(books) {
  try {
    const body = JSON.stringify({
      books: books,
      limit_per_book: 5,
    });
    const response = await fetch(`${API_GATEWAY}/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (!response.ok) {
      console.error("API error:", response.status);
      return [];
    }

    return response;
  } catch (err) {
    console.error("Failed to fetch recommendations:", err);
    return [];
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [userId, setUserId] = useState(null);
  const [userBooks, setUserBooks] = useState([]);
  const [displayBooks, setDisplayBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (async () => {
      const attrs = await fetchUserAttributes();
      setUserId(attrs.sub);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const res = await fetch(`${API_GATEWAY}/ratings?user_id=${userId}`);
      const data = await res.json();
      const ratingList = data.ratings.map(r => ({ isbn: r.isbn, rating: r.rating }));
      setUserBooks(ratingList);
    })();
  }, [userId]);

  useEffect(() => {
    if (userBooks.length === 0 || !userId) return;
    (async () => {
      const recsResponse = await getRecommendations(userBooks);
      const recsData = await recsResponse.json();
      const recsBooks = recsData.results.flatMap(r => r.similar_books);
      setBooks(recsBooks)
      if (displayBooks.length === 0) {
        const shuffled = recsBooks.sort(() => 0.5 - Math.random());
        setDisplayBooks(shuffled.slice(0, 5));
      }
      setLoading(false);
    })();
  }, [userBooks, userId]);

  const refreshBooks = () => {
    const shuffled = [...books].sort(() => 0.5 - Math.random());
    setDisplayBooks(shuffled.slice(0, 5));
  }

  return (
    <div className="home">
      <div className="discover-header">
        <h2>Recommended for you</h2>
        <button
          className="refresh-button"
          onClick={refreshBooks}
        >
          <RefreshIcon />
        </button>
      </div>
      {loading ? (
        <div className = "spinner"/>
      ) : (
        <BookList books={displayBooks}/>
      )}
    </div>
  );
}
