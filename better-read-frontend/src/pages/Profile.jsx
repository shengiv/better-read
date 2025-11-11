import { useState, useEffect, useRef } from "react";
import BookList from "../components/BookList";
import { fetchUserAttributes } from "@aws-amplify/auth";

import "./Profile.css"

const API_GATEWAY = 'https://8cekws5yt5.execute-api.ap-southeast-1.amazonaws.com/prod';

const getBookByISBN = async (isbn) => {
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const bookData = data[`ISBN:${isbn}`];
    if (!bookData) return { isbn, title: "Unknown", authors: '' };
    return {
      isbn,
      title: bookData.title,
      author: bookData.authors ? bookData.authors.map(author => author.name).join(", ") : '',
    };
  } catch (err) {
    console.error(`Failed to fetch book for ISBN ${isbn}:`, err);
    return { isbn, title: "Unknown", authors: '' };
  }
};

const addBook = async (userId, isbn, rating) => {
  try {
    const body = JSON.stringify({
        user_id: userId,
        isbn: isbn,
        rating: rating,
      });
    console.log(body);
    const resp = await fetch(`${API_GATEWAY}/ratings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (!resp.ok) {
      console.error("Failed to update rating:", resp.status);
      return false;
    }

    const data = await resp.json();
    return data;
  } catch (err) {
    console.error("Error updating rating:", err);
    return false;
  }
};

export default function Profile() {

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [coverUrls, setCoverUrls] = useState({});
  const [userId, setUserId] = useState(null);
  const debounceRef = useRef();


  // Fetch results (debounced)
  const fetchSearch = async (query, index) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoadingIndex(index);
    try {
      const res = await fetch(`${API_GATEWAY}/books/search?title=${query}`);
      const data = await res.json();

      // Simple fuzzy filter for mock data
      const filtered = data.books.filter((b) =>
        b.title.toLowerCase().includes(query.toLowerCase()) || 
        b.author.toLowerCase().includes(query.toLowerCase())
      );

      // Fetch cover URLs
      const newCovers = {};
      filtered.forEach((b) => {
        newCovers[b.isbn] = `https://covers.openlibrary.org/b/isbn/${b.isbn}-M.jpg`;
      });

      setCoverUrls((prev) => ({ ...prev, ...newCovers }));
      setSearchResults(filtered);
    } catch (err) {
      console.error("Error fetching books:", err);
    } finally {
      setLoadingIndex(null);
    }
  };

  // Handle typing (with debounce)
  const handleBookChange = (index, value) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSearch(value, index);
    }, 400);
  };

  // When a suggestion is clicked
  const handleSelectBook = async (selectedBook) => {
    if (!books.find((b) => b.isbn === selectedBook.isbn)) {
      const newBooks = [...books, selectedBook];
      setBooks(newBooks);

      await addBook(userId, selectedBook.isbn, 0);
    }
    setSearchResults([]);
    setSearchInput('');
  };

  
  useEffect(() => {
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
      const isbnList = data.ratings.map((r) => r.isbn);
      const booksWithDetails = await Promise.all(isbnList.map(getBookByISBN));
      setBooks(booksWithDetails);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div className="reading-list">
      <h2>Your Reading List</h2>
      {loading ? (
        <div className = "spinner"/>
      ) : (
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search for a book"
            value={searchInput}
            onChange={(e) => {
              handleBookChange(0, e.target.value)
              setSearchInput(e.target.value);
            }}
          />

        {loadingIndex === 0 && <div className="onboarding-dropdown">
          <p className="onboarding-dropdown-item">Loading...</p>
        </div>}

          {searchResults.length > 0 && (
            <ul className="onboarding-dropdown">
              {searchResults.map((result) => (
                <li
                  key={result.isbn}
                  onClick={() => handleSelectBook(result)}
                  className="onboarding-dropdown-item"
                >
                  <div className="onboarding-book-card">
                    <img
                      src={coverUrls[result.isbn]}
                      alt={result.title}
                      className="onboarding-book-cover"
                    />
                    <div className="onboarding-book-info">
                      <h4 className="onboarding-book-title">{result.title}</h4>
                      <span className="onboarding-book-year">Year: {result.year_of_publication}</span>
                      <span className="onboarding-book-author">Author: {result.author}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {!loading && books.length === 0 ? (
        <p>No books in your reading list. Explore and add some!</p>
      ) :  (
      <BookList books={books} />  
      )}
    </div>
  );
}
