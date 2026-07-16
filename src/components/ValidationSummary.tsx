import { memo } from "react";
import type { ValidationResult } from "../features/validation/validate";

export const ValidationSummary = memo(function ValidationSummary({ result }: { result: ValidationResult }) {
  return (
    <div>
      <div role="status" aria-live="polite" style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span className="badge err">{result.errors.length} blocking</span>
        <span className="badge warn">{result.warnings.length} warnings</span>
        <span className="badge ok">{result.passed.length} passed</span>
      </div>

      {result.errors.length > 0 && (
        <>
          <div className="section-h" style={{ color: "var(--red)" }}>Blocking errors — must fix before export</div>
          <div className="findings">
            {result.errors.map((f) => (
              <div key={`err:${f.message}`} className="finding error"><span>⛔</span><span>{f.message}</span></div>
            ))}
          </div>
        </>
      )}

      {result.warnings.length > 0 && (
        <>
          <div className="section-h" style={{ color: "var(--amber)" }}>Dispatch warnings — review before movement</div>
          <div className="findings">
            {result.warnings.map((f) => (
              <div key={`warn:${f.message}`} className="finding warning"><span>⚠️</span><span>{f.message}</span></div>
            ))}
          </div>
        </>
      )}

      {result.passed.length > 0 && (
        <>
          <div className="section-h" style={{ color: "var(--green)" }}>Passed controls</div>
          <div className="findings">
            {result.passed.map((f) => (
              <div key={`pass:${f.message}`} className="finding pass"><span>✓</span><span>{f.message}</span></div>
            ))}
          </div>
        </>
      )}
    </div>
  );
});
