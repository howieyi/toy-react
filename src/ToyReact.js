class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type);
  }
  setAttribute(name, value) {
    this.root.setAttribute(name, value);
  }
  appendChild(vChild) {
    vChild.mountTo(this.root);
  }
  mountTo(parent) {
    parent.appendChild(this.root);
  }
}
class TextWrapper {
  constructor(text) {
    this.root = document.createTextNode(text);
  }
  mountTo(parent) {
    parent.appendChild(this.root);
  }
}

export class Component {
  constructor() {
    this.children = [];
  }
  setAttribute(name, value) {
    this[name] = value;
  }
  mountTo(parent) {
    const vdom = this.render();
    vdom.mountTo(parent);
  }
  appendChild(vChild) {
    this.children.push(vChild);
  }
}

export const ToyReact = {
  createElement(type, attributes, ...children) {
    let element;
    if (typeof type === "string") {
      element = new ElementWrapper(type, attributes);
    } else {
      element = new type();
    }

    for (let name in attributes) {
      element.setAttribute(name, attributes);
    }

    const insertChildren = (children) => {
      for (let child of children) {
        if (typeof child === "object" && child instanceof Array) {
          insertChildren(child);
        } else {
          if (
            !(child instanceof Component) &&
            !(child instanceof ElementWrapper) &&
            !(child instanceof TextWrapper)
          )
            child = String(child);

          if (typeof child === "string") child = new TextWrapper(child);

          element.appendChild(child);
        }
      }
    };

    insertChildren(children);

    return element;
  },
  render(vdom, element) {
    vdom.mountTo(element);
  },
};
