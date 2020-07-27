import { ToyReact, Component } from "./ToyReact";

class MyComponent extends Component {
  render() {
    console.log(this.children);
    return (
      <div name="a">
        hello toy react
        <span> abcd</span>
        {this.children}
        <div>{true}</div>
      </div>
    );
  }
}

const App = (
  <MyComponent name="a">
    <div>children</div>
  </MyComponent>
);

ToyReact.render(App, document.body);
