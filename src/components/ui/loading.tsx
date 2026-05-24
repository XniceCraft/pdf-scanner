export function Loading() {
  return (
    <div className="dots">
      {["#7F77DD", "#1D9E75", "#D85A30", "#D4537E"].map((c, i) => (
        <div
          key={i}
          className="dot"
          style={{ animationDelay: `${i * 0.18}s`, background: c }}
        />
      ))}
    </div>
  );
}
