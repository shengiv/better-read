import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Onboarding.css';
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth';


const API_GATEWAY = 'https://8cekws5yt5.execute-api.ap-southeast-1.amazonaws.com/prod';
const addBook = async (userId, isbn, rating) => {
  try {
    const body = JSON.stringify({
        user_id: userId,
        isbn: isbn,
        rating: rating,
      });
    const resp = await fetch(`${API_GATEWAY}/ratings`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
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



export default function Onboarding() {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [coverUrls, setCoverUrls] = useState({});
  const [loadingIndex, setLoadingIndex] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [userId, setUserId] = useState(null);
  const debounceRef = useRef();

  // Remove a book input
  const handleRemoveBook = (isbn) => {
    setBooks(books.filter((book) => book.isbn !== isbn));
  };

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
      books.forEach(async (book) => {
        const res = await addBook(userId, book.isbn, 0);
      });

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
    (async () => {
      const attrs = await fetchUserAttributes();
      setUserId(attrs.sub);
    })();
  }, []);

  return (
    <div className="onboarding-container">
      <h1>Welcome to Better Read!</h1>
      <p>Let's personalize your experience</p>
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

      <div className="selected-onboarding-books">
        {books.map((book) => (
          <div key={book.isbn} className="onboarding-book-item">
            <img
              src={coverUrls[book.isbn]}
              alt={book.title}
              className="thumbnail-list"
              onError={(e) => (e.target.src = '/placeholder-cover.png')}
            />
            <div className="onboarding-book-info">
              <div className="onboarding-book-header">
                <h4 className="onboarding-book-title">{book.title}</h4>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => handleRemoveBook(book.isbn)}
                >
                  ✕
                </button>
              </div>
              <span className="onboarding-book-year">Year: {book.year_of_publication}</span>
              <span className="onboarding-book-author">Author: {book.author}</span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <button
          type="submit"
          className="submit-button"
          disabled={isSubmitting || books.length === 0}
        >
          {isSubmitting ? 'Saving…' : 'Get Started'}
        </button>
      </form>
    </div>
  );
}