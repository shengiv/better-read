import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Bottleneck from "bottleneck";
import ViewToggle from "../components/ViewToggle";
import "./BookList.css"


const APP_CODE = 'DEV-ChengSeong'
const API_KEY = 'Eni2DU|r#E)1x1~o5]uf}#_+@?IG(E^F'
const coversCache = {};
const titlesCache = {};
const availabilityCache = {};

const BASE_URL =
  import.meta.env.DEV
    ? 'nlb-api'
    : 'https://openweb.nlb.gov.sg/api/v2/Catalogue';

const limiter = new Bottleneck({
  minTime: 3000,
  maxConcurrent: 1,
  reservoir: 15,
  reservoirRefreshAmount: 15,
  reservoirRefreshInterval: 60 * 1000,
})

async function searchTitles(title) {
  if (titlesCache[title]) {
    return titlesCache[title];
  }
  const availability = true;
  const limit = 100;
  const url = `/${BASE_URL}/SearchTitles?Keywords=${encodeURIComponent(title)}&Availability=${encodeURIComponent(availability)}&Limit=${limit}`;
  try {
    const data = await limiter.schedule(async () => {
      const resp = await fetch(url, {
        headers: {
          'X-App-Code': APP_CODE,
          'Accept': 'application/json',
          'X-Api-Key': API_KEY
        }
      });

      if (!resp.ok) {
        console.log(`API error for Title ${title}: ${resp.status}`);
        return {};
      }

      const json = await resp.json();
      return json;
    });
    
    if (!data.titles) {
      titlesCache[title] = {};
      return {};
    }

    const filtered = data.titles.filter(item =>
      title.toLowerCase().trim().includes(item.title.toLowerCase().trim())
    );

    titlesCache[title] = filtered[0] || {};
    return filtered[0] || {};
  } catch (err) {
    console.error(`Failed to fetch Title ${title}:`, err);
    return {};
  }
}

async function getAvailabilityInfo(brn) {
  if (availabilityCache[brn]) {
    return availabilityCache[brn];
  }
  const url = `/${BASE_URL}/GetAvailabilityInfo?BRN=${encodeURIComponent(brn)}`;
  try {
    const data = await limiter.schedule(async () => {
      const resp = await fetch(url, {
        headers: {
          'X-App-Code': APP_CODE,
          'Accept': 'application/json',
          'X-Api-Key': API_KEY
        }
      });

      if (!resp.ok) {
        console.log(`API error for BRN ${brn}: ${resp.status}`);
        return {};
      }

      return resp.json();
    });
    availabilityCache[brn] = data.items;
    return data.items;
  } catch (err) {
    console.error(`Failed to fetch availability for BRN ${brn}:`, err);
    return {};
  }
}

async function fetchBookCover(isbn) {
  if (coversCache[isbn]) {
    return coversCache[isbn];
  }
  const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

  const res = await fetch(openLibraryUrl);
  if (res.ok && res.headers.get("content-type")?.startsWith("image")) {
    coversCache[isbn] = openLibraryUrl;
    return openLibraryUrl;
  }

  // fallback to Google Books
  const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  const gData = await gRes.json();
  coversCache[isbn] = gData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || null;
  return gData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || null;
}

export default function BookList({ books }) {

  const navigate = useNavigate();

  const handleBookClick = (isbn) => {
    const book = books.find(b => b.isbn == isbn);
    navigate(`/book/${isbn}`, {state: {book, coverUrl: coverUrls[book.isbn], availabilityInfo: availabilityInfo[book.isbn]}});
  }

  const [viewMode, setViewMode] = useState("list")
  const [coverUrls, setCoverUrls] = useState({}); 
  const [availability, setAvailability] = useState({});
  const [availabilityInfo, setAvailabilityInfo] = useState({});
  const [loadingState, setLoadingState] = useState(true);

  useEffect(() => {
    setLoadingState(true);
    const fetchCovers = async () => {
      const newCoverUrls = {};
      const newAvailability = {};
      const newAvailabilityInfo = {};

      for (const book of books) {
        const coverUrl = await fetchBookCover(book.isbn);
        newCoverUrls[book.isbn] = coverUrl;
        
        const titleData = await searchTitles(book.title);
        if (!titleData.title) {
          newAvailability[book.isbn] ="Not Found in NLB";
          newAvailabilityInfo[book.isbn] = {};
        } else {
          const brn = titleData.records[0].brn;
          const availabilityInfo = await getAvailabilityInfo(brn);
          newAvailabilityInfo[book.isbn] = availabilityInfo;
          if (!availabilityInfo || availabilityInfo.length === 0) {
            newAvailability[book.isbn] = "Not Found in NLB";
            continue;
          }
          newAvailability[book.isbn] = availabilityInfo.some(item => item.status.name === "On Shelf") ? "Available" : "Unavailable";
        }

  
        setAvailabilityInfo({...newAvailabilityInfo});
        setCoverUrls({...newCoverUrls});
        setAvailability({...newAvailability});
        
      }
      setCoverUrls(newCoverUrls);
      setAvailability(newAvailability);
      setLoadingState(false);
    };

    fetchCovers();
  }, [books]);

  return (
    <div>
      {/* <SearchBar /> */}
      <div className="home-header">
        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
      </div>
      {loadingState ? (
        <div className = "spinner"/>
      ): (
        <div className={`book-list ${viewMode}`} key={viewMode}>
          {books.map((book, index) => (
            <div 
              className = "book-item" 
              style={{ "--i": index }} 
              key={book.isbn} 
              onClick={() => handleBookClick(book.isbn)}
            >
              <div className="book-cover-container">
                <img
                  src={coverUrls[book.isbn]}
                  className={viewMode === "list" ? "thumbnail-list" : "thumbnail-grid"}
                />
              </div>
              {viewMode === "list" && (
                <div className="details">
                  <h4>{book.title}</h4>
                  {book.author ? (
                    <p className="author">Author: {book.author}</p>
                  ): (
                    <div/>
                  )}
                  <p 
                    className={`availability ${
                      availability[book.isbn] === "Available" ? "available" : "unavailable"
                    }`}
                  >
                    {availability[book.isbn]}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
