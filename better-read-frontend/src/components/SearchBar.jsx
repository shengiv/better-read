import { useState } from "react";
import SearchIcon from "@mui/icons-material/Search";
import "./SearchBar.css";

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <div className="search-input-wrapper">
        <SearchIcon className="search-icon" size={18} />
        <input
          type="text"
          value={query}
          placeholder="Search for a book or author..."
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
    </form>
  );
}
