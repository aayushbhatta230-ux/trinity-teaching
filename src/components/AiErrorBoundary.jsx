import { Component } from 'react';
import Icon from './Icon.jsx';

/**
 * Keeps an unexpected AI reply from taking the screen down: if Ask AI or the quiz fails to
 * draw, the panel shows a message with a Close button and the rest of the app keeps working.
 */
export default class AiErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('AI panel error:', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="overlay ai-overlay">
        <div className="ai-panel" role="dialog" aria-modal="true" aria-labelledby="ai-failed-title">
          <div className="overlay-head">
            <h2 id="ai-failed-title"><Icon name="sparkles" size={40} /> AI</h2>
            <button className="btn-icon" onClick={this.props.onClose} aria-label="Close"><Icon name="close" size={48} /></button>
          </div>
          <div className="ai-body">
            <div className="dialog-error ai-error" role="alert">
              <Icon name="alert" size={36} />
              <span>That answer could not be shown. Close this and ask again.</span>
              <button className="btn-secondary ai-retry" onClick={() => this.setState({ failed: false })}>Try again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
