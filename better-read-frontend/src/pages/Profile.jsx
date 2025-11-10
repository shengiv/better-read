import { useState, useEffect, useRef } from "react";
import BookList from "../components/BookList";

import "./Profile.css"

export default function Profile() {

  const API_GATEWAY = 'https://8cekws5yt5.execute-api.ap-southeast-1.amazonaws.com/prod';

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [coverUrls, setCoverUrls] = useState({});
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
  const handleSelectBook = (selectedBook) => {
    if (!books.find((b) => b.isbn === selectedBook.isbn)) {
      const newBooks = [...books, selectedBook];
      console.log(newBooks);
      setBooks(newBooks);
    }
    setSearchResults([]);
    setSearchInput('');
  };

  // Submit handler
  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setIsSubmitting(true);
    console.log('Starting onboarding submission...');

    try {
      // Update Cognito custom attribute
      await updateUserAttributes({
        userAttributes: {
          'custom:onBoardingComplete': 'true',
        },
      });
      console.log('Updated Cognito attributes');

      const afterAttrs = await fetchUserAttributes();
      console.log('Verified updated attributes:', afterAttrs);

      // Wait a moment for propagation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirect
      navigate('/home');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      alert('Error saving preferences. Please try again.');
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/data/get_recommendations_resp.json");
        const data = await res.json();
        setBooks([data.results[0].source_book]);
      } catch (err) {
        console.error("Error loading books: ", err);
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  return (
    <div className="reading-list">
      <h2>Your Reading List</h2>
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

        {loadingIndex === 0 && <div className="onboarding-dropdown" style={{marginRight: 4 + 'px'}}>Loading...</div>}

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
      {!loading && books.length === 0 ? (
        <p>No books in your reading list. Explore and add some!</p>
      ) :  (
      <BookList books={books} />  
      )}
    </div>
  );
}
