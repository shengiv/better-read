import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BookList from "../components/BookList";

import "./Home.css"

const API_GATEWAY = 'https://8cekws5yt5.execute-api.ap-southeast-1.amazonaws.com/prod';

async function getRecommendations(books) {
  try {
    const response = await fetch(`${API_GATEWAY}/recommendations/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        books,
        limit_per_book: 5,
      }),
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


  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res_profile = await fetch("/data/get_recommendations_resp.json");
        const data_profile = await res_profile.json();
        const read_books = [data_profile.results[0].source_book];
        const res = await getRecommendations(read_books);
        const data = await res.json();
        setBooks(data.results[0].similar_books);
      } catch (err) {
        console.error("Error loading recommended books: ", err);
      }
    };
    fetchRecommendations();
  }, []);

  return (
    <div className="home">
      <h2>Recommended for you</h2>
      <BookList books={books}/>
    </div>
  );
}
