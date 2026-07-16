import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

// Catches render errors so a failure in one panel (or a corrupt saved draft)
// shows a recoverable message instead of a blank screen. Local-only app —
// nothing is reported anywhere; the error is logged to the console.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Delivery Challan Assistant error:", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card" role="alert">
        <h2 style={{ color: "var(--red)" }}>Something went wrong</h2>
        <p className="hint">
          A part of the app hit an error. Your data stays in this browser — nothing was sent anywhere.
          Try again, or reload the page. If a saved draft is corrupt, use "Reset entire app".
        </p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--muted)", background: "var(--pale)", padding: 10, borderRadius: 6, overflowX: "auto" }}>
          {this.state.error.message}
        </pre>
        <div className="export-row">
          <button type="button" onClick={this.reset}>Try again</button>
          <button type="button" className="secondary" onClick={() => location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}
