import { Link } from "react-router-dom";

export default function BookCard({ book, viewMode }) {
  return (
    <Link to={`/book/${book.id}`} className="book-card">
      <img src="/placeholder.png" alt={book.title} />
      <div>
        <h4>{book.title}</h4>
        <p>{book.author}</p>
        <p>⭐ 4.5</p>
      </div>
    </Link>
  );
}
