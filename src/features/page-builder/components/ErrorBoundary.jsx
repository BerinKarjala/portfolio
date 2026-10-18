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
    if (this.state.failed && this.props.panelName)
      return (
        <section className="pb-recovery" role="alert">
          <h3>{this.props.panelName} is unavailable</h3>
          <p>
            The rest of the editor is still available. Retry this panel or
            download project JSON before restarting.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ failed: false })}
          >
            Retry {this.props.panelName.toLowerCase()}
          </button>
        </section>
      );
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
