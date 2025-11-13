import { useLocation } from "react-router-dom";
import { useEffect, useState } from 'react';
import "./BookDetails.css"

const API_KEY = import.meta.env.API_KEY
const APP_CODE = import.meta.env.APP_CODE

const BASE_URL =
  import.meta.env.DEV
    ? '/nlb-branch-api'
    : 'https://openweb.nlb.gov.sg/api/v2/Catalogue';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchBookCover(isbn) {
    const openLibraryUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

    const res = await fetch(openLibraryUrl);
    if (res.ok && res.headers.get("content-type")?.startsWith("image")) {
      return openLibraryUrl;
  }
  const gRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  const gData = await gRes.json();
  return gData.items?.[0]?.volumeInfo?.imageLinks?.thumbnail || null;
}


async function fetchBookDescription(isbn) {
  const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;

  const response = await fetch(apiUrl);
  const data = await response.json();

  if (data.items && data.items[0] && data.items[0].volumeInfo) {
    const description = data.items[0].volumeInfo.description;
    return description || "No description available.";
  } else {
    return "No description found.";
  }
}

async function getBranches(branchCodes) {
  const url = `${BASE_URL}/GetBranches?BranchCodes=${encodeURIComponent(branchCodes.join(","))}`;
  try {
    const resp = await fetch(url, {
      headers: {
        'X-App-Code': APP_CODE,
        'Accept': 'application/json',
        'X-Api-Key': API_KEY
      }
    });
    if (!resp.ok){
      console.log(`API error for Branch Codes ${branchCodes}: ${resp.status}`);
      return {};
    }
    let data = await resp.json();
    return data.branches;
  } catch (err) {
    console.error(`Failed to fetch Branch Codes ${branchCodes}:`, err);
    return {};
  }
}

function getAvailable(availabilityInfo) {
  return availabilityInfo.filter(info => info.status.name === "On Shelf");
}

function getInTransit(availabilityInfo) {
  return availabilityInfo.filter(info => info.status.name === "In-Transit");
}

function getOnLoan(availabilityInfo) {
  return availabilityInfo.filter(info => info.status.name === "On Loan");
}

function getAvailabilityInfo(availabilityInfo) {
  if (!availabilityInfo || Object.keys(availabilityInfo).length === 0) {
    return "Not Found in NLB";
  } else if (availabilityInfo.some(info => info.status.name === "On Shelf")) {
    return "Available";
  } else if (availabilityInfo.some(info => info.status.name === "In-Transit")) {
    return "In Transit";
  } else {
    return "On Loan";
  }
}

function LibraryThumbnail({ mainImage, width = 100, height = 80 }) {
  return (
    <img
      src={mainImage}
      width={width}
      height={height}
      style={{ borderRadius: '8px', objectFit: 'contain' }}
    />
  );
}

export default function BookDetails() {
  const { state } = useLocation();
  const { book } = state || {};
  
  const [coverUrl, setCoverUrl]  = useState(state?.coverUrl || null);
  const availabilityInfo = state?.availabilityInfo || null;
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [libThumbnail, setLibThumbnail] = useState({});
  const [libThumbnailLoading, setLibThumbnailLoading] = useState({})

  useEffect(() => {
    // If coverUrl is not passed, fetch it
    if (!coverUrl && book?.isbn) {
      const getCover = async () => {
        const fetchedCoverUrl = await fetchBookCover(book.isbn);
        setCoverUrl(fetchedCoverUrl);
      };
      getCover();
    }
  }, [book, coverUrl]);

  useEffect(() => {
    if (book?.isbn) {
      setLoading(true);
      // Fetch the description if the book has an ISBN
      const getDescription = async () => {
        try {
          const fetchedDescription = await fetchBookDescription(book.isbn);
          setDescription(fetchedDescription); 
        } catch (error) {
          console.error("Error fetching description: ", error);
          setDescription("No description available.");
        } finally {
          setLoading(false);
          await sleep(300);
        }
      };

      getDescription();
    }
  }, [book]);

  useEffect(() => {
    const fetchLibThumbnailData = async() => {
      if (availabilityInfo && availabilityInfo.length > 0) {
        availabilityInfo.forEach(info => {
          setLibThumbnailLoading(prev => ({...prev, [info.location.code]: true}));
        });
        let branchCodes = getAvailable(availabilityInfo).map(info => info.location.code);
        const branches = await getBranches(branchCodes);
        if (branches.length > 0) {
          branches.forEach(branch => {
            setLibThumbnail(prev => ({...prev, [branch.branchCode]: branch.libraryImages.mainImage}));
            setLibThumbnailLoading(prev => ({...prev, [branch.branchCode]: false}));
          });
        }
        await sleep(1000);
        branchCodes = getInTransit(availabilityInfo).map(info => info.location.code);
        const inTransitBranches = await getBranches(branchCodes);
        if (inTransitBranches.length > 0) {
          inTransitBranches.forEach(branch => {
            setLibThumbnail(prev => ({...prev, [branch.branchCode]: branch.libraryImages.mainImage}));
            setLibThumbnailLoading(prev => ({...prev, [branch.branchCode]: false}));
          });
        }
        await sleep(1000);
        branchCodes = getOnLoan(availabilityInfo).map(info => info.location.code);
        const onLoanBranches = await getBranches(branchCodes); 
        if (onLoanBranches.length > 0) {
          onLoanBranches.forEach(branch => {
            setLibThumbnail(prev => ({...prev, [branch.branchCode]: branch.libraryImages.mainImage}));
            setLibThumbnailLoading(prev => ({...prev, [branch.branchCode]: false}));
          });
        }
      }
    };
    
    fetchLibThumbnailData();
  }, [availabilityInfo]);

  return (
    <div className="book-details-page">
      <h2>Book Details</h2>
      <div className="book-details">
          <div className="book-cover-container">
            <img
              src={coverUrl}
              className={"thumbnail"}
            />
          </div>
        <div className="book-info">
          <h3>{book.title}</h3>
          <p> Author: {book.author} </p>
          <p className={getAvailabilityInfo(availabilityInfo).toLowerCase().trim().replace(/\s+/g, "-")}>
            {getAvailabilityInfo(availabilityInfo)}
          </p>
        </div>
      </div>
      {loading ? (
        <div className="spinner-container">
          <div className="details-spinner" />
        </div>
      ) : getAvailabilityInfo(availabilityInfo) === "Not Found in NLB" ? (
        <p className="description-notfoundinnlb">{description}</p>
      ) : (
        <p className="description">{description}</p>
      )}
      {Object.keys(availabilityInfo).length === 0 ? null : (
        <div>
          <h3>Availability</h3>
          <div className="availability-list">
            {getAvailable(availabilityInfo).map((lib)=> (
              <div className="library-item">
                {!lib?.location?.code || libThumbnailLoading[lib.location.code] ? (
                  <div className="map-placeholder">Library Image</div>)
                : (
                  <LibraryThumbnail 
                    mainImage={libThumbnail[lib.location.code]}
                  />
                )}

                <div className="library info">
                  <h4>{lib.location.name}</h4>
                  <p className='available'>
                    Status: Available
                  </p>
                </div>
              </div>
            ))}
            {getInTransit(availabilityInfo).map((lib)=> (
              <div className="library-item">
                {!lib?.location?.code || libThumbnailLoading[lib.location.code] ? (
                  <div className="map-placeholder">Library Image</div>
                ) : (
                  <LibraryThumbnail 
                    mainImage={libThumbnail[lib.location.code]}
                  />
                )}
                <div className="library info">
                  <h4>{lib.location.name}</h4>
                  <p className='in-transit'>
                    Status: In-Transit
                  </p>
                </div>
              </div>
            ))}
            {getOnLoan(availabilityInfo).map((lib)=> (
              <div className="library-item">
                  {!lib?.location?.code || libThumbnailLoading[lib.location.code] ? (
                    <div className="map-placeholder">Library Image</div>
                  ) : (
                    <LibraryThumbnail 
                      mainImage={libThumbnail[lib.location.code]}
                    />
                  )}
                <div className="library info">
                  <h4>{lib.location.name}</h4>
                  <p className='unavailable'>
                    Status: On Loan
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
