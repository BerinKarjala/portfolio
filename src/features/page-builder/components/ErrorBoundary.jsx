import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    if (this.state.failed)
      return (
        <section className="pb-recovery" role="alert">
          <h2>This workspace needs to restart</h2>
          <p>
            Your saved projects have not been replaced. Download stored data
            before reloading if you need a recovery copy.
          </p>
          {this.props.recovery}
          <button type="button" onClick={this.props.onClose}>
            Return to the project page
          </button>
        </section>
      );
    return this.props.children;
  }
}
