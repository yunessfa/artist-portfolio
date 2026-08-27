import { Component, type ReactNode } from "react";
import { ErrorState } from "./Feedback";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Keeps a render error in one route from blanking the whole site. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) console.error(error);
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="خطای غیرمنتطره"
          body={this.state.error.message}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
