import type { ValidationResult } from "../features/validation/validate";

export function ValidationSummary({ result }: { result: ValidationResult }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span className="badge err">{result.errors.length} blocking</span>
        <span className="badge warn">{result.warnings.length} warnings</span>
        <span className="badge ok">{result.passed.length} passed</span>
      </div>

      {result.errors.length > 0 && (
        <>
          <div className="section-h" style={{ color: "var(--red)" }}>Blocking errors — must fix before export</div>
          <div className="findings">
            {result.errors.map((f, i) => (
              <div key={i} className="finding error"><span>⛔</span><span>{f.message}</span></div>
            ))}
          </div>
        </>
      )}

      {result.warnings.length > 0 && (
        <>
          <div className="section-h" style={{ color: "var(--amber)" }}>Dispatch warnings — review before movement</div>
          <div className="findings">
            {result.warnings.map((f, i) => (
              <div key={i} className="finding warning"><span>⚠️</span><span>{f.message}</span></div>
            ))}
          </div>
        </>
      )}

      {result.passed.length > 0 && (
        <>
          <div className="section-h" style={{ color: "var(--green)" }}>Passed controls</div>
          <div className="findings">
            {result.passed.map((f, i) => (
              <div key={i} className="finding pass"><span>✓</span><span>{f.message}</span></div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
