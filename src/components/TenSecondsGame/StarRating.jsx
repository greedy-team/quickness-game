// src/components/TenSecondsGame/StarRating.jsx

export default function StarRating({ count }) {
  return (
    <div className="star-rating">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`star ${i < count ? "star-on" : "star-off"}`}>
          ★
        </span>
      ))}
    </div>
  );
}