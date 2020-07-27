import { ToyReact, Component } from "./ToyReact";

class MyComponent extends Component {
  render() {
    console.log(this.children);
    return (
      <div name="a">
        hello toy react
        <span> abcd</span>
        {this.children}
      </div>
    );
  }
}

let A = (
  <MyComponent name="a">
    <div>children</div>
  </MyComponent>
);

ToyReact.render(A, document.body);
