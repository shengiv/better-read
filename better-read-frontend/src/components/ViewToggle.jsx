import AppsIcon from "@mui/icons-material/Apps";
import ListIcon from "@mui/icons-material/List";
import "./ViewToggle.css"

export default function ViewToggle({ viewMode, setViewMode }) {
  return (
    <div className="view-toggle">
      <button
        className={viewMode === "tile" ? "active" : ""}
        onClick={() => setViewMode("tile")}
        title = "Tile View"
      >
        <AppsIcon />
      </button>
      <button
        className={viewMode === "list" ? "active" : ""}
        onClick={() => setViewMode("list")}
        title = "List View"
      >
        <ListIcon />
      </button>
    </div>
  );
}
